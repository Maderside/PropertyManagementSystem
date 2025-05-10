import React from "react";
import PropertyList from "../components/Properties/PropertyList"; // Corrected path
import { getCurrentUserRole } from "../components/utilFunctions";


const Home = () => {
  return (
  <div>
    <h1>Home Page</h1>
    
    <p>Current user role: {getCurrentUserRole()}</p>

    {getCurrentUserRole() === "landlord" && (    
    <div>
      <h2>Properties</h2>
      <PropertyList />
    </div>
    )}
    {getCurrentUserRole() === "tenant" && (
    <div>
      <h2>Properties I rent</h2>
      <PropertyList />
    </div>
    )}

  </div> 
  
  )
};

export default Home;