import React from 'react';
import Card from '../Card';

const AnnouncementCard = ({ announcement, onClick, onDelete }) => {
    return (
        <Card
            title={announcement.title}
            content={[
                { label: 'Message', value: announcement.message || 'N/A' },
                { label: 'Published', value: new Date(announcement.created_at).toLocaleString() || 'N/A' },
            ]}
            onClick={onClick}
            actions={[
                {
                    label: 'X',
                    onClick: (e) => {
                        e.stopPropagation(); // Prevent triggering the onClick event
                        onDelete();
                    },
                    style: {
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
                },
            ]}
        />
    );
};

export default AnnouncementCard;
