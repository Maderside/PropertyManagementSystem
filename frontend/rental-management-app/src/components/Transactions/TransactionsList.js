import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TransactionCard from './TransactionCard'; // Corrected path
import TransactionForm from './TransactionForm'; // Corrected path

const TransactionsList = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddTransactionForm, setShowAddTransactionForm] = useState(false); // State for toggling form
    const [editTransactionId, setEditTransactionId] = useState(null); // State for editing transaction

    const handleTransactionClick = (transaction) => {
        setEditTransactionId(transaction.id); // Set the transaction ID to edit
        setShowAddTransactionForm(false); // Hide the add transaction form
    };

    const handleTransactionAdded = (newTransaction) => {
        setTransactions((prevTransactions) => [...prevTransactions, newTransaction]);
        setShowAddTransactionForm(false); // Hide form after submission
    };

    const handleTransactionUpdated = (updatedTransaction) => {
        setTransactions((prevTransactions) =>
            prevTransactions.map((transaction) =>
                transaction.id === updatedTransaction.id ? updatedTransaction : transaction
            )
        );
        setEditTransactionId(null); // Reset edit mode
    };

    const handleDeleteTransaction = async (transaction) => {
        const confirmDeletion = window.confirm(`Are you sure you want to delete this transaction?`);
        if (!confirmDeletion) {
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:8000/delete-transaction/${transaction.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert(response.data.message);
            setTransactions(transactions.filter((t) => t.id !== transaction.id)); // Update the transaction list
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Unauthorized access. Please log in again.');
            } else {
                alert(`Error: ${err.response?.data?.detail || err.message}`);
            }
        }
    };

    useEffect(() => {
        const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL
        const fetchTransactions = async () => {
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

        fetchTransactions();
    }, []);

    // Get current user role from localStorage
    const currentUserRole = localStorage.getItem('role');

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p><strong>Transactions:</strong></p>
                {currentUserRole === "landlord" && (
                    <button
                        style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px', fontSize: '1.2rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        onClick={() => {
                            setShowAddTransactionForm(!showAddTransactionForm);
                            setEditTransactionId(null); // Reset edit mode when adding a new transaction
                        }}
                    >
                        +
                    </button>
                )}
            </div>
            {loading ? (
                <p>Loading transactions...</p>
            ) : error && error !== 'No transactions found for this property.' ? ( // Show error only if it's not 404
                <p>Error: {error}</p>
            ) : showAddTransactionForm ? (
                <TransactionForm
                    propertyId={window.location.pathname.split('/').pop()}
                    mode="add"
                    onTransactionAdded={handleTransactionAdded}
                />
            ) : editTransactionId ? (
                <TransactionForm
                    propertyId={window.location.pathname.split('/').pop()}
                    transactionId={editTransactionId}
                    mode="edit"
                    onTransactionUpdated={handleTransactionUpdated} // Pass updated transaction handler
                />
            ) : (
                transactions.map((transaction) => (
                    <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onClick={() => handleTransactionClick(transaction)}
                        onDelete={() => handleDeleteTransaction(transaction)} // Pass delete handler
                    />
                ))
            )}
        </div>
    );
};

export default TransactionsList;