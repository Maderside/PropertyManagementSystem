import React from 'react';
import Card from '../Card';

const PropertyCard = ({ name, location, description, onClick, onDelete }) => {
    const content = [
        { label: 'Location', value: location },
        { label: 'Description', value: description },
    ];

    return (
        <div style={styles.container}>
            <Card title={name} content={content} onClick={onClick} />
            <button
                style={styles.deleteButton}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card's onClick
                    if (onDelete) {
                        onDelete();
                    }
                }}
            >
                X
            </button>
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
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

export default PropertyCard;