from pathlib import Path
from typing import ClassVar
from pydantic_settings import BaseSettings

BASE_DIR: Path = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # DB
    DB_URL: str

    # Secret keys
    JWT_SECRET_KEY: str
    USER_MANAGER_SECRET_KEY: str

    # Security
    AUTH_SECRET_KEY: str
    AUTH_ALGORITHM: str = "HS256"
    AUTH_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    AUTH_REFRESH_TOKEN_EXPIRE_MINUTES: int = 60

    # App const
    MAX_ATTACHMENT_SIZE: ClassVar[int] = 5242880  # 5 MB
    UPLOAD_ROOT: Path = BASE_DIR / "uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
