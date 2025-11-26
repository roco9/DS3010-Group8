import './History.css';

function App() {

    return (
        <>
            <h1>History Tab (placeholder ui for now - will probably also have more columns)</h1>
            <input type="text" id="myInput" placeholder="Search table..."></input>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th scope="col">Flight Number</th>
                        <th scope="col">Airline</th>
                        <th scope="col">Departure Airport</th>
                        <th scope="col">Arrival Airport</th>
                        <th scope="col">Predicted Delay</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">12345</th>
                        <td>American</td>
                        <td>ATL</td>
                        <td>DEN</td>
                        <td class="table-active">0</td>
                    </tr>
                    <tr>
                        <th scope="row">12345</th>
                        <td>United</td>
                        <td>LAX</td>
                        <td>MIA</td>
                        <td class="table-active">-12</td>
                    </tr>
                    <tr>
                        <th scope="row">12345</th>
                        <td>JetBlue</td>
                        <td>JFK</td>
                        <td>ORD</td>
                        <td class="table-active">14</td>
                    </tr>
                </tbody>
            </table>
            
        </>
    )
}

export default App
