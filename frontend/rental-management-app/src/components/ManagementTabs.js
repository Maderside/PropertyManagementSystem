import React, { useState } from 'react';
import TenantList from './Tenants/TenantList';
import ResponsibilitiesList from './Responsibilities/ResponsibilitiesList';
import TransactionsList from './Transactions/TransactionsList';
import RequestsList from './Requests/RequestsList';
import AnnouncementsList from './Announcements/AnnouncementsList';

const ManagementTabs = () => {
  const [activeTab, setActiveTab] = useState('Tenants');

  const renderContent = () => {
    switch (activeTab) {
      case 'Tenants':
        return <TenantList />;
      case 'Responsibilities':
        return <ResponsibilitiesList />;
      case 'Payments':
        return <TransactionsList />;
      case 'Announcements':
        return <AnnouncementsList />;
      case 'Tenant requests':
        return <RequestsList/>; 
      default:
        return null;
    }
  };

  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      width: '80vw',
      minWidth: '20vw',
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    tabs: {
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: '#f9f9f9',
      borderBottom: '1px solid #ddd',
      overflowX: 'auto', // Enable horizontal scrolling for small screens
      whiteSpace: 'nowrap', // Prevent tabs from wrapping
    },
    tab: {
      flex: 1, // Make tabs fill all available space
      padding: '10px',
      textAlign: 'center',
      cursor: 'pointer',
      fontWeight: 'bold',
      color: '#555',
      transition: 'background-color 0.3s, color 0.3s',
    },
    activeTab: {
      backgroundColor: '#007BFF',
      color: '#fff',
    },
    content: {
      padding: '20px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {['Tenants', 'Responsibilities', 'Payments', 'Tenant requests', 'Announcements'].map((tab) => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={styles.content}>{renderContent()}</div>
    </div>
  );
};

export default ManagementTabs;
