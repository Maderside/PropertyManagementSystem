import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import axios from 'axios';

const StatisticsPanel = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const generateColorsBasedOnValues = (data, baseColor) => {
        const shadeFactor = baseColor === 'green' ? 120 : 0; // Green for incomes, Red for expenses
        const gradientColor = baseColor === 'green' ? 240 : 60; // Blue for incomes, Yellow for expenses
        const totalValue = data.reduce((sum, item) => sum + item.value, 0); // Calculate the total value
        return data.map(item => {
            const valueRatio = item.value / totalValue; // Calculate the ratio of the current value to the total value
            const saturation = 30 + valueRatio * 70 + Math.random() * 15; // Add slight random variation to saturation
            const lightness = 70 - valueRatio * 55 - Math.random() * 5; // Add slight random variation to lightness
            const mixedHue = shadeFactor + (gradientColor - shadeFactor) * (1 - valueRatio); // Gradually mix the gradient color
            return `hsl(${mixedHue}, ${saturation}%, ${lightness}%)`;
        });
    };

    const fetchTransactions = async () => {
        try {
            const response = await axios.get(`http://localhost:8000/all-resolved-transactions`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setTransactions(response.data);
            // Try to get user role from localStorage or decode from token if available
            const storedRole = localStorage.getItem('role');
            if (storedRole) {
                setUserRole(storedRole);
            } else {
                // Optionally decode JWT to get role if not in localStorage
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        setUserRole(payload.role);
                        localStorage.setItem('role', payload.role);
                    }
                } catch {}
            }
            console.log("Fetched")
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

    // Helper to aggregate transactions by type and sum their amounts
    const aggregateByType = (transactions) => {
        const map = {};
        transactions.forEach((transaction) => {
            const type = transaction.type;
            const amount = parseFloat(transaction.amount);
            if (!map[type]) {
                map[type] = 0;
            }
            map[type] += amount;
        });
        // Convert to array of { name, value }
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    // Split transactions into incomes and expenses based on payee_role and userRole
    const incomes = transactions.filter(
        (transaction) => userRole && transaction.payee_role !== userRole
    );
    const expenses = transactions.filter(
        (transaction) => userRole && transaction.payee_role === userRole
    );

    // Helper to check if a transaction is in the selected month
    const isInSelectedMonth = (dateStr) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const [year, month] = selectedMonth.split('-');
        return (
            date.getFullYear() === parseInt(year, 10) &&
            date.getMonth() + 1 === parseInt(month, 10)
        );
    };

    // Filter transactions for the selected month
    const monthlyIncomes = transactions.filter(
        (transaction) =>
            userRole &&
            transaction.payee_role !== userRole &&
            isInSelectedMonth(transaction.due_date)
    );
    const monthlyExpenses = transactions.filter(
        (transaction) =>
            userRole &&
            transaction.payee_role === userRole &&
            isInSelectedMonth(transaction.due_date)
    );

    // Aggregate chart data for incomes and expenses for the selected month
    const chartDataIncomes = aggregateByType(monthlyIncomes);
    const chartDataExpenses = aggregateByType(monthlyExpenses);

    const COLORS_INCOMES = generateColorsBasedOnValues(chartDataIncomes, 'green');
    const COLORS_EXPENSES = generateColorsBasedOnValues(chartDataExpenses, 'red');

    // Calculate totals for selected month
    const totalMonthlyIncome = monthlyIncomes.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalMonthlyExpenses = monthlyExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyBalance = totalMonthlyIncome - totalMonthlyExpenses;

    // Generate month options based on transactions
    const getMonthOptions = () => {
        const monthsSet = new Set();
        transactions.forEach((t) => {
            if (t.due_date) {
                const date = new Date(t.due_date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthsSet.add(key);
            }
        });
        // Always include the current month
        const now = new Date();
        monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        // Sort descending (latest first)
        return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    };

return (
    <div >
        <h1>Statistics Panel</h1>
        {/* Month selector */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <label htmlFor="month-select" style={{ marginRight: "10px" }}>Select Month:</label>
            <select
                id="month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
            >
                {getMonthOptions().map((monthKey) => {
                    const [year, month] = monthKey.split('-');
                    const date = new Date(year, month - 1);
                    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    return (
                        <option key={monthKey} value={monthKey}>{label}</option>
                    );
                })}
            </select>
        </div>
        {/* Monthly summary */}
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginBottom: "30px" }}>
            <div>
                <span>Monthly Incomes: </span>
                <span style={{ color: "green", fontWeight: "bold" }}>
                    {totalMonthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            <div>
                <span>Monthly Expenses: </span>
                <span style={{ color: "red", fontWeight: "bold" }}>
                    {totalMonthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            <div>
                <span>Monthly Balance: </span>
                <span style={{ color: monthlyBalance >= 0 ? "green" : "red", fontWeight: "bold" }}>
                    {monthlyBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
        {loading ? (
            <p>Loading transactions...</p>
        ) : error && error !== 'No transactions found for this property.' ? (
            <p>Error: {error}</p>
        ) : (chartDataIncomes.length === 0 && chartDataExpenses.length === 0) ? (
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
                    {chartDataIncomes.length === 0 ? (
                        <p style={{ textAlign: "center" }}>No incomes to display.</p>
                    ) : (
                        <PieChart width={350} height={400}>
                            <Pie
                                data={chartDataIncomes}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={110}
                                fill="#8884d8"
                            >
                                {chartDataIncomes.map((entry, index) => (
                                    <Cell key={`cell-income-${index}`} fill={COLORS_INCOMES[index % COLORS_INCOMES.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    )}
                </div>

                {/* Second Diagram */}
                <div style={{flex: "2 1 200px", maxWidth: "350px", height: "500px" }}>
                    <h2 style={{ textAlign: "center" }}>Expenses</h2>
                    {chartDataExpenses.length === 0 ? (
                        <p style={{ textAlign: "center" }}>No expenses to display.</p>
                    ) : (
                        <PieChart width={350} height={400}>
                            <Pie
                                data={chartDataExpenses}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={110}
                                fill="#82ca9d"
                            >
                                {chartDataExpenses.map((entry, index) => (
                                    <Cell key={`cell-expense-${index}`} fill={COLORS_EXPENSES[index % COLORS_EXPENSES.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    )}
                </div>
            </div>
        )}
    </div>
);
};

export default StatisticsPanel;