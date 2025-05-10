import React from 'react';
import Card from '../Card';

const TenantCard = ({ name, email, onClick, onRemove }) => {
    const content = [
        { label: 'Email', value: email },
    ];

    return (
        <div style={styles.container}>
            <Card title={"👤 "+name} content={content} onClick={onClick} />
            <button
                style={styles.removeButton}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card's onClick
                    if (onRemove) {
                        onRemove();
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
        // display: 'inline-block',
    },
    removeButton: {
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

export default TenantCard;