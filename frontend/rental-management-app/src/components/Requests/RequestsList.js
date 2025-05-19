import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RequestCard from './RequestCard';
import RequestForm from './RequestForm';
import { useNavigate } from 'react-router-dom';

const RequestsList = () => {
    const propertyId = window.location.pathname.split('/').pop();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddRequestForm, setShowAddRequestForm] = useState(false);
    const [editRequestId, setEditRequestId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
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
                } else if (err.response?.status === 404) {
                    setError('No requests found for this property.');
                } else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [propertyId]);

    const handleRequestAdded = (newRequest) => {
        setRequests((prev) => [...prev, newRequest]);
        setShowAddRequestForm(false);
    };

    const handleRequestUpdated = (updatedRequest) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
        );
        setEditRequestId(null);
    };

    const handleDeleteRequest = async (requestId) => {
        if (!window.confirm("Are you sure you want to delete this request?")) return;
        try {
            await axios.delete(
                `http://localhost:8000/delete-tenant-request/${requestId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to delete request.");
        }
    };

    const currentUserRole = localStorage.getItem('role');

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p><strong>Requests:</strong></p>
                {currentUserRole === "tenant" && (
                    <button
                        style={{
                            backgroundColor: 'green',
                            color: 'white',
                            padding: '10px 20px',
                            fontSize: '1.2rem',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            setShowAddRequestForm(!showAddRequestForm);
                            setEditRequestId(null);
                        }}
                    >
                        +
                    </button>
                )}
            </div>
            {loading ? (
                <p>Loading requests...</p>
            ) : error && error !== 'No requests found for this property.' ? (
                <p>Error: {error}</p>
            ) : showAddRequestForm ? (
                <RequestForm
                    propertyId={propertyId}
                    mode="add"
                    onRequestAdded={handleRequestAdded}
                />
            ) : editRequestId ? (
                <RequestForm
                    propertyId={propertyId}
                    requestId={editRequestId}
                    mode="edit"
                    onRequestUpdated={handleRequestUpdated}
                />
            ) : (
                requests.map((request) => (
                    <RequestCard
                        key={request.id}
                        request={request}
                        onClick={() => setEditRequestId(request.id)}
                        onDelete={() => handleDeleteRequest(request.id)}
                    />
                ))
            )}
        </div>
    );
};

export default RequestsList;
