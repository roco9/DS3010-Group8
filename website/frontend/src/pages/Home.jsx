import { useState } from "react";
import './Home.css';
import { Alert } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [flightDate, setFlightDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [departTime, setDepartTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [flightDuration, setFlightDuration] = useState("");
  const [coords, setCoords] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const handleShowAlert = () => setShowAlert(true);
  const handleCloseAlert = () => setShowAlert(false);
  const [shouldSaveSearch, setShouldSaveSearch] = useState(false);

  const handleCheckboxChange = (event) => {
    setShouldSaveSearch(event.target.checked);
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


  const handleSubmit = async (e) => {
    e.preventDefault();

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
        shouldSaveSearch: shouldSaveSearch
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
      <div class="home-container">
        <h1>Home Tab</h1>
        {showAlert && (
          <Alert variant="danger" onClose={handleCloseAlert} dismissible>
            One or more provided airport codes are invalid. Please check and try again.
          </Alert>
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

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="airline" className="form-label">Airline</label>
              <input
                type="text"
                className="form-control"
                id="airline"
                maxLength=""
                placeholder="i.e. United"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="flightNumber" className="form-label">Flight Number</label>
              <input
                type="text"
                className="form-control"
                id="flightNumber"
                maxLength=""
                placeholder="i.e. UA124"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-">
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

            <div className="col-mb-6">
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

          <div className="col-md-4">
            <button type="button" className="btn btn-primary mt-3" onClick={handleSubmit}>
              Get Results
            </button>
          </div>

          {coords && (
            <table class="table table-striped" id="prediction-history-table">
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">Airport</th>
                  <th scope="col">Latitude</th>
                  <th scope="col">Longitude</th>
                  <th scope="col">Weather Code (0-1)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Origin</th>
                  <td>{coords.origin_name}</td>
                  <td>{coords.origin_coords.latitude}</td>
                  <td>{coords.origin_coords.longitude}</td>
                  <td>{coords.origin_weather_code}</td>
                </tr>
                <tr>
                  <th scope="row">Destination</th>
                  <td>{coords.destination_name}</td>
                  <td>{coords.destination_coords.latitude}</td>
                  <td>{coords.destination_coords.longitude}</td>
                  <td>{coords.destination_weather_code}</td>
                </tr>
              </tbody>
            </table>
          )}

        </div>

        {flightDuration && (
          <p>Flight Duration: {flightDuration}</p>
        )}

        {coords && (
          <pre className="mt-3">
            {JSON.stringify(coords, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}

export default App;
