import { useState } from 'react';
import UserSearch from './UserSearch.jsx';
import ContactsList from './ContactsList.jsx';
import RequestsList from './RequestsList.jsx';
import { FaUsers, FaSearch, FaChevronLeft, FaInbox } from 'react-icons/fa';
import { useUser } from '../context/UserContext.jsx';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('contacts');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { receivedRequests } = useUser();

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Backdrop — tapping it closes the sidebar on mobile */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile toggle button */}
      <button
        type="button"
        className={`sidebar-toggle ${isMobileOpen ? 'open' : ''}`}
        onClick={toggleMobileSidebar}
        aria-label={isMobileOpen ? 'Close contacts sidebar' : 'Open contacts sidebar'}
        title={isMobileOpen ? 'Close contacts sidebar' : 'Open contacts sidebar'}
      >
        {isMobileOpen ? <FaChevronLeft className="sidebar-toggle-icon" /> : <FaUsers className="sidebar-toggle-icon" />}
      </button>

      <div className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <FaUsers className="sidebar-tab-icon" /> Contacts
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <FaSearch className="sidebar-tab-icon" /> Search
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <span className="sidebar-tab-icon-wrap">
              <FaInbox className="sidebar-tab-icon" />
              {receivedRequests.length > 0 && (
                <span className="sidebar-tab-badge">{receivedRequests.length}</span>
              )}
            </span>
            Requests
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'contacts' && <ContactsList onSelect={() => setIsMobileOpen(false)} />}
          {activeTab === 'search' && <UserSearch />}
          {activeTab === 'requests' && <RequestsList />}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
