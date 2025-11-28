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
  const [arrivalTime, setArrivalTime] = useState("");
  const [coords, setCoords] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const handleShowAlert = () => setShowAlert(true);
  const handleCloseAlert = () => setShowAlert(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:8000/get_coords/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        origin: origin,
        destination: destination
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
      <div className="mb-3">
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


        <div className="col-md-4">
          <button type="button" className="btn btn-primary mt-3" onClick={handleSubmit}>
            Get Coordinates
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
