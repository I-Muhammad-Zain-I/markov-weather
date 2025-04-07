import React from "react";
import styles from "./Header.module.css";

const Header = ({ predictionIsVisible, togglePredictionHandler }) => {
  return (
    <header className={styles["header"]}>
      <h1 className={styles["header__title"]}>WEATHERITE</h1>
      <nav className={styles["header__nav"]}>
        <ul className={`${styles["nav__nav-list"]} aleo-h5-16`}>
          <li>
            <a href="#weather">Weather</a>
          </li>
          <li>
            <a href="#forecast">Forecast</a>
          </li>
          <li>
            <a href="#map">Map</a>
          </li>
        </ul>
      </nav>
      <section className={styles["header__profile"]}>
        <button
          onClick={togglePredictionHandler}
          className={styles["prediction_btn"]}
        >
          {predictionIsVisible ? "Show Weather" : "Predict Weather"}
        </button>
      </section>
    </header>
  );
};

export default Header;
