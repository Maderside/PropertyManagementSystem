import React, { useState } from 'react';
import TenantList from './Tenants/TenantList';
import ResponsibilitiesList from './Responsibilities/ResponsibilitiesList';
import TransactionsList from './Transactions/TransactionsList';
import RequestsList from './Requests/RequestsList';
import AnnouncementsList from './Announcements/AnnouncementsList';

const ManagementTabs = () => {
  const [activeTab, setActiveTab] = useState('Tenants');
  const [forceListRender, setForceListRender] = useState(false); // State to force re-render of the list

  const renderContent = () => {
    switch (activeTab) {
      case 'Tenants':
        return <TenantList key={forceListRender ? 'force-tenants' : 'tenants'} />;
      case 'Responsibilities':
        return <ResponsibilitiesList key={forceListRender ? 'force-responsibilities' : 'responsibilities'} />;
      case 'Payments':
        return <TransactionsList key={forceListRender ? 'force-payments' : 'payments'} />;
      case 'Announcements':
        return <AnnouncementsList key={forceListRender ? 'force-announcements' : 'announcements'} />;
      case 'Tenant requests':
        return <RequestsList key={forceListRender ? 'force-requests' : 'requests'} />;
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
    backButton: {
      marginTop: '10px',
      padding: '10px 20px',
      backgroundColor: '#007BFF',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
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
            onClick={() => {
              setActiveTab(tab);
              setForceListRender(false); // Reset force render when switching tabs
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={styles.content}>
        {renderContent()}
        <button
          style={styles.backButton}
          onClick={() => setForceListRender((prev) => !prev)} // Toggle force render to re-render the list
        >
          ←
        </button>
      </div>
    </div>
  );
};

export default ManagementTabs;
