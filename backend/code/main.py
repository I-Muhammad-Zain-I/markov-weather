from fastapi import FastAPI, File, UploadFile, Query
from pydantic import BaseModel
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global variables to store the transition matrix and states
transition_matrix = None
states = None

# Path to the default CSV file
DEFAULT_CSV_PATH = "seattle-weather.csv"





# Function to compute the transition matrix from a CSV file
def compute_transition_matrix(file_path):
    global transition_matrix, states

    # Load the CSV file
    data = pd.read_csv(file_path)
    weather_states = data['weather']

    # Get the list of unique states
    states = weather_states.unique()
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
    transition_matrix = transition_counts / transition_counts.sum(axis=1, keepdims=True)

# Load the default CSV file on startup
if os.path.exists(DEFAULT_CSV_PATH):
    compute_transition_matrix(DEFAULT_CSV_PATH)

# API endpoint to upload CSV file
@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    try:
        # Save the uploaded file temporarily
        file_path = f"temp_{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Compute the transition matrix from the uploaded file
        compute_transition_matrix(file_path)

        # Delete the temporary file
        os.remove(file_path)

        return {"message": "CSV file uploaded successfully"}
    except Exception as e:
        return {"error": f"Error processing CSV file: {str(e)}"}



@app.post("/clear")
def clear_uploaded_file():
    global transition_matrix, states

    # Reset to the default CSV file
    if os.path.exists(DEFAULT_CSV_PATH):
        compute_transition_matrix(DEFAULT_CSV_PATH)
        return {"message": "Uploaded file cleared. Using default CSV file."}
    else:
        return {"error": "Default CSV file not found."}

# API endpoint to get predictions
@app.get("/predict")
def predict(
    current_state: str = Query(..., description="Current weather state"),
    n_days: int = Query(..., description="Number of days to predict")
):
    if transition_matrix is None or states is None:
        return {"error": "No CSV file available. Please upload a CSV file or ensure the default CSV file exists."}

    # Validate current_state
    if current_state not in states:
        return {"error": f"Invalid current_state. Must be one of: {', '.join(states)}"}

    # Compute probabilities
    current_index = list(states).index(current_state)
    Pn = np.linalg.matrix_power(transition_matrix, n_days)
    probabilities = Pn[current_index].tolist()

    return {
        "message": f"Predictions for {n_days}th Day fetched",
        "data": {
        "states": states.tolist(),
        "probabilities": probabilities,
        "most_likely_state": states[np.argmax(probabilities)]
            
        }
    }

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)