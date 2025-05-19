import React, { useState, useEffect } from "react";
import axios from "axios";

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  form: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    width: "80vw",
    minWidth: "20vw",
  },
  formGroup: {
    marginBottom: "15px",
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

const RequestForm = ({
  propertyId,
  requestId,
  mode,
  onRequestAdded,
  onRequestUpdated,
  onConfirmersChanged,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    request_date: "",
    confirmers: [],
  });
  const [tenants, setTenants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const tenantsResponse = await axios.get(
          `http://localhost:8000/get-tenants-for-property/${propertyId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setTenants(tenantsResponse.data);

        const userResponse = await axios.get(
          `http://localhost:8000/users/me`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setCurrentUser(userResponse.data);

        if (mode === "add") {
          setFormData((prev) => ({
            ...prev,
            confirmers: [userResponse.data.id],
          }));
        }
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };

    const fetchRequest = async () => {
      if (mode === "edit" && requestId) {
        try {
          const response = await axios.get(
            `http://localhost:8000/tenant-request/${propertyId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          const req = response.data.find((r) => r.id === requestId);
          if (req) {
            setFormData({
              title: req.title,
              description: req.description,
              request_date: req.request_date,
              confirmers: [],
            });

            const resolutionsResponse = await axios.get(
              `http://localhost:8000/request-resolutions/${requestId}`,
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            const confirmers = resolutionsResponse.data.map((resolution) => resolution.user_id);
            setFormData((prev) => ({
              ...prev,
              confirmers,
            }));
          }
        } catch (error) {
          console.error("Error fetching request:", error);
        }
      }
    };

    fetchParticipants();
    fetchRequest();
    // eslint-disable-next-line
  }, [propertyId, requestId, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmersChange = async (e) => {
    const value = parseInt(e.target.value, 10);
    const { checked } = e.target;

    if (checked) {
      setFormData((prev) => ({
        ...prev,
        confirmers: [...prev.confirmers, value],
      }));

      if (mode === "edit") {
        try {
          await axios.post(
            `http://localhost:8000/add-request-resolution`,
            {
              request_id: requestId,
              user_id: value,
              status: "pending",
            },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          if (onConfirmersChanged) onConfirmersChanged();
        } catch (error) {
          console.error("Error adding request resolution:", error);
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        confirmers: prev.confirmers.filter((id) => id !== value),
      }));

      if (mode === "edit") {
        try {
          await axios.delete(
            `http://localhost:8000/remove-request-resolution/${requestId}/${value}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          if (onConfirmersChanged) onConfirmersChanged();
        } catch (error) {
          console.error("Error removing request resolution:", error);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "add") {
        const response = await axios.post(
          `http://localhost:8000/add-tenant-request/${propertyId}`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const newRequest = response.data;

        if (formData.confirmers.length > 0) {
          await Promise.all(
            formData.confirmers.map((userId) =>
              axios.post(
                `http://localhost:8000/add-request-resolution`,
                {
                  request_id: newRequest.id,
                  user_id: userId,
                  status: "pending",
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
              )
            )
          );
        }

        alert("Request and resolutions added successfully!");
        setFormData({ title: "", description: "", request_date: "", confirmers: [] });
        if (onRequestAdded) onRequestAdded(newRequest);
      } else if (mode === "edit") {
        const response = await axios.put(
          `http://localhost:8000/update-tenant-request/${requestId}`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        alert("Request updated successfully!");
        if (onRequestUpdated) onRequestUpdated(response.data);
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      alert(error.response?.data?.detail || "An error occurred while submitting the request.");
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Title:</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Description:</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Request Date:</label>
          <input
            type="date"
            name="request_date"
            value={formData.request_date}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Confirmers:</label>
          {currentUser && (
            <div>
              <label>
                <input
                  type="checkbox"
                  value={currentUser.id}
                  checked={formData.confirmers.includes(currentUser.id)}
                  onChange={handleConfirmersChange}
                  disabled
                />
                {currentUser.name} (You)
              </label>
            </div>
          )}
          {tenants
            .filter((t) => !currentUser || t.id !== currentUser.id)
            .map((tenant) => (
              <div key={tenant.id}>
                <label>
                  <input
                    type="checkbox"
                    value={tenant.id}
                    checked={formData.confirmers.includes(tenant.id)}
                    onChange={handleConfirmersChange}
                  />
                  {tenant.name}
                </label>
              </div>
            ))}
        </div>
        <button type="submit" style={styles.button}>
          {mode === "add" ? "Add Request" : "Update Request"}
        </button>
      </form>
    </div>
  );
};

export default RequestForm;
