from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    # MongoDB settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "weather_db"
    MONGODB_USERNAME: Optional[str] = None
    MONGODB_PASSWORD: Optional[str] = None
    
    # JWT settings for authentication
    JWT_SECRET_KEY: str = "your-secret-key-here"  # Change this in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings() 