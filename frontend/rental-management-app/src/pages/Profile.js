import React, { useEffect, useState } from "react";
import axios from "axios";
import LoginForm from "../components/Authorisation/LoginForm"; // Corrected path
import RegisterForm from "../components/Authorisation/RegisterForm"; // Corrected path

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false); // State to toggle RegisterForm

  const buttonStyle = {
    backgroundColor: "red",
    color: "white",
    border: "none",
    padding: "10px 20px",
    marginTop: "10px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  };

  const handleLoginSuccess = () => {
    fetchUser(); // Fetch user data after successful login
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token"); // Retrieve token from localStorage
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get("http://localhost:8000/users/me", {
        headers: {
          Authorization: `Bearer ${token}`, // Send token in Authorization header
        },
      });

      setUser(response.data); // Set user data if request is successful
      localStorage.setItem("role", response.data.role); // Store role in localStorage
    } catch (error) {
          console.error("Error fetching user:", error);
          setUser(null); // Clear user data if request fails
    } finally {
          setLoading(false); // Stop loading once the request is complete
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token"); // Remove token from localStorage
    localStorage.removeItem("role"); // Remove role from localStorage
    setUser(null); // Reset user state
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <div>
          <h2>Welcome, {user.email}</h2>
          <p>Role: {user.role}</p>
          <button onClick={handleLogout} style={buttonStyle}>Logout</button> {/* Logout button */}
        </div>
      ) : (
        <div>
          <h2>You are not signed in</h2>
          {!showRegister && <LoginForm onLoginSuccess={handleLoginSuccess} />} {/* Conditionally render LoginForm */}
          {showRegister && <RegisterForm />} {/* Conditionally render RegisterForm */}
          <button
            onClick={() => setShowRegister(!showRegister)} // Toggle RegisterForm visibility
            style={{ ...buttonStyle, backgroundColor: "blue" }}
          >
            {showRegister ? "Back to login ↵" : "Register new user →"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;