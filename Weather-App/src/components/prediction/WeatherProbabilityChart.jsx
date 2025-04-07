import React, { useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WeatherProbabilityChart = ({ data, nDays }) => {
  console.log({ data, nDays });
  ChartJS.defaults.font.family = "Outfit";
  ChartJS.defaults.color = "#ffffff";

  // State to manage the selected chart type
  const [chartType, setChartType] = useState("bar");

  // Reference to the chart for gradient setup
  const chartRef = useRef();

  // Function to create gradient fill for the area chart
  const setGradient = (chart) => {
    const {
      ctx,
      chartArea: { top, bottom },
    } = chart;
    const gradientSegment = ctx.createLinearGradient(0, top, 0, bottom);
    gradientSegment.addColorStop(0, "rgba(75, 192, 192, 0.6)"); // Start color
    gradientSegment.addColorStop(1, "rgba(75, 192, 192, 0.1)"); // End color
    return gradientSegment;
  };

  // Prepare chart data
  const chartData = {
    labels: data?.states,
    datasets: [
      {
        label: "Probability (%)",
        data: data?.probabilities?.map((prob) => (prob * 100).toFixed(2)),
        backgroundColor:
          chartType === "area"
            ? (context) => {
                const chart = context.chart;
                if (!chart.chartArea) return null;
                return setGradient(chart);
              }
            : [
                "rgb(255, 99, 132)",
                "rgb(255, 159, 64)",
                "rgb(255, 205, 86)",
                "rgb(75, 192, 192)",
                "rgb(54, 162, 235)",
                "rgb(153, 102, 255)",
                "rgb(201, 203, 207)",
              ],
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        fill: chartType === "area", // Enable fill for area charts
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `Weather Probabilities After ${nDays} Days`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Probability (%)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Weather State",
        },
      },
    },
  };

  // Render the selected chart type
  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return <Bar data={chartData} options={options} />;
      case "line":
        return <Line data={chartData} options={options} />;
      case "area":
        return <Line data={chartData} options={{ ...options, fill: true }} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  return (
    <div
      style={{
        width: "60%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Dropdown to select chart type */}
      <div style={{ marginBottom: "20px", alignSelf: "end" }}>
        <label>
          Chart Type:
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
          </select>
        </label>
      </div>

      {/* Render the selected chart */}
      {renderChart()}
    </div>
  );
};

export default WeatherProbabilityChart;
