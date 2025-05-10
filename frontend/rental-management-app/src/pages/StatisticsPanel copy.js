import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

const StatisticsPanel = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const generateRandomColors = (count) => {
        return Array.from({ length: count }, () =>
            `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
        );
    };

    const fetchTransactions = async () => {
        const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL
        try {
            const response = await axios.get(`http://localhost:8000/transactions/${propertyId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setTransactions(response.data);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Unauthorized access. Please log in again.');
            } else if (err.response?.status === 404) {
                setError('No transactions found for this property.'); // Handle 404 error
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        
    }, []);


    // Transform transactions into the format required by the PieChart
    const chartData = transactions.map((transaction) => ({
        name: transaction.type, // Assuming each transaction has a 'type' field
        value: parseFloat(transaction.amount),
    }));

    const COLORS = generateRandomColors(chartData.length);

    // Determine if the screen size is small
    const isSmallScreen = window.innerWidth < 600; // Adjust the width threshold as needed

return (
    <div style={{ width: "90%", height: "90%"}}>
        <h1>Statistics Panel</h1>
        {loading ? (
            <p>Loading transactions...</p>
        ) : error && error !== 'No transactions found for this property.' ? (
            <p>Error: {error}</p>
        ) : chartData.length === 0 ? (
            <p>No transactions available to display.</p>
        ) : (
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap", // Allow diagrams to wrap to the next line
                    gap: "100px", // Add spacing between diagrams
                    justifyContent: "center", // Center diagrams horizontally
                    alignItems: "center", // Center diagrams vertically
                }}
            >
                {/* First Diagram */}
                <div style={{ flex: "1 1 400px", maxWidth: "400px", height: "400px" }}>
                    <h2 style={{ textAlign: "center" }}>Incomes</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                label={!isSmallScreen ? ({ name }) => name : false} // Disable labels on small screens
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Second Diagram */}
                <div style={{ flex: "1 1 400px", maxWidth: "400px", height: "400px" }}>
                    <h2 style={{ textAlign: "center" }}>Expenses</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#82ca9d"
                                label={!isSmallScreen ? ({ name }) => name : false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
    </div>
);
};

export default StatisticsPanel;