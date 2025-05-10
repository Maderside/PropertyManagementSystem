import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ManagementTabs from '../components/ManagementTabs';

const PropertyPanel = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [property, setProperty] = useState();


    const fetchPropertyDetails = async () => {
        try {
            const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL
            const response = await axios.get(`http://localhost:8000/property/${propertyId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setProperty(response.data);
        } catch (err) {
            if (err.response.status === 401) {
                setError('Unauthorized access. Please log in again.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPropertyDetails();
    }, []);

    return (
        <div>
            {loading && <div>Loading...</div>}
            {error && <div>Error: {error}</div>}
            {!loading && !error && !property && <div>No property details available.</div>}
            {!loading && !error && property && (
                <div>
                    <h1 >{property.name}</h1>
                    <p>{property.description}</p>
                    <p><strong>Location:</strong> {property.location}</p>
                    <ManagementTabs />
                </div>
            )}
        </div>
    );
};

export default PropertyPanel;