import React from 'react';
import { parseISO, format } from 'date-fns';
import { FaUser } from 'react-icons/fa';

const MessageBox = ({ data, selectedUser }) => {
  const isOwn = (data.sender._id === selectedUser.id) ? 0 : 1;

  const container = `d-flex ${isOwn ? 'justify-content-end' : ''} p-3`;
  const avatar = isOwn ? 'order-2' : '';
  const body = `d-flex flex-column gap-2 ${isOwn ? 'align-items-end' : ''}`;
  const message = `fs-6 overflow-hidden ${
    isOwn
      ? 'bg-info text-white rounded-5 py-2 px-3'
      : 'bg-success-subtle text-white rounded-5 py-2 px-3'
  }`;

  return (
    <div className={container}>
      <div className="d-flex align-items-center  gap-2">
        <div className={avatar}>
          <span>
            <FaUser size={35} />
          </span>
        </div>
        <div className={body}>
          <div className={message}>
            <div className="fs-5 text-black">{data.content}</div>
          </div>
          <div className="d-flex align-items-center gap-1">
            <div className="fs-6 text-black">{isOwn?"You":`${selectedUser.firstName} ${selectedUser.lastName}`}</div>
            {data.createdAt && (
              <div className="fs-6 text-black-50 ">
                {format(parseISO(data.createdAt), 'h:mm a')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
