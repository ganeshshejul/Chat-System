import { useState } from 'react';
import UserSearch from './UserSearch.jsx';
import ContactsList from './ContactsList.jsx';
import { FaUsers, FaSearch, FaChevronLeft } from 'react-icons/fa';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('contacts');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
        </div>

        <div className="sidebar-content">
          {activeTab === 'contacts' ? (
            <ContactsList />
          ) : (
            <UserSearch />
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
