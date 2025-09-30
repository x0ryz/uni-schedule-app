import httpx, json
from datetime import date, timedelta
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from telegram_webapp_auth.auth import WebAppUser

from pydantic import BaseModel

from src.auth import get_current_user
from src.database import get_session
from src.models import User, Subject, UserHiddenSubject

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://vnz.osvita.net/WidgetSchedule.asmx/GetScheduleDataX"

today = date.today()
days_until_saturday = (5 - today.weekday()) % 7
if days_until_saturday == 0:
    days_until_saturday = 7  

end_week = today + timedelta(days=days_until_saturday)

@app.get("/schedule")
async def get_schedule(
    aStartDate: str = today.strftime("%d.%m.%Y"),
    aEndDate: str = end_week.strftime("%d.%m.%Y"),
    user: WebAppUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(User).where(User.telegram_id == user.id).options(selectinload(User.group)))
    user_in_db = result.scalar_one_or_none()

    if not user_in_db:
        raise HTTPException(status_code=404, detail="User not found in DB")

    if not user_in_db.group_id:
        raise HTTPException(status_code=400, detail="User has no group assigned")
    
    group = user_in_db.group

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

    async with httpx.AsyncClient() as client:
        resp = await client.get(BASE_URL, params=params, headers=headers)
        text = resp.text

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Cannot parse JSON from API", "raw": text}

    exclude = {"__type", "employee"}
    filtered = [
        {k: v for k, v in item.items() if k not in exclude}
        for item in data["d"]
    ]

    return filtered

@app.post("/auth")
async def send_message(user: WebAppUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.username == user.username))
    user_in_db = result.scalar_one_or_none()

    if not user_in_db:
        session.add(User(telegram_id=user.id, username=user.username))

    await session.commit()
    return {"ok": True, "username": user}

class HideSubjectRequest(BaseModel):
    name: str
    teacher: str
    study_type: str
    subgroup: str | None = None

@app.post("/hide_subject")
async def hide_subject(
    request: HideSubjectRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    name = request.name
    teacher = request.teacher
    study_type = request.study_type
    subgroup = request.subgroup

    result = await session.execute(select(User).where(User.telegram_id == user.id).options(selectinload(User.group)))
    user_in_db: User | None = result.scalar_one_or_none()
    if not user_in_db:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(Subject)
        .where(Subject.name == name)
        .where(Subject.teacher == teacher)
        .where(Subject.study_type == study_type)
        .where(Subject.subgroup == subgroup)
        .where(Subject.group_id == user_in_db.group.id)
    )
    subject_in_db: Subject | None = result.scalar_one_or_none()

    if not subject_in_db:
        subject_in_db = Subject(name=name, teacher=teacher, study_type=study_type, subgroup=subgroup, group_id=user_in_db.group.id)
        session.add(subject_in_db)
        await session.commit()
        await session.refresh(subject_in_db)

    hidden = UserHiddenSubject(user_id=user_in_db.id, subject_id=subject_in_db.id)
    session.add(hidden)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Subject already hidden")

    return {"message": f"Subject '{name}' hidden for user {user_in_db.username}"}

@app.get('/get_hidden_subjects')
async def get_hidden_subjects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(User).where(User.telegram_id == user.id).options(selectinload(User.group))
    )
    user_in_db: User | None = result.scalar_one_or_none()
    if not user_in_db:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(UserHiddenSubject)
        .where(UserHiddenSubject.user_id == user_in_db.id)
        .options(selectinload(UserHiddenSubject.subject))
    )
    hidden_subjects: list[UserHiddenSubject] = result.scalars().all()

    response = [
        {
            "id": hs.subject.id,
            "discipline": hs.subject.name,
            "employee_short": hs.subject.teacher,
            "study_type": hs.subject.study_type,
            "subgroup": hs.subject.subgroup,
        }
        for hs in hidden_subjects
    ]

    return {"hidden_subjects": response}
