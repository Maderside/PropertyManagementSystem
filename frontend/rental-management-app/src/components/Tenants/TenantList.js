import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TenantCard from './TenantCard'; // Corrected path


const TenantList = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddTenantForm, setShowAddTenantForm] = useState(false);
    const [newTenantEmail, setNewTenantEmail] = useState('');

    const handleTenantClick = (tenant) => {
        // navigate(`/TenantPanel/${tenant.id}`);
    };

    const handleRemoveTenant = async (tenant) => {
        const confirmRemoval = window.confirm(`Are you sure you want to remove ${tenant.name}?`);
        if (!confirmRemoval) {
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:8000/remove-tenant-from-property/${propertyId}/${tenant.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert(response.data.message);
            setTenants(tenants.filter((t) => t.id !== tenant.id)); // Update the tenant list
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Unauthorized access. Please log in again.');
            } else {
                alert(`Error: ${err.response?.data?.detail || err.message}`);
            }
        }
    };

    const handleAddTenant = async () => {
        try {
            const response = await axios.post(`http://localhost:8000/add-tenant-to-property/${propertyId}/${newTenantEmail}`,{}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            alert("New tenant added successfully!");
            setNewTenantEmail('');
            setShowAddTenantForm(false);
            console.log(response);
            setTenants((prevTenants) => [...prevTenants, response.data]); // Update the tenant list with the new tenant
            // fetchTenants(); // Refresh the tenant list
        } catch (err) {
            console.log(localStorage.getItem('token'));
            console.log(err);
            alert(`Error: ${err.response?.data?.detail || err.message}`);
        }
    };

    const propertyId = window.location.pathname.split('/').pop(); // Get the property ID from the URL
    


    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/get-tenants-for-property/${propertyId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setTenants(response.data);
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
        fetchTenants();
    }, [propertyId]);

    if (loading) {
        return <p>Loading tenants...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p><strong>Tenants:</strong></p>
                <button
                    style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px', fontSize: '1.2rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    onClick={() => setShowAddTenantForm(!showAddTenantForm)}
                >
                     + 
                </button>
            </div>
            {showAddTenantForm && (
                <div style={{ marginTop: '10px' }}>
                    <input
                        type="email"
                        placeholder="Enter tenant email"
                        value={newTenantEmail}
                        onChange={(e) => setNewTenantEmail(e.target.value)}
                        style={{ padding: '5px', marginRight: '10px', width: '250px' }}
                    />
                    <button
                        onClick={handleAddTenant}
                        style={{ backgroundColor: 'blue', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Add tenant
                    </button>
                </div>
            )}
            {tenants.map((tenant) => (
                <TenantCard
                    key={tenant.id}
                    name={tenant.name}
                    email={tenant.email}
                    onClick={() => handleTenantClick(tenant)}
                    onRemove={() => handleRemoveTenant(tenant)}
                />
            ))}
        </div>
    );
};

export default TenantList;
