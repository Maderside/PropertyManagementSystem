import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RequestCard from './RequestCard'; // Corrected path
import { useNavigate } from 'react-router-dom';

const RequestsList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleRequestClick = (request) => {
        navigate(`/RequestDetails/${request.id}`);
    };

    useEffect(() => {
        const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL
        const fetchRequests = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/tenant-request/${propertyId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setRequests(response.data);
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

        fetchRequests();
    }, []);

    if (loading) {
        return <p>Loading requests...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div>
            <p><strong>Requests:</strong></p>
            {requests.map((request) => (
                <RequestCard
                    key={request.id}
                    request={request}
                    onClick={() => handleRequestClick(request)}
                />
            ))}
        </div>
    );
};

export default RequestsList;
