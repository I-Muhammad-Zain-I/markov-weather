from datetime import datetime
from typing import Optional
from .models import UserCreate, UserInDB, UserResponse, get_password_hash, verify_password
from .database import Database
from fastapi import HTTPException
from bson import ObjectId

async def create_user(user: UserCreate) -> UserResponse:
    # Check if user with email already exists
    collection = await Database.get_collection("users")
    existing_user = await collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user document
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()

    # Insert user into database
    result = await collection.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)

    return UserResponse(**user_dict)

async def get_user_by_email(email: str) -> Optional[UserInDB]:
    collection = await Database.get_collection("users")
    user = await collection.find_one({"email": email})
    if user:
        user["id"] = str(user["_id"])
        return UserInDB(**user)
    return None

async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    collection = await Database.get_collection("users")
    try:
        user = await collection.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
            return UserInDB(**user)
    except:
        return None
    return None

async def update_user(user_id: str, update_data: dict) -> Optional[UserResponse]:
    collection = await Database.get_collection("users")
    update_data["updated_at"] = datetime.utcnow()
    
    try:
        result = await collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        if result.modified_count:
            updated_user = await get_user_by_id(user_id)
            return UserResponse(**updated_user.model_dump())
    except:
        return None
    return None

async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user 