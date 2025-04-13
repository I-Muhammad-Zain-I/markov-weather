from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException
from typing import Optional
from .config import get_settings

settings = get_settings()

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None

    @classmethod
    async def connect_to_mongo(cls):
        try:
            # Create connection URL with authentication if credentials are provided
            connection_url = settings.MONGODB_URL
            if settings.MONGODB_USERNAME and settings.MONGODB_PASSWORD:
                connection_url = f"mongodb://{settings.MONGODB_USERNAME}:{settings.MONGODB_PASSWORD}@{settings.MONGODB_URL.split('://')[1]}"
            
            cls.client = AsyncIOMotorClient(connection_url)
            cls.db = cls.client[settings.MONGODB_DB_NAME]
            # Test the connection
            await cls.client.admin.command('ping')
            print("Successfully connected to MongoDB!")
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Could not connect to MongoDB: {str(e)}"
            )

    @classmethod
    async def close_mongo_connection(cls):
        if cls.client:
            cls.client.close()
            print("MongoDB connection closed.")

    @classmethod
    async def get_database(cls):
        if cls.db is None:
            await cls.connect_to_mongo()
        return cls.db

    @classmethod
    async def get_collection(cls, collection_name: str):
        db = await cls.get_database()
        return db[collection_name] 