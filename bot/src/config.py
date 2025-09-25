import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    token: str = os.getenv("TOKEN")

settings = Settings()