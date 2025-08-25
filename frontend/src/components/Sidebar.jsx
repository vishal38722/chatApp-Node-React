import React, { useEffect, useState } from 'react';
// import { users } from '../utils/constants'
import UserItem from './UserItem'
import { IoIosSearch } from "react-icons/io";
import '../css/style.css';
import DesktopNavbar from './DesktopNavbar';
import MobileFooter from './MobileFooter';
import Loader from './Loader';

const Sidebar = ({ users, onUserClick, selectedUser, loading, onlineUsers }) => {

  const [searchText, setSearchText] = useState('');

  const allUsers = users.filter((user) => {
    return user.firstName.toLowerCase().includes(searchText.toLowerCase()) || user.lastName.toLowerCase().includes(searchText.toLowerCase());
  });

  // Sort users: online users first, then offline
  const sortedUsers = allUsers.sort((a, b) => {
    const aOnline = onlineUsers?.has(a.id);
    const bOnline = onlineUsers?.has(b.id);
    
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  if(loading) return <Loader />

  return (
    <div className='d-flex flex-row'>
      <div className=' col-lg-2 d-none d-md-flex col-md-2  '>
        <DesktopNavbar />
      </div>
      <div className={`sidebar-container ${selectedUser ? 'd-none d-md-inline ' : 'col-12'} col-lg-10 col-md-10 ml-md-3`} style={{ maxHeight: '99vh', overflowY: 'auto'}}>
        {/* Search bar */}
        <div className='d-flex w-100 align-items-center mt-1'>
          <input 
            type="text" 
            className="form-control" 
            onChange={(e) => setSearchText(e.target.value)} 
            placeholder="Search or start a new chat" 
            value={searchText}
          />
          <IoIosSearch size={20} className=" col-1 mb-3" />
        </div>
        
        {/* Online users count */}
        {onlineUsers && (
          <div className="px-3 py-2">
            <small className="text-muted">
              {users.length} contacts • {onlineUsers.size-1} online
            </small>
          </div>
        )}
        
        <div>
          {allUsers.map((user) => (
            <UserItem 
              user={user} 
              onUserClick={onUserClick} 
              key={user.id}
              isOnline={onlineUsers?.has(user.id)} // Pass online status to UserItem
              selectedUser={selectedUser}
            />
          ))}
        </div>
        <MobileFooter />
      </div>
    </div>
  );
};

export default Sidebar;