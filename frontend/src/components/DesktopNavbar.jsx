import React, { Component } from 'react';
import { HiArrowLeftOnRectangle, HiUsers } from 'react-icons/hi2';
import { FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../css/style.css';
import { Link } from 'react-router-dom';

class DesktopNavbar extends Component {
  // handleLogout = () => {
  //   localStorage.removeItem('token');
  //   toast.success('Logout successful');
  //   window.location.href = '/login';
  // };
  handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You are not logged in!');
        window.location.href = '/login';
        return;
      }
  
      // Call the backend logout API
      const response = await fetch('http://localhost:8000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Send token for authentication
        },
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // ✅ Successfully logged out on the backend
        localStorage.removeItem('token');
        toast.success(data.message || 'Logout successful');
        window.location.href = '/login';
        console.log("logout response : ", data);
      } else {
        toast.error(data.message || 'Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Something went wrong. Try again!');
    }
  };
  

  render() {
    return (
      <div className=' position-fixed h-100'>
        <div className='d-flex flex-column align-items-center  justify-content-center'>
          <div className='pt-4 active'>
            <HiUsers size={35} />
          </div>
          <div
            className='pt-4 active'
            style={{ cursor: 'pointer' }}
            onClick={this.handleLogout}
          >
             <HiArrowLeftOnRectangle
              size={35}
              className='text-secondary'
            />
          </div>
        </div>

        <Link
          to='/profile'
          className='position-absolute bottom-0 d-flex align-items-center justify-content-center  '
          style={{
            marginBottom: '2rem',
            cursor: 'pointer',
            marginLeft: '0rem',
          }}
        >
          <div className='bg-secondary rounded-circle p-lg-2 p-md-2'>
            <FaUser size={35} className='text-white' />
            <div className='bg-success rounded-circle online-dot'></div>
          </div>
        </Link>
      </div>
    );
  }
}

export default DesktopNavbar;
