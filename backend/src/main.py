import json
from datetime import date, timedelta
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from telegram_webapp_auth.auth import WebAppUser

from src.dependencies import get_or_create_user
from src.database import get_session
from src.models import Subject, User, UserHiddenSubject

from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
    )
    
    yield
    
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


today = date.today()
days_until_saturday = (5 - today.weekday()) % 7
if days_until_saturday == 0:
    days_until_saturday = 7  

end_week = today + timedelta(days=days_until_saturday)


def format_subject_response(subject: Subject) -> dict:
    """Format subject for API response"""
    return {
        "id": subject.id,
        "discipline": subject.name,
        "employee_short": subject.teacher,
        "study_type": subject.study_type,
        "subgroup": subject.subgroup,
    }


@app.get("/schedule")
async def get_schedule(
    request: Request,
    aStartDate: str = today.strftime("%d.%m.%Y"),
    aEndDate: str = end_week.strftime("%d.%m.%Y"),
    user: WebAppUser = Depends(get_or_create_user),
    session: AsyncSession = Depends(get_session)
):

    if not user.group_id:
        raise HTTPException(status_code=400, detail="User has no group assigned")
    
    group = user.group
    
    hidden_subjects_set = {
        (hs.subject.name, hs.subject.teacher, hs.subject.study_type, hs.subject.subgroup)
        for hs in user.hidden_subjects
    }

    params = {
        "aVuzID": 11613,
        "aStudyGroupID": f'"{group.site_id}"',
        "aStartDate": f'"{aStartDate}"',
        "aEndDate": f'"{aEndDate}"',
        "aStudyTypeID": None
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "DNT": "1",
        "Sec-GPC": "1",
        "Upgrade-Insecure-Requests": "1",
    }

    resp = await request.app.state.http_client.get(settings.api_url, params=params, headers=headers)
    text = resp.text

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Cannot parse JSON from API", "raw": text}

    exclude = {"__type", "employee"}
    filtered = []
    
    for item in data["d"]:
        discipline = item.get("discipline", "")
        employee_short = item.get("employee_short", "")
        study_type = item.get("study_type", "")
        subgroup = item.get("subgroup")
        
        if (discipline, employee_short, study_type, subgroup) not in hidden_subjects_set:
            filtered_item = {k: v for k, v in item.items() if k not in exclude}
            filtered.append(filtered_item)

    return filtered


class SubjectRequest(BaseModel):
    name: str
    teacher: str
    study_type: str
    subgroup: str | None = None
    

@app.post("/hide_subject")
async def hide_subject(
    request: SubjectRequest,
    user: User = Depends(get_or_create_user),
    session: AsyncSession = Depends(get_session),
):
    exists = any(
        hs.subject.name == request.name
        and hs.subject.teacher == request.teacher
        and hs.subject.study_type == request.study_type
        and hs.subject.subgroup == request.subgroup
        for hs in user.hidden_subjects
    )
    if exists:
        raise HTTPException(status_code=400, detail="Subject already hidden")

    result = await session.execute(
        select(Subject).where(
            Subject.name == request.name,
            Subject.teacher == request.teacher,
            Subject.study_type == request.study_type,
            Subject.subgroup == request.subgroup,
            Subject.group_id == user.group.id
        )
    )
    subject = result.scalar_one_or_none()

    if not subject:
        subject = Subject(
            name=request.name,
            teacher=request.teacher,
            study_type=request.study_type,
            subgroup=request.subgroup,
            group_id=user.group.id
        )
        session.add(subject)
        await session.commit()
        await session.refresh(subject)

    hidden = UserHiddenSubject(user_id=user.id, subject_id=subject.id)
    session.add(hidden)
    await session.commit()
    await session.refresh(hidden)

    return {"message": f"Subject '{request.name}' hidden for user {user.username}"}


@app.get("/get_hidden_subjects")
async def get_hidden_subjects(user: User = Depends(get_or_create_user)):
    return [format_subject_response(hs.subject) for hs in user.hidden_subjects]

@app.post("/unhide_subject")
async def unhide_subject(
    request: SubjectRequest,
    user: User = Depends(get_or_create_user),
    session: AsyncSession = Depends(get_session),
):
    hidden_subject = next(
        (
            hs for hs in user.hidden_subjects
            if hs.subject.name == request.name
            and hs.subject.teacher == request.teacher
            and hs.subject.study_type == request.study_type
            and hs.subject.subgroup == request.subgroup
        ),
        None
    )

    if not hidden_subject:
        raise HTTPException(status_code=400, detail="Subject is not hidden")

    await session.delete(hidden_subject)
    await session.commit()

    return {"message": f"Subject '{request.name}' restored for user {user.username}"}
