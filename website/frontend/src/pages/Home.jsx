import { useState } from "react";
import './Home.css';
import { Alert } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
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
      <h1>Home Tab</h1>
      {showAlert && (
          <Alert variant="danger" onClose={handleCloseAlert} dismissible>
            One or more provided airport codes are invalid. Please check and try again.
          </Alert>
        )}

      <div className="row">

        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="myDateInput" className="form-label">Flight Date</label>
            <input type="date" className="form-control" id="myDateInput" />
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
          <button type="button" className="btn btn-primary mt-3" onClick={handleSubmit}>
            Get Coordinates
          </button>
        </div>

      </div>

      {coords && (
        <pre className="mt-3">
        {JSON.stringify(coords, null, 2)}
        </pre>
      )}
    </>
  );
}

export default App;
