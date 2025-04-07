import "./App.css";
import Header from "./components/header/Header";
import Main from "./components/main/Main";
import { Fragment, useState } from "react";
import PredictionMain from "./PredictionMain";

function App() {
  const [predictionIsVisible, setPredictionIsVisible] = useState(false);

  const togglePredictionHandler = () => {
    console.log("togglePredictionHandler called");
    setPredictionIsVisible((iv) => !iv);
  };

  return (
    <Fragment>
      <Header
        togglePredictionHandler={togglePredictionHandler}
        predictionIsVisible={predictionIsVisible}
      />
      {!predictionIsVisible && <Main />}
      {predictionIsVisible && <PredictionMain />}
      {/* <Footer /> */}
    </Fragment>
  );
}

export default App;
