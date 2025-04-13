import React, { useState, useRef, useEffect } from "react";
import WeatherProbabilityChart from "./components/prediction/WeatherProbabilityChart";
import WeatherVisualizations from "./components/prediction/WeatherVisualizations";
import { Toaster, toast } from "sonner";
import api from './api/axiosConfig';

const PredictionMain = () => {
  const [data, setData] = useState({
    "message": "Predictions for 3th Day fetched",
    "data": {
      "states": [
        "drizzle",
        "rain",
        "sun",
        "snow",
        "fog"
      ],
      "probabilities": [
        0.03410886702735334,
        0.39484246640231196,
        0.48779817499960887,
        0.014907334871374706,
        0.06834315669935112
      ],
      "most_likely_state": "sun",
      "data_source": "user_uploaded"
    }
  });
  const [currentState, setCurrentState] = useState("sun");
  const [nDays, setNDays] = useState(3);
  const [file, setFile] = useState(null);
  const [usingDefaultCSV, setUsingDefaultCSV] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef();

  // Function to handle file upload
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    setUsingDefaultCSV(false);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(response.data.message, { id: "upload-file" });
      console.log(response.data.message);
      setRefreshKey(prev => prev + 1); // Trigger refresh
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error uploading file. Please try again.");
    }
  };

  // Function to clear the uploaded file
  const clearFile = async () => {
    try {
      const response = await api.post("/clear");
      console.log(response.data.message);
      toast.info(response.data.message, { id: "clear-file" });
      setFile(null);
      setUsingDefaultCSV(true);
      setRefreshKey(prev => prev + 1); // Trigger refresh
      if (fileInputRef?.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error clearing file:", error);
      toast.error("Error clearing file. Please try again.");
    }
  };

  // Function to fetch predictions
  const fetchPredictions = async () => {
    try {
      const response = await api.get(
        `/predict?current_state=${currentState}&n_days=${nDays}`
      );
      toast.info(response.data.message);
      console.log(response.data);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching predictions. Please try again.");
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
          marginBottom: "30px"
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
        <button
          onClick={fetchPredictions}
          style={{ padding: "5px", cursor: "pointer" }}
        >
          Predict
        </button>
      </div>

      <WeatherVisualizations refreshKey={refreshKey} />

      <Toaster position={"top-right"} />
    </div>
  );
};

export default PredictionMain;
