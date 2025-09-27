import httpx, json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://vnz.osvita.net/WidgetSchedule.asmx/GetScheduleDataX"

@app.get("/schedule")
async def get_schedule(
    aVuzID: int = 11613,
    aStudyGroupID: str = "3POJ9CKXSCAW",
    aStartDate: str = "29.09.2025",
    aEndDate: str = "06.10.2025",
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

