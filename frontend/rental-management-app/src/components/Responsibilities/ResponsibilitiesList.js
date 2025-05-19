import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Card from '../Card';
import ResponsibilitiesForm from './ResponsibilitiesForm';

const ResponsibilitiesList = () => {
    const [responsibilities, setResponsibilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editResponsibilityId, setEditResponsibilityId] = useState(null);

    const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL



    const handleResponsibilityAdded = (newResponsibility) => {
        setResponsibilities((prev) => [...prev, newResponsibility]);
        setShowAddForm(false);
    };

    const handleResponsibilityUpdated = (updatedResponsibility) => {
        setResponsibilities((prev) =>
            prev.map((responsibility) =>
                responsibility.id === updatedResponsibility.id ? updatedResponsibility : responsibility
            )
        );
        setEditResponsibilityId(null);
    };

    const handleDeleteResponsibility = async (responsibilityId) => {
        const confirmDeletion = window.confirm('Are you sure you want to delete this responsibility?');
        if (!confirmDeletion) return;

        try {
            await axios.delete(`http://localhost:8000/delete-responsibility/${responsibilityId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setResponsibilities((prev) => prev.filter((responsibility) => responsibility.id !== responsibilityId));
            alert('Responsibility deleted successfully!');
        } catch (err) {
            alert(`Error: ${err.response?.data?.detail || err.message}`);
        }
    };

    useEffect(() => {
        const fetchResponsibilities = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/responsibilities/${propertyId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setResponsibilities(response.data);
            } catch (err) {
                if (err.response?.status === 401) {
                    setError('Unauthorized access. Please log in again.');
                }
                if (err.response?.status === 404) {
                    setError('Responsibilities not found');
                }
                 else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchResponsibilities();
    }, [propertyId]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p><strong>Responsibilities:</strong></p>
                <button
                    style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px', fontSize: '1.2rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    onClick={() => {
                        setShowAddForm(!showAddForm);
                        setEditResponsibilityId(null);
                    }}
                >
                    +
                </button>
            </div>
            {showAddForm ? (
                <ResponsibilitiesForm
                    propertyId={propertyId}
                    mode="add"
                    onResponsibilityAdded={handleResponsibilityAdded}
                />
            ) : editResponsibilityId ? (
                <ResponsibilitiesForm
                    propertyId={propertyId}
                    responsibilityId={editResponsibilityId}
                    mode="edit"
                    onResponsibilityUpdated={handleResponsibilityUpdated}
                />
            ) : loading ? (
                <p>Loading responsibilities...</p>
            ) : error && error !== 'Responsibilities not found' ? (
                <p>Error: {error}</p>
            ) : (
                responsibilities.map((responsibility) => (
                    <Card
                        key={responsibility.id}
                        title={responsibility.title}
                        content={[
                            { label: 'Description', value: responsibility.description || 'N/A' },
                            { label: 'Due Date', value: responsibility.due_date || 'N/A' },
                        ]}
                        onClick={() => setEditResponsibilityId(responsibility.id)}
                        actions={[
                            {
                                label: 'X',
                                onClick: (e) => {
                                    e.stopPropagation(); // Prevent triggering the card's onClick
                                    handleDeleteResponsibility(responsibility.id);
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
                        tooltip="Click to edit"
                    />
                ))
            )}
        </div>
    );
};

export default ResponsibilitiesList;