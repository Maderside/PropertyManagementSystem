import React from "react";

const Navbar = ({ children }) => (
  <nav
    style={{
      width: "100%",
      top: 0,
      left: 0,
      position: "relative",
      background: "#222",
      color: "#fff",
      padding: "0.75rem 1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center", // changed from "space-between" to "center"
      boxSizing: "border-box",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center", // added to center children
        gap: "1rem",
      }}
    >
      {children}
    </div>
  </nav>
);

export default Navbar;
