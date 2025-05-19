import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const TransactionCard = ({ transaction, onClick, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [resolutions, setResolutions] = useState([]);
    const [loading, setLoading] = useState(true); // Add loading state
    const [forceUpdate, setForceUpdate] = useState(false);

    // Calculate days left
    const calculateDaysLeft = (dueDate) => {
        const currentDate = new Date();
        const dueDateObj = new Date(dueDate);
        const timeDiff = dueDateObj - currentDate;
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    };

    const daysLeft = calculateDaysLeft(transaction.due_date);

    // Fetch transaction resolutions
    useEffect(() => {
        const fetchResolutions = async () => {
            try {
                const response = await fetch(`http://localhost:8000/transaction-resolutions/${transaction.id}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                const data = await response.json();
                setResolutions(data);
            } catch (error) {
                console.error('Error fetching resolutions:', error);
            } finally {
                setLoading(false); // Set loading to false after fetch completes
            }
        };

        fetchResolutions();
    }, [transaction.id, forceUpdate]);

    // Determine card background color
    const determineCardColor = () => {
        if (loading) return '#fff'; // Default white while loading
        const allResolved = resolutions.every((res) => res.status === 'resolved');
        const userRole = localStorage.getItem('role');
        if (allResolved) {
            return transaction.payee_role === userRole ? '#ffcccc' : '#ccffcc'; // light red or light green
        }
        return '#fff'; // default white
    };

    const cardColor = determineCardColor();
    const hoverColor = isHovered ? (cardColor === '#ffcccc' ? '#e6b3b3' : cardColor === '#ccffcc' ? '#b3e6b3' : '#e0e0e0') : cardColor;

    // Determine if all resolutions are resolved
    const allResolved = resolutions.every((res) => res.status === 'resolved');

    // Get current user id and role from localStorage
    const currentUserId = Number(localStorage.getItem('user_id'));
    const currentUserRole = localStorage.getItem('role');

    // Find the current user's resolution
    const currentUserResolution = resolutions.find((res) => res.user_id === currentUserId);

    const handleConfirmTransaction = async () => {
        try {
            const response = await axios.put(`http://localhost:8000/resolve-transaction/${transaction.id}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert(response.data.message || 'Transaction confirmed successfully!');
            setForceUpdate((prev) => !prev); // Force update the component to re-fetch resolutions
        } catch (error) {
            console.error('Error confirming transaction:', error);
            alert(error.response?.data?.detail || 'Failed to confirm transaction. Please try again.');
        }
    };

    if (loading) {
        return <div>Loading...</div>; // Show a loading indicator while fetching data
    }

    return (
        <div
            style={{ ...styles.card, backgroundColor: hoverColor }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title='Click to edit'
        >
            <h2 style={styles.title}>{transaction.type}</h2>
            <p style={styles.content}>
                <strong>Amount:</strong> ${transaction.amount}
            </p>
            <p style={styles.content}>
                <strong>Due Date:</strong> {transaction.due_date}
            </p>
            <p style={styles.content}>
                <strong>Payee Role:</strong>{' '}
                {transaction.payee_role === localStorage.getItem('role') ? (
                    <span style={{ fontWeight: 'bold', color: 'red' }}>Me</span>
                ) : (
                    transaction.payee_role
                )}
            </p>
            <p style={styles.content}>
                <strong>Visible to Tenants:</strong> {transaction.is_visible_to_tenants ? 'Yes' : 'No'}
            </p>
            <p style={styles.content}>
                <strong>Days Left:</strong> {resolutions.every((res) => res.status === 'resolved') ? 'Transaction resolved' : (daysLeft > 0 ? daysLeft : 'Overdue')}
            </p>
            <p style={styles.content}>
                <strong>Confirmed by:</strong>
            </p>
            <ul style={styles.list}>
                {resolutions.map((resolution) => (
                    <li key={resolution.resolution_id} style={styles.listItem}>
                        <input
                            type="checkbox"
                            checked={resolution.status === 'resolved'}
                            readOnly
                        />
                        {` ${resolution.user_name} (${resolution.user_role})`}
                    </li>
                ))}
            </ul>
            {currentUserResolution && (
                <button
                    style={styles.confirmButton}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the card's onClick
                        handleConfirmTransaction();
                    }}
                >
                    {allResolved ? "Cancel confirmation" : "Confirm transaction"}
                </button>
            )}
            {currentUserRole === "landlord" && (
                <button
                    style={styles.deleteButton}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the card's onClick
                        if (onDelete) {
                            onDelete(transaction.id);
                        }
                    }}
                >
                    X
                </button>
            )}
        </div>
    );
};

TransactionCard.propTypes = {
    transaction: PropTypes.shape({
        type: PropTypes.string.isRequired,
        amount: PropTypes.number.isRequired,
        due_date: PropTypes.string.isRequired,
        payee_role: PropTypes.string.isRequired,
        is_visible_to_tenants: PropTypes.bool.isRequired,
    }).isRequired,
    onClick: PropTypes.func,
    onDelete: PropTypes.func, // Add onDelete prop
};

const styles = {
    card: {
        border: '1px solid #ccc',
        borderRadius: '8px',
        position: 'relative',
        padding: '16px',
        margin: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'default',
        transition: 'background-color 0.3s ease',
    },
    cardHover: {
        backgroundColor: '#e0e0e0',
    },
    title: {
        margin: '0 0 8px',
        fontSize: '1.5rem',
        color: '#333',
    },
    content: {
        margin: '4px 0',
        color: '#555',
    },
    list: {
        padding: '0',
        listStyleType: 'none',
    },
    listItem: {
        margin: '4px 0',
        display: 'flex',
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: 'yellow',
        color: 'black',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '8px',
    },
    deleteButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'red',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default TransactionCard;
