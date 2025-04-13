import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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
} from 'chart.js';
import api from '../../api/axiosConfig';

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

const WeatherVisualizations = ({ refreshKey }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherData();
  }, [refreshKey]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/weather-data');
      setWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading visualizations...</div>;
  if (!weatherData) return <div>No data available</div>;

  // Prepare data for different visualizations
  const stateDistributionData = {
    labels: Object.keys(weatherData.state_counts),
    datasets: [{
      label: 'Frequency',
      data: Object.values(weatherData.state_counts),
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Prepare monthly distribution data
  const monthlyLabels = Object.keys(weatherData.monthly_counts).map(month => {
    const date = new Date(2000, parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short' });
  });

  const monthlyDatasets = weatherData.states.map((state, index) => ({
    label: state,
    data: Object.values(weatherData.monthly_counts).map(month => month[state] || 0),
    borderColor: [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)'
    ][index],
    backgroundColor: 'rgba(0, 0, 0, 0)',
    tension: 0.1
  }));

  const monthlyDistributionData = {
    labels: monthlyLabels,
    datasets: monthlyDatasets
  };

  // Prepare transition data
  const transitionLabels = Object.keys(weatherData.transitions);
  const transitionDatasets = weatherData.states.map((state, index) => ({
    label: `To ${state}`,
    data: transitionLabels.map(fromState => weatherData.transitions[fromState][state] || 0),
    backgroundColor: [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)'
    ][index],
    borderColor: [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)'
    ][index],
    borderWidth: 1
  }));

  const transitionData = {
    labels: transitionLabels,
    datasets: transitionDatasets
  };

  // Common chart options
  const commonOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Weather Data Visualizations</h2>
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '80%',
        maxWidth: '1200px'
      }}>
        {/* State Distribution Chart */}
        <div style={{ 
          marginBottom: '30px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Weather State Distribution</h3>
          <div style={{ width: '100%', height: '300px', display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Bar
              data={stateDistributionData}
              options={{
                ...commonOptions,
                plugins: {
                  ...commonOptions.plugins,
                  title: {
                    display: true,
                    text: 'Frequency of Weather States'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Monthly Distribution Chart */}
        <div style={{ 
          marginBottom: '30px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Weather States by Month</h3>
          <div style={{ width: '100%', height: '300px', display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Line
              data={monthlyDistributionData}
              options={{
                ...commonOptions,
                plugins: {
                  ...commonOptions.plugins,
                  title: {
                    display: true,
                    text: 'Monthly Weather Distribution'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Transition Flow Chart */}
        <div style={{ 
          marginBottom: '30px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Weather State Transitions</h3>
          <div style={{ width: '100%', height: '300px', display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Bar
              data={transitionData}
              options={{
                ...commonOptions,
                plugins: {
                  ...commonOptions.plugins,
                  title: {
                    display: true,
                    text: 'Weather State Transitions'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherVisualizations; 