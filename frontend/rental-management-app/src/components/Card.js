import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ title, content, onClick, actions = [], tooltip }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={isHovered ? { ...styles.card, ...styles.cardHover } : styles.card}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={tooltip} // use browser tooltip
        >
            <h2 style={styles.title}>{title}</h2>
            {content.map((item, index) => (
                <p key={index} style={styles.content}>
                    <strong>{item.label}:</strong> {item.value}
                </p>
            ))}
            
            {actions.map((action, index) => (
                <button
                    key={index}
                    style={action.style}
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
};

Card.propTypes = {
    title: PropTypes.string.isRequired,
    content: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })
    ).isRequired,
    onClick: PropTypes.func,
    actions: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            onClick: PropTypes.func.isRequired,
            style: PropTypes.object,
        })
    ),
    tooltip: PropTypes.string,
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
        backgroundColor: '#fff',
        position: 'relative',
    },
    cardHover: {
        backgroundColor: '#e0e0e0',
    },
    title: {
        margin: '23px 0 8px',
        fontSize: '1.5rem',
        color: '#333',
    },
    content: {
        margin: '4px 0',
        color: '#555',
    },
    tooltip: {
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(40,40,40,0.95)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '0.95rem',
        pointerEvents: 'none',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxWidth: '220px',
        whiteSpace: 'pre-line',
    },
};

export default Card;