import { useState, useEffect } from "react";
import './Home.css';
import { Alert } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useLocation } from "react-router-dom";
import { LeafletMap } from './LeafletMap';

function App() {
  const location = useLocation();
  const historyData = location.state?.flightData;

  const [flightDate, setFlightDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [departTime, setDepartTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [taxiIn, setTaxiIn] = useState("");
  const [taxiOut, setTaxiOut] = useState("");
  const [wheelsOn, setWheelsOn] = useState("");
  const [wheelsOff, setWheelsOff] = useState("");
  const [flightDuration, setFlightDuration] = useState("");
  const [coords, setCoords] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const handleShowAlert = () => setShowAlert(true);
  const handleCloseAlert = () => setShowAlert(false);
  const [shouldSaveSearch, setShouldSaveSearch] = useState(false);
  const [adjustBasedOnWeather, setAdjustBasedOnWeather] = useState(false);

  useEffect(() => {
    if (historyData) {
      setFlightDate(historyData.flightDate || "");
      setOrigin(historyData.origin.toUpperCase() || "");
      setDestination(historyData.destination.toUpperCase() || "");
      setAirline(historyData.airline || "");
      setFlightNumber(historyData.flightNumber || "");
      setDepartTime(historyData.departTime || "");
      setArrivalTime(historyData.arrivalTime || "");
      setTaxiIn(String(historyData.taxiIn || ""));
      setTaxiOut(String(historyData.taxiOut || ""));
      setWheelsOff(historyData.wheelsOff || "");
      setWheelsOn(historyData.wheelsOn || "");
    } else {
      setFlightDate("");
      setOrigin("");
      setDestination("");
      setAirline("");
      setFlightNumber("");
      setDepartTime("");
      setArrivalTime("");
      setWheelsOff("");
      setWheelsOn("");
      setTaxiIn("");
      setTaxiOut("");
    }
  }, [historyData]);

  const handleCheckboxChange = (event) => {
    setShouldSaveSearch(event.target.checked);
  };

  const handleShouldAdjust = (event) => {
    setAdjustBasedOnWeather(event.target.checked);
  };

  const calculateTotalTime = (timeString, prediction) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const arrivalMinutes = (hours * 60) + minutes;
  
  const totalMinutes = arrivalMinutes + prediction;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = Math.round(totalMinutes % 60);
  
  const formattedHours = String(newHours).padStart(2, '0');
  const formattedMinutes = String(newMinutes).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}`;
};

  const formatTimeDifference = (ms) => {
    if (ms <= 0) return null;
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const calculateFlightDuration = () => {
    if (!flightDate || !departTime || !arrivalTime) {
      return null;
    }

    const departDateTime = new Date(`${flightDate}T${departTime}:00`);

    let arrivalDateTime = new Date(`${flightDate}T${arrivalTime}:00`);

    if (arrivalDateTime.getTime() < departDateTime.getTime()) {
      arrivalDateTime = new Date(arrivalDateTime.getTime() + 86400000);
    }

    const diffMs = arrivalDateTime.getTime() - departDateTime.getTime();

    return formatTimeDifference(diffMs);
  };

  const resetFields = () => {
    setFlightDate("");
    setOrigin("");
    setDestination("");
    setAirline("");
    setFlightNumber("");
    setDepartTime("");
    setArrivalTime("");
    setTaxiIn("");
    setTaxiOut("");
    setWheelsOff("");
    setWheelsOn("");
    setShouldSaveSearch(false);
    setCoords(null);
  };

  const resetResults = () => {
    resetFields();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let taxiInInt = taxiIn ? parseInt(taxiIn, 10) : null;
    let taxiOutInt = taxiOut ? parseInt(taxiOut, 10) : null;

    const response = await fetch("http://localhost:8000/get_coords/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        origin: origin,
        destination: destination,
        flightDate: flightDate,
        airline: airline,
        flightNumber: flightNumber,
        departTime: departTime,
        arrivalTime: arrivalTime,
        taxiIn: taxiInInt,
        taxiOut: taxiOutInt,
        wheelsOn: wheelsOn,
        wheelsOff: wheelsOff,
        shouldSaveSearch: shouldSaveSearch,
        adjustBasedOnWeather: adjustBasedOnWeather
      })
    });

    if (!response.ok) {
      console.log("Fetch Failed: Showing alert suppressed.");
      handleShowAlert();
      return;
    } else {
      if (showAlert) {
        handleCloseAlert();
      }
      const data = await response.json();
      setCoords(data);
      setFlightDuration(calculateFlightDuration());
      return;
    }

  };

  return (
    <>
      <div className="home-container">
        {showAlert && (
          <Alert variant="danger" onClose={resetResults} dismissible>
            One or more provided airport codes are invalid. Please check and try again.
          </Alert>
        )}

        {coords && (
          <button type="button" class="btn btn-danger" onClick={resetFields}>Clear Results</button>
        )}
        {coords && (
          () => {
            const mapMarkers = [
              {
                position: [coords.origin_coords.latitude, coords.origin_coords.longitude],
                label: `Origin: ${coords.origin_name} (Weather Score: ${coords.origin_weather_code.toFixed(2)})`,
              },
              {
                position: [coords.destination_coords.latitude, coords.destination_coords.longitude],
                label: `Destination: ${coords.destination_name} (Weather Score: ${coords.destination_weather_code.toFixed(2)})`,
              },
            ];

            return (
              <div className="map-container-wrapper mt-4">
                <LeafletMap markers={mapMarkers} />
              </div>
            );
          }
        )()}
        {coords && (
        
            <table className="table table-striped" id="prediction-history-table">
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">Airport</th>
                  <th scope="col">Weather Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Origin</th>
                  <td>{coords.origin_name}</td>
                  <td>{coords.origin_weather_code}</td>
                </tr>
                <tr>
                  <th scope="row">Destination</th>
                  <td>{coords.destination_name}</td>
                  <td>{coords.destination_weather_code}</td>
                </tr>
              </tbody>
            </table>
          )}

          {coords && (
            <div>
              <div className="flight-duration-container mt-3">
              <h5>Estimated Delay: {coords.prediction.toFixed(2)} minutes</h5>
            </div>


              </div>
          )}

        <div className="row">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="myDateInput" className="form-label">Flight Date</label>
              <input
                type="date"
                className="form-control"
                id="flightDate"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="originAirportCode" className="form-label">Origin Airport Code</label>
              <input
                type="text"
                className="form-control"
                id="originAirportCode"
                maxLength="3"
                placeholder="i.e. DEN"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="destinationAirportCode" className="form-label">Dest Airport Code</label>
              <input
                type="text"
                className="form-control"
                id="destinationAirportCode"
                maxLength="3"
                placeholder="i.e. ATL"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="airline" className="form-label">Airline IATA Code</label>
              <input
                type="text"
                className="form-control"
                id="airline"
                maxLength=""
                placeholder="i.e. UA"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
              />
            </div>
          </div>


          <div className="row">
          <div className="col-md-6">
              <label htmlFor="departTime" className="form-label">Depart Time</label>
              <input
                type="time"
                className="form-control"
                id="departTime"
                placeholder="00:00"
                value={departTime}
                onChange={(e) => setDepartTime(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
              </div>

            <div className="col-md-6">
              <label htmlFor="arrivalTime" className="form-label">Arrival Time</label>
              <input
                type="time"
                className="form-control"
                id="arrivalTime"
                placeholder="00:00"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>

            </div>

          <div className="row">
            <div className="col-md-6">
              <label htmlFor="taxiIn" className="form-label">Taxi In</label>
              <input
                type="number"
                className="form-control"
                id="taxiIn"
                placeholder="i.e. 21 (mins)"
                value={taxiIn}
                onChange={(e) => setTaxiIn(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="taxiOut" className="form-label">Taxi Out</label>
              <input
                type="number"
                className="form-control"
                id="taxiOut"
                placeholder="i.e. 14 (mins)"
                value={taxiOut}
                onChange={(e) => setTaxiOut(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>
            </div>

            <div className="row">

            <div className="col-md-6">
              <label htmlFor="wheelsOn" className="form-label">Wheels On</label>
              <input
                type="time"
                className="form-control"
                id="wheelsOn"
                placeholder="00:00"
                value={wheelsOn}
                onChange={(e) => setWheelsOn(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="wheelsOff" className="form-label">Wheels Off</label>
              <input
                type="time"
                className="form-control"
                id="wheelsOff"
                placeholder="00:00"
                value={wheelsOff}
                onChange={(e) => setWheelsOff(e.target.value)}
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>
          </div>
          


          <div className="mt-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="saveSearchCheckbox"
                checked={shouldSaveSearch}
                onChange={handleCheckboxChange}
              />
              <label className="form-check-label" htmlFor="saveSearchCheckbox">
                Save this search
              </label>
            </div>
          </div>

          <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="adjustBasedOnWeather"
                checked={adjustBasedOnWeather}
                onChange={handleShouldAdjust}
              />
              <label className="form-check-label" htmlFor="adjustBasedOnWeather">
                Adjust based on Weather
              </label>
            </div>

          <div className="col-md-4">
            <button type="button" className="btn btn-primary mt-3" onClick={handleSubmit}>
              Get Results
            </button>
          </div>


        </div>

      </div>
    </>
  );
}

export default App;
