import './App.css';
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PropertyPanel from "./pages/PropertyPanel";
import StatisticsPanel from './pages/StatisticsPanel';
import Navbar from "./components/Navbar";

function App() {
  return (
    <div className="App">
      <Router>
        <Navbar>
          <NavLink to="/" className="navbar-link" end>Home</NavLink>
          <NavLink to="/Profile" className="navbar-link">Profile</NavLink>
          <NavLink to="/StatisticsPanel" className="navbar-link">Statistics Panel</NavLink>
        </Navbar>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/NotFound" element={<NotFound />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/PropertyPanel/:propertyId" element={<PropertyPanel />} />
          <Route path="/StatisticsPanel" element={<StatisticsPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;