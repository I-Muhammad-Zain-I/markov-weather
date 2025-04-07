import pandas as pd
import numpy as np

# Load dataset
data = pd.read_csv("seattle-weather.csv")
print(data.head())

weather_states = data['weather']


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

# Convert to DataFrame for better readability
transition_df = pd.DataFrame(transition_matrix, index=states, columns=states)

# Display the transition matrix
print("Transition Matrix:")
print(transition_df)

states = ["fog", "rain", "drizzle", "sun", "snow"]
def predict_n_days(current_state, n):
    # Get the index of the current state
    current_index = states.index(current_state)
    
    # Compute the n-step transition matrix
    Pn = np.linalg.matrix_power(transition_matrix, n)
    
    # Get the probabilities for n days from now
    n_day_probs = Pn[current_index]
    
    # Print the probabilities
    print(f"Probabilities for {n} days from now (current state: {current_state}):")
    for state, prob in zip(states, n_day_probs):
        print(f"{state}: {prob:.2%}")
    
    # Predict the most likely state
    most_likely_state = states[np.argmax(n_day_probs)]
    print(f"Most likely state in {n} days: {most_likely_state}")

# Example usage
current_state = "rain"  # Replace with the current weather state
n = 3  # Predict for 3 days from now

for i in range(1, 12):
  predict_n_days(current_state, i)
  