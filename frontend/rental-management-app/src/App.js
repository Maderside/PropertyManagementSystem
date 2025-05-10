// import logo from './logo.svg';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PropertyPanel from "./pages/PropertyPanel";
import StatisticsPanel from './pages/StatisticsPanel';

function App() {

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <Router>
          <nav>
            <Link to="/">Home</Link>
            | 
            <Link to="/Profile">Profile</Link>
            |
            <Link to="/StatisticsPanel/1">Statistics</Link>
          </nav>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/NotFound" element={<NotFound />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/PropertyPanel/:propertyId" element={<PropertyPanel />} />
            <Route path="/StatisticsPanel/:propertyId" element={<StatisticsPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </header>
      
    </div>
  );
}

export default App;
