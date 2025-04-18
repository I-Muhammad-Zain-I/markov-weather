import React, { useState } from "react";
import LocationForm from "./LocationForm";
import down from "../../assets/down.svg";
import CitySearch from "./city-search/CitySearch";
const MethodMenu = (props) => {
  const [selectedOption, setSelectedOption] = useState("");
  const [geoIsAvailable, setGeoIsAvailable] = useState(false);

  useState(() => {
    // Checking on start if Geo-Location services are supported by Browser
    if ("geolocation" in navigator) {
      setGeoIsAvailable(true);
    }
    // Else it remains false.
  }, []);
  const onChange = (e) => {
    setSelectedOption(e.target.value);
    if (e.target.value == "geo") {
      navigator.geolocation.getCurrentPosition((position) => {
        props.setCoordsHandler({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      });
    }
  };

  const setCoordinateHandler = (coords) => {
    props.setCoordsHandler(coords);
  };

  let method = "";
  if (selectedOption === "custom") {
    method = (
      <LocationForm
        setCoordinateHandler={setCoordinateHandler}
        locationData={props.locationData}
      />
    );
  } else if (selectedOption === "citySearch") {
    method = <CitySearch setCoordinateHandler={setCoordinateHandler} />;
  }
  return (
    <section className="method-menu">
      <div className="menu__wrapper">
        <select
          value={selectedOption}
          onChange={(e) => onChange(e)}
          className="method-menu__select"
        >
          <option value="">Please Select Method</option>
          {geoIsAvailable && (
            <option value="geo">Grant Browser Permission For Location</option>
          )}
          <option value="custom">Provide latitude and Longitude</option>
          <option value={"citySearch"}>Search By Cities</option>
        </select>
        {/* <div className='icon-container'>
          <img src={down} alt='drop-down-icon' width={28} />
        </div> */}
      </div>
      {method}
    </section>
  );
};

export default MethodMenu;
