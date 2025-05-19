import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropertyCard from './PropertyCard'; // Corrected path
import PropertyForm from './PropertyForm'; // Import PropertyForm
import { useNavigate } from 'react-router-dom';

const PropertyList = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddPropertyForm, setShowAddPropertyForm] = useState(false); // State to toggle form visibility
    const navigate = useNavigate();

    const handlePropertyClick = (property) => {
        navigate(`/PropertyPanel/${property.id}`);
    };

    const handlePropertyAdded = (newProperty) => {
        setProperties((prevProperties) => [...prevProperties, newProperty]);
        setShowAddPropertyForm(false); // Hide form after submission
    };

    const handleDeleteProperty = async (propertyId) => {
        const confirmDeletion = window.confirm('Are you sure you want to delete this property?');
        if (!confirmDeletion) return;

        try {
            await axios.delete(`http://localhost:8000/delete-property/${propertyId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert('Property deleted successfully!');
            setProperties((prevProperties) => prevProperties.filter((property) => property.id !== propertyId));
        } catch (error) {
            console.error('Error deleting property:', error);
            alert(error.response?.data?.detail || 'Failed to delete property. Please try again.');
        }
    };

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await axios.get('http://localhost:8000/rental-properties', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setProperties(response.data);
            } catch (err) {
                if (err.response.status === 401) {
                    setError('Unauthorized access. Please log in again.');
                } else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, []);

    if (loading) {
        return <p>Loading properties...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div style={{ paddingLeft: '1rem', paddingRight: '1rem',}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                <h2>Properties</h2>
                <button
                    style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px', fontSize: '1rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    onClick={() => setShowAddPropertyForm(!showAddPropertyForm)}
                >
                    {showAddPropertyForm ? 'Cancel' : 'Add Property'}
                </button>
            </div>
            {showAddPropertyForm && <PropertyForm onPropertyAdded={handlePropertyAdded} />}
            {properties.map((property) => (
                <PropertyCard
                    key={property.id}
                    name={property.name}
                    location={property.location}
                    description={property.description || 'No description available'}
                    onClick={() => handlePropertyClick(property)}
                    onDelete={() => handleDeleteProperty(property.id)} // Pass delete handler
                />
            ))}
        </div>
    );
};

export default PropertyList;
