// Import necessary dependencies
import React, { useEffect, useState } from 'react';
import '../css/style.css'; 
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Login = () => {
  useEffect(() => {
    if(localStorage.getItem('token')){
      navigate('/')
    }
  }, [])
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData;
    try{
      const { data } = await axios.post('http://localhost:8000/api/auth/login/', {
        email,
        password,
      });
      localStorage.setItem('token', data.token);
      toast.success("Login Successful");
      navigate("/");
    }catch(error){
      console.log(error)
      toast.error(`Something went wrong! ${error?.response?.statusText}`);
    }
  };

  return (
    <div className="container">
      <div className="card pt-5">
        <h2 className="text-center">Login to your Account</h2>
        <form className="mt-3" onSubmit={handleSubmit}>
          <div className="">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="Enter email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className=" mt-3 btn btn-primary">
            Login
          </button>
          <div className="mt-2 d-flex justify-content-center">
            <span>
              Don't have an account? <Link to="/signup">SignUp</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
