import React from 'react';

const MessageStatus = ({ status, timestamp, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return (
          <span className="message-status sent" title="Sent">
            ✓
          </span>
        );
      case 'delivered':
        return (
          <span className="message-status delivered" title="Delivered">
            ✓✓
          </span>
        );
      case 'read':
        return (
          <span className="message-status read" title="Read">
            ✓✓
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* <span className="timestamp">{timestamp }</span> */}
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;