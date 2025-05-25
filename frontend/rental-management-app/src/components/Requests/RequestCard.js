import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const RequestCard = ({ request, onClick, onDelete }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [resolutions, setResolutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [forceUpdate, setForceUpdate] = useState(false);

    // Get current user id and role from localStorage
    const currentUserId = Number(localStorage.getItem('user_id'));
    const currentUserRole = localStorage.getItem('role');

    // Fetch request resolutions
    useEffect(() => {
        const fetchResolutions = async () => {
            try {
                const response = await fetch(`http://localhost:8000/request-resolutions/${request.id}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                const data = await response.json();
                setResolutions(data);
            } catch (error) {
                console.error('Error fetching resolutions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResolutions();
    }, [request.id, forceUpdate]);

    // Determine card background color
    const determineCardColor = () => {
        if (loading) return '#fff'; // Default white while loading
        const allResolved = resolutions.every((res) => res.status === 'resolved');
        return allResolved ? '#ccffcc' : '#fff'; // light green if all resolved, otherwise white
    };

    const cardColor = determineCardColor();
    const hoverColor = isHovered ? (cardColor === '#ccffcc' ? '#b3e6b3' : '#e0e0e0') : cardColor;

    // Determine if all resolutions are resolved
    const allResolved = resolutions.every((res) => res.status === 'resolved');

    // Find the current user's resolution
    const currentUserResolution = resolutions.find((res) => res.user_id === currentUserId);

    const handleConfirmRequest = async () => {
        try {
            const response = await axios.put(`http://localhost:8000/resolve-tenant-request/${request.id}`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert(response.data.message || 'Request confirmed successfully!');
            setForceUpdate((prev) => !prev);
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
            title="Click to edit" // use browser tooltip
        >
            <h2 style={styles.title}>{request.title}</h2>
            <p style={styles.content}>
                <strong>Description:</strong> {request.description}
            </p>
            <p style={styles.content}>
                <strong>Request Date:</strong> {request.request_date}
            </p>
            {resolutions.every((res) => res.status === 'resolved') && (
                <p style={styles.content}><strong>Status:</strong> Done</p>
            )}
            <p style={styles.content}>
                <strong>Confirmed by:</strong>
            </p>
            <ul style={styles.list}>
                {resolutions.map((resolution) => (
                    <li key={resolution.id} style={styles.listItem}>
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
                        e.stopPropagation();
                        handleConfirmRequest();
                    }}
                >
                    {allResolved ? "Cancel resolvement" : "Resolve request"}
                </button>
            )}
            {currentUserRole === "tenant" && (
                <button
                    style={styles.deleteButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) {
                            onDelete(request.id);
                        }
                    }}
                >
                    X
                </button>
            )}
        </div>
    );
};

RequestCard.propTypes = {
    request: PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        request_date: PropTypes.string.isRequired,
    }).isRequired,
    onClick: PropTypes.func,
    onDelete: PropTypes.func,
};

const styles = {
    card: {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        margin: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'default',
        transition: 'background-color 0.3s ease',
        position: 'relative',
    },
    title: {
        margin: '0 0 8px',
        marginTop: '25px',
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

export default RequestCard;
