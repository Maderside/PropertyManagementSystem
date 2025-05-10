import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementForm from './AnnouncementForm';

const AnnouncementsList = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddAnnouncementForm, setShowAddAnnouncementForm] = useState(false);
    const [editAnnouncementId, setEditAnnouncementId] = useState(null);

    const handleAnnouncementClick = (announcement) => {
        setEditAnnouncementId(announcement.id);
        setShowAddAnnouncementForm(false);
    };

    const handleAnnouncementAdded = (newAnnouncement) => {
        setAnnouncements((prevAnnouncements) => [...prevAnnouncements, newAnnouncement]);
        setShowAddAnnouncementForm(false);
    };

    const handleAnnouncementUpdated = (updatedAnnouncement) => {
        setAnnouncements((prevAnnouncements) =>
            prevAnnouncements.map((announcement) =>
                announcement.id === updatedAnnouncement.id ? updatedAnnouncement : announcement
            )
        );
        setEditAnnouncementId(null);
    };

    const handleDeleteAnnouncement = async (announcement) => {
        const confirmDeletion = window.confirm(`Are you sure you want to delete this announcement?`);
        if (!confirmDeletion) {
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:8000/delete-announcement/${announcement.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert(response.data.message);
            setAnnouncements((prevAnnouncements) => prevAnnouncements.filter((a) => a.id !== announcement.id));
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Unauthorized access. Please log in again.');
            } else {
                alert(`Error: ${err.response?.data?.detail || err.message}`);
            }
        }
    };

    useEffect(() => {
        const propertyId = window.location.pathname.split('/').pop();
        const fetchAnnouncements = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/announcements/${propertyId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setAnnouncements(response.data);
            } catch (err) {
                if (err.response?.status === 401) {
                    setError('Unauthorized access. Please log in again.');
                } else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p><strong>Announcements:</strong></p>
                <button
                    style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px', fontSize: '1.2rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    onClick={() => {
                        setShowAddAnnouncementForm(!showAddAnnouncementForm);
                        setEditAnnouncementId(null);
                    }}
                >
                    +
                </button>
            </div>
            {showAddAnnouncementForm ? (
                <AnnouncementForm
                    propertyId={window.location.pathname.split('/').pop()}
                    mode="add"
                    onAnnouncementAdded={handleAnnouncementAdded}
                />
            ) : editAnnouncementId ? (
                <AnnouncementForm
                    propertyId={window.location.pathname.split('/').pop()}
                    announcementId={editAnnouncementId}
                    mode="edit"
                    onAnnouncementUpdated={handleAnnouncementUpdated}
                />
            ) : loading ? (
                <p>Loading announcements...</p>
            ) : error && error !== 'Announcements not found' ? (
                <p>Error: {error}</p>
            ) : (
                announcements.map((announcement) => (
                    <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        onClick={() => handleAnnouncementClick(announcement)}
                        onDelete={() => handleDeleteAnnouncement(announcement)}
                    />
                ))
            )}
        </div>
    );
};

export default AnnouncementsList;
