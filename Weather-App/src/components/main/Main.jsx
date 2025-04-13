import React, { useState, useEffect } from "react";
import Forecast from './forecast/Forecast'
import CurrentWeather from './CurrentWeather'
import MethodMenu from './MethodMenu'
import WeatherMap from './map/Map'
import ToggleButton from '../UI/ToggleButton'
import api from '../../api/axiosConfig';
import { toast } from 'sonner';

const Main = () => {
  const DUMMY_LOCATION_DATA = {
    country: 'Pakistan',
    city: 'Karachi'
  }

  const [locationData, setLocationData] = useState(DUMMY_LOCATION_DATA);
  const [coords, setCoords] = useState({ lat: 24.931137, lon: 67.076434 })
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const locationDataHandler = (data) => {
    console.log(data);
    setLocationData(data || DUMMY_LOCATION_DATA);
  }

  const setCoordsHandler = (coordinates) => {
    setCoords(coordinates)
  }

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await api.get('/weather');
        setWeatherData(response.data);
      } catch (error) {
        console.error('Error fetching weather data:', error);
        toast.error('Error fetching weather data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

  return (
    <main>
      <MethodMenu setCoordsHandler={setCoordsHandler} locationData={locationData} />
      <ToggleButton />
      <CurrentWeather
        coords={coords}
        locationDataHandler={locationDataHandler} />
      <Forecast coords={coords} />
      <WeatherMap coords={coords} />
    </main>
  )
}

export default Main