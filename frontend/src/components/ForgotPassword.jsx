import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!email){
        toast.error("Please enter your email");
        return;
    }

    try{  
        const res = await axios.post("http://localhost:5000/api/forgot-password", email);

        //TODO
        setIsEmailSent(true);
        toast.success("Email sent successfully!");

    }catch (error){
        console.log(error);
        toast.error(`Something went wrong ${error}`)
    }finally{
        setIsEmailSent(true);
        setEmail("");
    }

  }

  return (
    <div className='d-flex align-items-center justify-content-center bg-dark-subtle  min-vw-100 min-vh-100'>
      <div className='container'>
        <div className='row'>
          <div className='col-md-4 offset-md-4'>
            <form onSubmit={handleSubmit} className='p-4 border rounded bg-white '>
              <h3 className='mb-4 text-center'>Forgot Password ?</h3>
              <div className='mb-3 text-start'>
                <label htmlFor='email' className='form-label'>
                  Email
                </label>
                <input
                  type='email'
                  className='form-control'
                  id='email'
                  placeholder='Enter your email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type='submit' className='btn btn-primary' disabled={isEmailSent}>
                Submit
              </button>
              {isEmailSent && (
                <p className="mt-3 text-success">An email was sent successfully!</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
