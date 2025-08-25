import React, { Component } from 'react';
import { HiArrowLeftOnRectangle, HiUsers } from 'react-icons/hi2';
import { FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../css/style.css';

class MobileFooter extends Component {
  handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logout successful');
    window.location.href = '/login';
  };

  render() {
    return (
      <div className='d-flex d-md-none bg-light flex-row position-fixed bottom-0 w-100 z-4 align-items-center justify-content-between p-4'>
        <div className='active'>
          <HiUsers size={35} />
        </div>
        <Link to='/profile'>
          <FaUser size={35} className='text-secondary' />
        </Link>
        <div onClick={this.handleLogout}>
          <HiArrowLeftOnRectangle size={35} className='text-secondary' />
        </div>
      </div>
    );
  }
}

export default MobileFooter;
