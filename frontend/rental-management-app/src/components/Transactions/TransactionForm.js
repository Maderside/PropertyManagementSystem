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
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  checkboxGroup: {
    marginBottom: "15px",
    textAlign: "left",
  },
  checkboxLabel: {
    display: "block",
    marginBottom: "5px",
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

const TransactionForm = ({ propertyId, transactionId, mode, onTransactionUpdated, onTransactionAdded }) => {
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    due_date: "",
    payee_role: "tenant",
    is_visible_to_tenants: true,
    confirmers: [],
  });
  const [tenants, setTenants] = useState([]);
  const [landlord, setLandlord] = useState(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const tenantsResponse = await axios.get(
          `http://localhost:8000/get-tenants-for-property/${propertyId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setTenants(tenantsResponse.data);

        const landlordResponse = await axios.get(
          `http://localhost:8000/users/me`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setLandlord(landlordResponse.data);

        if (mode === "add") {
          setFormData((prevFormData) => ({
            ...prevFormData,
            confirmers: [landlordResponse.data.id],
          }));
        }
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };

    const fetchTransaction = async () => {
      if (mode === "edit" && transactionId) {
        try {
          const transactionResponse = await axios.get(
            `http://localhost:8000/transactions/${propertyId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          const transaction = transactionResponse.data.find((t) => t.id === transactionId);
          if (transaction) {
            setFormData({
              type: transaction.type,
              amount: transaction.amount,
              due_date: transaction.due_date,
              payee_role: transaction.payee_role,
              is_visible_to_tenants: transaction.is_visible_to_tenants,
              confirmers: [], // Fetch confirmers separately
            });

            const resolutionsResponse = await axios.get(
              `http://localhost:8000/transaction-resolutions/${transactionId}`,
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            const confirmers = resolutionsResponse.data.map((resolution) => resolution.user_id);
            setFormData((prevFormData) => ({
              ...prevFormData,
              confirmers,
            }));
          }
        } catch (error) {
          console.error("Error fetching transaction:", error);
        }
      }
    };

    fetchParticipants();
    fetchTransaction();
  }, [propertyId, transactionId, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleConfirmersChange = async (e) => {
    const value = parseInt(e.target.value, 10);
    const { checked } = e.target;

    if (checked) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        confirmers: [...prevFormData.confirmers, value],
      }));

      if (mode === "edit") {
        try {
          await axios.post(
            `http://localhost:8000/add-transaction-resolution`,
            {
              transaction_id: transactionId,
              user_id: value,
              status: "pending",
            },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
        } catch (error) {
          console.error("Error adding transaction resolution:", error);
        }
      }
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        confirmers: prevFormData.confirmers.filter((id) => id !== value),
      }));

      if (mode === "edit") {
        try {
          await axios.delete(
            `http://localhost:8000/remove-transaction-resolution/${transactionId}/${value}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
        } catch (error) {
          console.error("Error removing transaction resolution:", error);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "add") {
        const transactionResponse = await axios.post(
          `http://localhost:8000/add-transaction/${propertyId}`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const newTransaction = transactionResponse.data;

        if (formData.confirmers.length > 0) {
          await Promise.all(
            formData.confirmers.map((userId) =>
              axios.post(
                `http://localhost:8000/add-transaction-resolution`,
                {
                  transaction_id: newTransaction.id,
                  user_id: userId,
                  status: "pending",
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
              )
            )
          );
        }

        alert("Transaction and resolutions added successfully!");
        setFormData({
          type: "",
          amount: "",
          due_date: "",
          payee_role: "tenant",
          is_visible_to_tenants: true,
          confirmers: [],
        });
        if (onTransactionAdded) onTransactionAdded(newTransaction);
      } else if (mode === "edit") {
        const updatedTransactionResponse = await axios.put(
          `http://localhost:8000/update-transaction/${transactionId}`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const updatedTransaction = updatedTransactionResponse.data; // Get updated transaction data
        alert("Transaction updated successfully!");
        if (onTransactionUpdated) onTransactionUpdated(updatedTransaction); // Pass updated transaction
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      alert(error.response.data.detail || "An error occurred while submitting the transaction.");
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Type:</label>
          <input
            type="text"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Amount:</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Due Date:</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Payee Role:</label>
          <select
            name="payee_role"
            value={formData.payee_role}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label>
            <input
              type="checkbox"
              name="is_visible_to_tenants"
              checked={formData.is_visible_to_tenants}
              onChange={handleChange}
            />
            Visible to Tenants
          </label>
        </div>
        <div style={styles.checkboxGroup}>
          <label style={styles.label}>Confirmers:</label>
          {landlord && (
            <div>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={landlord.id}
                  checked={formData.confirmers.includes(landlord.id)}
                  onChange={handleConfirmersChange}
                  disabled
                />
                {landlord.name} (Landlord)
              </label>
            </div>
          )}
          {tenants.map((tenant) => (
            <div key={tenant.id}>
              <label style={styles.checkboxLabel}>
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
          {mode === "add" ? "Add Transaction" : "Update Transaction"}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
