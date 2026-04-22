import { useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { FaCheck, FaTimes, FaInbox } from 'react-icons/fa';

const RequestsList = () => {
  const { receivedRequests, acceptContactRequest, declineContactRequest, setActiveChat } = useUser();
  const [processing, setProcessing] = useState({});

  const setBusy = (senderId, value) => {
    setProcessing((prev) => ({ ...prev, [senderId]: value }));
  };

  const handleAccept = async (request) => {
    setBusy(request.senderId, true);
    const accepted = await acceptContactRequest(request.senderId);
    if (accepted) {
      setActiveChat(request.sender);
    }
    setBusy(request.senderId, false);
  };

  const handleDecline = async (request) => {
    setBusy(request.senderId, true);
    await declineContactRequest(request.senderId);
    setBusy(request.senderId, false);
  };

  return (
    <div className="requests-list">
      <h3 className="requests-title">
        <FaInbox /> Requests
      </h3>

      {receivedRequests.length === 0 ? (
        <div className="requests-empty">
          <p>No new requests</p>
          <p className="requests-empty-hint">Incoming chat requests will appear here.</p>
        </div>
      ) : (
        <ul className="requests-items">
          {receivedRequests.map((request) => (
            <li key={request.senderId} className="request-item">
              <div className="request-info">
                <div className="request-name">{request.sender.displayName}</div>
                {request.sender.username && (
                  <div className="request-username">@{request.sender.username}</div>
                )}
                <div className="request-email">{request.sender.email}</div>
              </div>

              <div className="request-actions">
                <button
                  type="button"
                  className="request-accept-btn"
                  onClick={() => handleAccept(request)}
                  disabled={processing[request.senderId]}
                  title="Accept request"
                  aria-label="Accept request"
                >
                  <FaCheck className="request-action-icon" />
                </button>
                <button
                  type="button"
                  className="request-decline-btn"
                  onClick={() => handleDecline(request)}
                  disabled={processing[request.senderId]}
                  title="Decline request"
                  aria-label="Decline request"
                >
                  <FaTimes className="request-action-icon" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RequestsList;
