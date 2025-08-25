import React, { Component } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { Navigate } from "react-router-dom";
import Loader from './Loader';
import { jwtDecode } from 'jwt-decode';

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: {},
      old_password: '',
      new_password: '',
      changePassword: false,
      loading: false,
    };

    this.token = localStorage.getItem('token');
  }

  handleUpdatePassword = async (e) => {
    e.preventDefault();
    const { old_password, new_password } = this.state;

    if (!old_password || !new_password) {
      toast.error("Please fill all the fields");
      return;
    }

    if (new_password.length < 8) {
      toast.error("Password length should be greater than or equal to 8");
      return;
    }

    if (new_password.length > 12) {
      toast.error("Password length should be less than or equal to 12");
      return;
    }

    try {
      const body = { old_password, new_password };
      const res = await axios.post("http://localhost:8000/api/change-password/", body, {
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(res.status)
      toast.success("Password changed successfully");
      this.setState({ new_password: '', old_password: '', changePassword: false });
    } catch (error) {
      console.log(error);
      toast.error(`Something went wrong ${error}`);
    }
  };

  componentDidMount() {
    this.fetchUserData();
  }

  fetchUserData = async () => {
    try {
      const decoded = jwtDecode(this.token);
      const userId = decoded.userId;
      const response = await axios.get(`http://localhost:8000/api/user/profile/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.token}`
        }
      });

      const user = response.data.user;
      this.setState({ userInfo: user });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { userInfo, changePassword, old_password, new_password, loading } = this.state;

    if (!this.token) {
      return <Navigate to="/login" />;
    }

    if(loading){
      return (
        <Loader />
      )
    }

    return (
      <div className="container d-flex flex-column  justify-content-center align-items-center vh-100">
        {userInfo && 
        <div className="border p-4 rounded bg-light " style={{minWidth: "40%"}}>
          <Link to='/'>Back to ChatPage</Link>
          <h2 className="mb-4 text-center ">User Profile</h2>

          <div className="form-group">
            <label className='mb-1'>Full Name</label>
            <input type="text" className="form-control" value={`${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`} readOnly disabled  />
          </div>

          <div className="form-group">
            <label className='mb-1'>Email</label>
            <input type="email" className="form-control" value={userInfo?.email || ''} readOnly disabled  />
          </div>

          {!changePassword && 
            <button className='fs-6 btn mb-2 text-info-emphasis ' onClick={() => this.setState({ changePassword: true })}>
              Want to change password ?
            </button>}
        </div>}
        {changePassword && 
          <form className="border p-4 rounded bg-dark-subtle  mt-4" style={{minWidth: "40%"}}>
            <h2 className="mb-4 text-center ">Change Password</h2>
            <div className="form-group">
              <label className='mb-1'>Current Password</label>
              <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Enter current password"
                  value={old_password}
                  onChange={(e) => this.setState({ old_password: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className='mb-1'>New Password</label>
              <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Enter new password"
                  value={new_password}
                  onChange={(e) => this.setState({ new_password: e.target.value })}
              />
            </div>

            <button type="button" className="btn btn-primary" onClick={this.handleUpdatePassword}>
              Update Password
            </button>
          </form>
        }
      </div>
    );
  }
}

export function UserProfileFB(props){
  const navigate = useNavigate();
  return (<UserProfile navigate={navigate}></UserProfile>)
}

export default UserProfile;
