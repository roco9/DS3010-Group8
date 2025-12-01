import './History.css';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
    const [history, setHistory] = useState([]);
    const navigate = useNavigate();

    const handleClick = (rowData) => {
        console.log("tapped row!", rowData);
        navigate('/', { state: { flightData: rowData } });
    };

    useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/history')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setHistory(result);
        console.log(result)
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchData();
  }, []);

    return (
        <>
            <div className="history-container">
            <h1>Past Searches</h1>
            <table class="table table-striped" id="prediction-history-table">
                <thead>
                    <tr>
                        <th scope="col">Flight Number</th>
                        <th scope="col">Airline</th>
                        <th scope="col">Departure Airport</th>
                        <th scope="col">Arrival Airport</th>
                        <th scope="col">Departure Time</th>
                        <th scope="col">Arrival Time</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((item, index) => (
                            <tr key={index} class="grid-hover" onClick={() => handleClick(item)}> 
                                <th scope="row">{item.flightNumber}</th>
                                <td>{item.airline}</td>
                                <td>{item.origin.toUpperCase()}</td>
                                <td>{item.destination.toUpperCase()}</td>
                                <td>{item.departTime}</td>
                                <td>{item.arrivalTime}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
            </div>
        </>
    )
}

export default App
