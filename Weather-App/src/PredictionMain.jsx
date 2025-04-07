import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import WeatherProbabilityChart from "./components/prediction/WeatherProbabilityChart";
import { Toaster, toast } from "sonner";

const PredictionMain = () => {
  const [data, setData] = useState({
    states: [],
    probabilities: [],
    most_likely_state: "",
  });
  const [currentState, setCurrentState] = useState("sun");
  const [nDays, setNDays] = useState(3);

  const [file, setFile] = useState(null);
  const [usingDefaultCSV, setUsingDefaultCSV] = useState(true);

  const fileInputRef = useRef();

  // Function to handle file upload
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    setUsingDefaultCSV(false);

    // Send the file to the backend
    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.info(response.data.message, { id: "upload-file" });
      console.log(response.data.message);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  // Function to clear the uploaded file
  const clearFile = async () => {
    try {
      const response = await axios.post("http://localhost:8000/clear");
      console.log(response.data.message);
      toast.info(response.data.message, { id: "clear-file" });
      setFile(null);
      setUsingDefaultCSV(true);
      if (fileInputRef?.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error clearing file:", error);
    }
  };

  // Function to fetch predictions
  const fetchPredictions = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/predict?current_state=${currentState}&n_days=${nDays}`
      );
      toast.info(response.data.message);
      console.log(response.data);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  return (
    <div style={{ color: "white", fontFamily: "Noto Sans" }}>
      <h3>Weather Probabilities After {nDays} Days</h3>
      <div style={{ marginBottom: "20px" }}>
        <label>
          Upload CSV File:
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ marginLeft: "10px" }}
            ref={fileInputRef}
          />
        </label>
        {usingDefaultCSV && <p>Using default CSV file.</p>}
      </div>
      {!usingDefaultCSV && (
        <div style={{ marginBottom: "20px" }}>
          <button onClick={clearFile} style={{ padding: "5px" }}>
            Clear Uploaded File
          </button>
        </div>
      )}

      <div>
        <h2>
          Most Likely State:{" "}
          <span
            style={{
              padding: "4px 12px 4px 12px",
              backgroundColor: "var(--accentBlue-1)",
              borderRadius: "12px",
            }}
          >
            {data.data.most_likely_state}
          </span>
        </h2>
      </div>

      {data && <WeatherProbabilityChart data={data.data} nDays={nDays} />}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          columnGap: "16px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid gray",
            width: "fit-content",
            padding: "0 8px 0 8px",
            borderRadius: "12px",
          }}
        >
          <label>
            Current State &nbsp;
            <select
              value={currentState}
              onChange={(e) => setCurrentState(e.target.value)}
            >
              <option value="fog">Fog</option>
              <option value="rain">Rain</option>
              <option value="drizzle">Drizzle</option>
              <option value="sun">Sun</option>
              <option value="snow">Snow</option>
            </select>
          </label>
        </div>
        <div
          style={{
            border: "1px solid gray",
            width: "fit-content",
            padding: "8px",
            borderRadius: "12px",
          }}
        >
          <label>
            Number of Days &nbsp;
            <input
              type="number"
              value={nDays}
              onChange={(e) => setNDays(parseInt(e.target.value))}
              min="1"
            />
          </label>
        </div>
        {/* Predict button */}

        <button
          onClick={fetchPredictions}
          style={{ padding: "5px", cursor: "pointer" }}
        >
          Predict
        </button>
      </div>

      <Toaster position={"top-right"} />
    </div>
  );
};

export default PredictionMain;
