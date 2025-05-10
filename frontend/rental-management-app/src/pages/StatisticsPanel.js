import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

const StatisticsPanel = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const generateColorsBasedOnValues = (data, baseColor) => {
        const shadeFactor = baseColor === 'green' ? 120 : 0; // Green for incomes, Red for expenses
        const gradientColor = baseColor === 'green' ? 240 : 60; // Blue for incomes, Yellow for expenses
        const totalValue = data.reduce((sum, item) => sum + item.value, 0); // Calculate the total value
        return data.map(item => {
            const valueRatio = item.value / totalValue; // Calculate the ratio of the current value to the total value
            const saturation = 30 + valueRatio * 70 + Math.random() * 15; // Add slight random variation to saturation
            const lightness = 70 - valueRatio * 55 - Math.random() * 10; // Add slight random variation to lightness
            const mixedHue = shadeFactor + (gradientColor - shadeFactor) * (1 - valueRatio); // Gradually mix the gradient color
            return `hsl(${mixedHue}, ${saturation}%, ${lightness}%)`;
        });
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
    const chartData = transactions
        .map((transaction) => ({
            name: transaction.type, // Assuming each transaction has a 'type' field
            value: parseFloat(transaction.amount),
        }))
        .sort((a, b) => b.value - a.value); // Sort by descending order of value

    const COLORS_INCOMES = generateColorsBasedOnValues(chartData, 'green');
    const COLORS_EXPENSES = generateColorsBasedOnValues(chartData, 'red');

    // Determine if the screen size is small
    const isSmallScreen = window.innerWidth < 600; // Adjust the width threshold as needed

return (
    <div >
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
                    flexWrap: "wrap",
                    columnGap: "200px", // Allow diagrams to wrap to the next line
                    rowGap: "100px", // Add spacing between diagrams
                    justifyContent: "center", // Center diagrams horizontally
                    alignItems: "center", // Center diagrams vertically
                }}
            >
                {/* First Diagram */}
                <div style={{ flex: "1 1 200px", maxWidth: "350px", height: "500px" }}>
                    <h2 style={{ textAlign: "center" }}>Incomes</h2>
                    
                        <PieChart width={350} height={400}>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={110}
                                fill="#8884d8"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_INCOMES[index % COLORS_INCOMES.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                 
                </div>

                {/* Second Diagram */}
                <div style={{flex: "2 1 200px", maxWidth: "350px", height: "500px" }}>
                    <h2 style={{ textAlign: "center" }}>Expenses</h2>

                        <PieChart width={350} height={400}>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={110}
                                fill="#82ca9d"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_EXPENSES[index % COLORS_EXPENSES.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                </div>
            </div>
        )}
    </div>
);
};

export default StatisticsPanel;