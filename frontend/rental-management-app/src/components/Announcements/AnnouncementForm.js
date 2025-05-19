import React, { useState, useEffect } from 'react';
import axios from 'axios';

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    form: {
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '80vw',
        minWidth: '20vw',
    },
    formGroup: {
        marginBottom: '15px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '16px',
    },
    button: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
    },
};

const AnnouncementForm = ({ propertyId, announcementId, mode, onAnnouncementAdded, onAnnouncementUpdated }) => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
    });

    useEffect(() => {
        const fetchAnnouncement = async () => {
            if (mode === 'edit' && announcementId) {
                try {
                    const response = await axios.get(`http://localhost:8000/announcements/${propertyId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    const announcement = response.data.find((a) => a.id === announcementId);
                    if (announcement) {
                        setFormData({
                            title: announcement.title,
                            message: announcement.message,
                        });
                    }
                } catch (error) {
                    console.error('Error fetching announcement:', error);
                }
            }
        };

        fetchAnnouncement();
    }, [propertyId, announcementId, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (mode === 'add') {
                const response = await axios.post(
                    `http://localhost:8000/add-announcement/${propertyId}`,
                    formData,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                alert('Announcement added successfully!');
                setFormData({ title: '', message: '' });
                if (onAnnouncementAdded) onAnnouncementAdded(response.data);
            } else if (mode === 'edit') {
                const response = await axios.put(
                    `http://localhost:8000/update-announcement/${announcementId}`,
                    formData,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                alert('Announcement updated successfully!');
                if (onAnnouncementUpdated) onAnnouncementUpdated(response.data);
            }
        } catch (error) {
            console.error('Error submitting announcement:', error);
            alert(error.response?.data?.detail || 'Failed to submit announcement. Please try again.');
        }
    };

    return (
        <div style={styles.container}>
            <form style={styles.form} onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Title:</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Message:</label>
                    <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        style={{ ...styles.input, height: '100px' }}
                    />
                </div>
                <button type="submit" style={styles.button}>
                    {mode === 'add' ? 'Add Announcement' : 'Update Announcement'}
                </button>
            </form>
        </div>
    );
};

export default AnnouncementForm;
