import React, { Component } from 'react';
import { HiArrowLeftOnRectangle, HiUsers } from 'react-icons/hi2';
import { FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../css/style.css';
import { Link } from 'react-router-dom';

class DesktopNavbar extends Component {
  handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logout successful');
    window.location.href = '/login';
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
