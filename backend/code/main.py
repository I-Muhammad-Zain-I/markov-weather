from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime, timedelta
from .database import Database
from .config import get_settings
from .models import UserCreate, UserResponse
from .auth import create_user, authenticate_user, get_user_by_id
from jose import JWTError, jwt
from typing import Optional, Dict
import json

settings = get_settings()
app = FastAPI()

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dictionary to store user-specific transition matrices and states
user_data: Dict[str, dict] = {}

# Path to the default CSV file
DEFAULT_CSV_PATH = "seattle-weather.csv"

# Default data (loaded once at startup)
default_data = None

# Token related functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

# Authentication endpoints
@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    return await create_user(user)

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def load_default_data():
    global default_data
    try:
        if os.path.exists(DEFAULT_CSV_PATH):
            transition_matrix, states = compute_transition_matrix(DEFAULT_CSV_PATH)
            default_data = {
                "transition_matrix": transition_matrix,
                "states": states,
                "filename": "default"
            }
            print("Default data loaded successfully")
        else:
            print(f"Warning: Default CSV file not found at {DEFAULT_CSV_PATH}")
    except Exception as e:
        print(f"Error loading default data: {str(e)}")

@app.on_event("startup")
async def startup_db_client():
    await Database.connect_to_mongo()
    await load_default_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    await Database.close_mongo_connection()

# Function to compute the transition matrix from a CSV file
def compute_transition_matrix(file_path: str) -> tuple:
    # Load the CSV file
    data = pd.read_csv(file_path)
    
    # Clean the weather states by stripping whitespace and converting to lowercase
    weather_states = data['weather'].str.strip().str.lower()
    
    # Get the list of unique states and sort them for consistency
    states = sorted(weather_states.unique())
    
    # Validate states
    expected_states = {"drizzle", "rain", "sun", "snow", "fog"}
    invalid_states = set(states) - expected_states
    if invalid_states:
        raise ValueError(f"Invalid weather states found: {invalid_states}. Expected states are: {expected_states}")
    
    n_states = len(states)

    # Create a mapping from state to index
    state_to_index = {state: i for i, state in enumerate(states)}

    # Initialize the transition count matrix
    transition_counts = np.zeros((n_states, n_states))

    # Count transitions
    for i in range(len(weather_states) - 1):
        current_state = state_to_index[weather_states[i]]
        next_state = state_to_index[weather_states[i + 1]]
        transition_counts[current_state, next_state] += 1

    # Normalize the transition counts to get probabilities
    row_sums = transition_counts.sum(axis=1, keepdims=True)
    
    # Handle states with no transitions (row sum = 0)
    zero_rows = (row_sums == 0).flatten()
    if np.any(zero_rows):
        transition_counts[zero_rows] = 1
        row_sums[zero_rows] = n_states
    
    # Compute probabilities
    transition_matrix = transition_counts / row_sums
    
    # Ensure all probabilities are valid numbers
    transition_matrix = np.nan_to_num(transition_matrix, nan=1.0/n_states, posinf=1.0/n_states, neginf=1.0/n_states)
    
    # Verify probabilities sum to 1 for each row
    row_sums = transition_matrix.sum(axis=1)
    if not np.allclose(row_sums, 1.0):
        transition_matrix = transition_matrix / row_sums[:, np.newaxis]
    
    return transition_matrix, states

async def load_user_data(user_id: str) -> None:
    try:
        collection = await Database.get_collection("weather_data")
        data = await collection.find_one({"user_id": user_id})
        
        if data:
            user_data[user_id] = {
                "transition_matrix": np.array(data["transition_matrix"]),
                "states": np.array(data["states"]),
                "filename": data.get("filename", "default")
            }
            print(f"Loaded data for user {user_id}")
        elif os.path.exists(DEFAULT_CSV_PATH):
            # Load default data for new users
            transition_matrix, states = compute_transition_matrix(DEFAULT_CSV_PATH)
            user_data[user_id] = {
                "transition_matrix": transition_matrix,
                "states": states,
                "filename": "default"
            }
            # Store in MongoDB
            await collection.insert_one({
                "user_id": user_id,
                "transition_matrix": transition_matrix.tolist(),
                "states": states.tolist(),
                "filename": "default"
            })
            print(f"Loaded default data for user {user_id}")
    except Exception as e:
        print(f"Error loading data for user {user_id}: {str(e)}")

@app.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        print(f"Received file upload request from user {current_user.id}")
        print(f"File details: {file.filename}, {file.content_type}")
        
        # Save the uploaded file temporarily
        file_path = f"temp_{file.filename}"
        print(f"Saving file to: {file_path}")
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            print(f"File size: {len(content)} bytes")
            buffer.write(content)

        # Compute the transition matrix from the uploaded file
        print("Computing transition matrix...")
        transition_matrix, states = compute_transition_matrix(file_path)
        print(f"Computed transition matrix with states: {states}")

        # Store in user_data
        user_data[current_user.id] = {
            "transition_matrix": transition_matrix,
            "states": states,
            "filename": file.filename
        }
        print(f"Stored data in memory for user {current_user.id}")

        # Store in MongoDB
        print("Storing data in MongoDB...")
        collection = await Database.get_collection("weather_data")
        
        # Convert to list format for MongoDB storage
        mongo_data = {
            "user_id": current_user.id,
            "transition_matrix": transition_matrix.tolist() if hasattr(transition_matrix, 'tolist') else transition_matrix,
            "states": states.tolist() if hasattr(states, 'tolist') else states,
            "filename": file.filename
        }
        
        await collection.update_one(
            {"user_id": current_user.id},
            {"$set": mongo_data},
            upsert=True
        )
        print("Data stored in MongoDB successfully")

        # Delete the temporary file
        print("Cleaning up temporary file...")
        os.remove(file_path)
        print("Temporary file removed")

        return {"message": "CSV file uploaded and processed successfully"}
    except ValueError as ve:
        print(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV file format: {str(ve)}"
        )
    except Exception as e:
        print(f"Error processing CSV file: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing CSV file: {str(e)}"
        )

@app.post("/clear")
async def clear_uploaded_file(current_user: UserResponse = Depends(get_current_user)):
    try:
        # Remove user's data from MongoDB
        collection = await Database.get_collection("weather_data")
        await collection.delete_one({"user_id": current_user.id})
        
        # Remove from in-memory cache
        if current_user.id in user_data:
            del user_data[current_user.id]
        
        return {"message": "User data cleared successfully. Using default data for predictions."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing data: {str(e)}"
        )

@app.get("/predict")
async def predict(
    current_state: str = Query(..., description="Current weather state"),
    n_days: int = Query(..., description="Number of days to predict"),
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        # Get user's data or use default
        user_weather_data = user_data.get(current_user.id)
        if not user_weather_data:
            if not default_data:
                raise HTTPException(
                    status_code=500,
                    detail="No weather data available. Please contact administrator."
                )
            user_weather_data = default_data

        transition_matrix = user_weather_data["transition_matrix"]
        states = user_weather_data["states"]

        # Convert states to list if it's a numpy array
        if hasattr(states, 'tolist'):
            states = states.tolist()
        else:
            states = list(states)

        # Validate current_state
        if current_state not in states:
            available_states = ", ".join(states)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid current_state: '{current_state}'. Must be one of: {available_states}"
            )

        # Compute probabilities
        current_index = states.index(current_state)
        Pn = np.linalg.matrix_power(transition_matrix, n_days)
        probabilities = Pn[current_index]

        # Convert probabilities to list if it's a numpy array
        if hasattr(probabilities, 'tolist'):
            probabilities = probabilities.tolist()
        else:
            probabilities = list(probabilities)

        return {
            "message": f"Predictions for {n_days}th Day fetched",
            "data": {
                "states": states,
                "probabilities": probabilities,
                "most_likely_state": states[np.argmax(probabilities)],
                "data_source": "default" if user_weather_data is default_data else "user_uploaded"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error making prediction: {str(e)}"
        )

@app.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """
    Logout endpoint. Since we're using JWT tokens which are stateless,
    this endpoint mainly serves as a way for clients to clear their token.
    The actual token invalidation must be handled client-side.
    """
    return {
        "message": "Successfully logged out",
        "detail": "Please clear your token on the client side"
    }

@app.get("/weather-data")
async def get_weather_data(current_user: UserResponse = Depends(get_current_user)):
    try:
        # Get user's data or use default
        user_weather_data = user_data.get(current_user.id)
        if not user_weather_data:
            if not default_data:
                raise HTTPException(
                    status_code=500,
                    detail="No weather data available. Please contact administrator."
                )
            user_weather_data = default_data

        # Get the data from MongoDB instead of reading the file again
        collection = await Database.get_collection("weather_data")
        mongo_data = await collection.find_one({"user_id": current_user.id})
        
        if not mongo_data:
            # If no data in MongoDB, use default data
            mongo_data = await collection.find_one({"user_id": "default"})
            if not mongo_data:
                raise HTTPException(
                    status_code=500,
                    detail="No weather data available. Please contact administrator."
                )

        # Calculate state counts from the transition matrix
        states = mongo_data["states"]
        transition_matrix = np.array(mongo_data["transition_matrix"])
        
        # Calculate state counts (sum of each column in transition matrix)
        state_counts = {state: int(np.sum(transition_matrix[:, i]) * 100) for i, state in enumerate(states)}
        
        # Calculate monthly distribution (using default data for now)
        monthly_counts = {}
        for month in range(1, 13):
            monthly_counts[month] = {state: 0 for state in states}
            # Add some sample data for visualization
            for state in states:
                monthly_counts[month][state] = int(np.random.randint(0, 100))
        
        # Calculate transitions from the transition matrix
        transitions = {}
        for i, from_state in enumerate(states):
            transitions[from_state] = {}
            for j, to_state in enumerate(states):
                transitions[from_state][to_state] = int(transition_matrix[i, j] * 100)
        
        return {
            "states": states,
            "state_counts": state_counts,
            "monthly_counts": monthly_counts,
            "transitions": transitions,
            "data_source": "default" if user_weather_data is default_data else "user_uploaded"
        }
    except Exception as e:
        print(f"Error getting weather data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting weather data: {str(e)}"
        )

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)