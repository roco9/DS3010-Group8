import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';

function App() {
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">Flight Times</Link>
          <div className="collapse navbar-collapse">
            <div className="navbar-nav">
              <Link className="nav-item nav-link" to="/">Home</Link>
              <Link className="nav-item nav-link" to="/history">History</Link>
            </div>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
      </Routes>

    </>
  );
}

export default App;
