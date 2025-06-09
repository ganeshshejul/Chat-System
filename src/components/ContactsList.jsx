import { useUser } from '../context/UserContext.jsx';
import { FaUserFriends, FaTrash, FaComments, FaBell } from 'react-icons/fa';
import { useEffect } from 'react';

const ContactsList = () => {
  const { contacts, removeContact, setActiveChat, activeChat, unreadMessages } = useUser();

  // Debug unread messages when they change
  useEffect(() => {
    console.log("Unread messages changed:", unreadMessages);

    // Log each contact's unread count
    if (contacts.length > 0 && unreadMessages) {
      contacts.forEach(contact => {
        const count = unreadMessages[contact.uid] || 0;
        console.log(`Contact ${contact.displayName} (${contact.uid}) has ${count} unread messages`);
      });
    }
  }, [unreadMessages, contacts]);

  const handleRemoveContact = async (contactId, e) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    await removeContact(contactId);

    // If the removed contact is the active chat, clear the active chat
    if (activeChat && activeChat.uid === contactId) {
      setActiveChat(null);
    }
  };

  const handleSelectChat = (contact) => {
    console.log(`Selecting chat with ${contact.displayName}, unread messages: ${unreadMessages[contact.uid] || 0}`);
    setActiveChat(contact);
  };

  return (
    <div className="contacts-list">
      <h3 className="contacts-title">
        <FaUserFriends /> Contacts
      </h3>

      {contacts.length === 0 ? (
        <div className="contacts-empty">
          <p>No contacts yet</p>
          <p className="contacts-empty-hint">Search for users to add them as contacts</p>
        </div>
      ) : (
        <ul className="contacts-items">
          {contacts.map(contact => (
            <li
              key={contact.uid}
              className={`contact-item ${activeChat && activeChat.uid === contact.uid ? 'active' : ''}`}
              onClick={() => handleSelectChat(contact)}
            >
              <div className="contact-info">
                <div className="contact-name">
                  {contact.displayName}
                </div>
                <div className="contact-email">{contact.email}</div>
              </div>
              <div className="contact-actions">
                <button
                  className={`contact-chat-btn ${unreadMessages && unreadMessages[contact.uid] > 0 ? 'has-unread' : ''}`}
                  title="Chat with this contact"
                  aria-label="Chat with this contact"
                  onClick={() => handleSelectChat(contact)}
                >
                  {unreadMessages && unreadMessages[contact.uid] > 0 ? (
                    <FaBell className="contact-btn-icon notification-icon" />
                  ) : (
                    <FaComments className="contact-btn-icon" />
                  )}
                </button>
                <button
                  className="contact-remove-btn"
                  title="Remove contact"
                  aria-label="Remove contact"
                  onClick={(e) => handleRemoveContact(contact.uid, e)}
                >
                  <FaTrash className="contact-btn-icon" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactsList;
