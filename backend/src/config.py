import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    api_url: str = "https://vnz.osvita.net/WidgetSchedule.asmx/GetScheduleDataX"
    token: str = os.getenv("TOKEN")
    database_url: str = os.getenv("DATABASE_URL")

settings = Settings()