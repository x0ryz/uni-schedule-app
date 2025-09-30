import httpx, json
from datetime import date, timedelta
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.middleware.cors import CORSMiddleware
from telegram_webapp_auth.auth import WebAppUser

from src.auth import get_current_user
from src.database import get_session
from src.models import User

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
    aVuzID: int = 11613,
    aStudyGroupID: str = "3POJ9CKXSCAW",
    aStartDate: str = today.strftime("%d.%m.%Y"),
    aEndDate: str = end_week.strftime("%d.%m.%Y"),
    aStudyTypeID: str | None = None,
):
    params = {
        "aVuzID": aVuzID,
        "aStudyGroupID": f'"{aStudyGroupID}"',
        "aStartDate": f'"{aStartDate}"',
        "aEndDate": f'"{aEndDate}"',
        "aStudyTypeID": aStudyTypeID
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