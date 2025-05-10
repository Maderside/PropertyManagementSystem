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

const ResponsibilitiesForm = ({ propertyId, responsibilityId, mode, onResponsibilityAdded, onResponsibilityUpdated }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
    });

    useEffect(() => {
        const fetchResponsibility = async () => {
            if (mode === 'edit' && responsibilityId) {
                try {
                    const response = await axios.get(`http://localhost:8000/responsibilities/${propertyId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    const responsibility = response.data.find((r) => r.id === responsibilityId);
                    if (responsibility) {
                        setFormData({
                            title: responsibility.title,
                            description: responsibility.description,
                            due_date: responsibility.due_date,
                        });
                    }
                } catch (error) {
                    console.error('Error fetching responsibility:', error);
                }
            }
        };

        fetchResponsibility();
    }, [propertyId, responsibilityId, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });

        if (name === "description") {
            e.target.style.height = "auto"; // Reset height to calculate new height
            e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height based on content
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (mode === 'add') {
                const response = await axios.post(
                    `http://localhost:8000/add-responsibility/${propertyId}`,
                    formData,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                alert('Responsibility added successfully!');
                setFormData({ title: '', description: '', due_date: '' });
                if (onResponsibilityAdded) onResponsibilityAdded(response.data);
            } else if (mode === 'edit') {
                const response = await axios.put(
                    `http://localhost:8000/update-responsibility/${responsibilityId}`,
                    formData,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                alert('Responsibility updated successfully!');
                if (onResponsibilityUpdated) onResponsibilityUpdated(response.data);
            }
        } catch (error) {
            console.error('Error submitting responsibility:', error);
            alert('Failed to submit responsibility. Please try again.');
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
                    <label style={styles.label}>Description:</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        style={{ ...styles.input, height: 'auto', resize: 'none' }} // Disable manual resizing
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Due Date:</label>
                    <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleChange}
                        style={styles.input}
                    />
                </div>
                <button type="submit" style={styles.button}>
                    {mode === 'add' ? 'Add Responsibility' : 'Update Responsibility'}
                </button>
            </form>
        </div>
    );
};

export default ResponsibilitiesForm;
