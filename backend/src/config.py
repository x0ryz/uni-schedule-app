import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    token: str = os.getenv("TOKEN")
    database_url: str = os.getenv("DATABASE_URL")

settings = Settings()