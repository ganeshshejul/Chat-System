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
      {/* Mobile toggle button */}
      <button
        className={`sidebar-toggle ${isMobileOpen ? 'open' : ''}`}
        onClick={toggleMobileSidebar}
      >
        {isMobileOpen ? <FaChevronLeft /> : <FaUsers />}
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
            <FaSearch className="sidebar-tab-icon" /> Find Users
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
          {activeTab === 'contacts' && <ContactsList />}
          {activeTab === 'search' && <UserSearch />}
          {activeTab === 'requests' && <RequestsList />}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
