import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const RequestCard = ({ request, onClick }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [resolutions, setResolutions] = useState([]);
    const [loading, setLoading] = useState(true); // Add loading state

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
                setLoading(false); // Set loading to false after fetch completes
            }
        };

        fetchResolutions();
    }, [request.id]);

    // Determine card background color
    const determineCardColor = () => {
        if (loading) return '#fff'; // Default white while loading
        const allResolved = resolutions.every((res) => res.status === 'resolved');
        return allResolved ? '#ccffcc' : '#fff'; // light green if all resolved, otherwise white
    };

    const cardColor = determineCardColor();
    const hoverColor = isHovered ? (cardColor === '#ccffcc' ? '#b3e6b3' : '#e0e0e0') : cardColor;

    if (loading) {
        return <div>Loading...</div>; // Show a loading indicator while fetching data
    }

    return (
        <div
            style={{ ...styles.card, backgroundColor: hoverColor }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
};

const styles = {
    card: {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        margin: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
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
};

export default RequestCard;
