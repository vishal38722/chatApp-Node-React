import React, { useState } from 'react'
import toast from 'react-hot-toast';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {

    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const {token} = useParams();

    const handleSubmit = async (e) => {

        e.preventDefault();

        if(!newPassword || !confirmPassword){
            toast.error("Please fill all the fields");
            return;
        }

        if(newPassword.length<8){
            toast.error("Password length should be greater than or equal to 8");
            return;
        }

        if(newPassword.length>12){
            toast.error("Password length should be less than or equal to 12");
            return;
        }

        if(newPassword!==confirmPassword){
            toast.error("Passwords do not match");
            return;
        }

        try{
            const body={token, newPassword}
            const res = await axios.post("http://localhost:5000/api/reset-password", body);

            //TODO

            toast.success("Password changed successfully");
            setNewPassword("");
            setConfirmPassword("");
            navigate("/login");
        } catch(error){
            console.log(error);
            toast.error(`Something went wrong ${error}`)
        }

    }

  return (
    <div className='d-flex align-items-center justify-content-center bg-dark-subtle  min-vw-100 min-vh-100'>
      <div className='container'>
        <div className='row'>
          <div className='m-5' style={{minWidth:"30vw"}}>
            <form onSubmit={handleSubmit} className='p-4 border rounded bg-white '>
              <h3 className='mb-4 text-center'>Reset Password</h3>
              <div className='mb-3 text-start'>
                <label htmlFor='newPassword' className='form-label'>
                    New Password
                </label>
                <input
                    type='password'
                    className='form-control'
                    id='newPassword'
                    placeholder='Enter your new password'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                </div>

                <div className='mb-3 text-start'>
                <label htmlFor='confirmPassword' className='form-label'>
                    Confirm Password
                </label>
                <input
                    type='password'
                    className='form-control'
                    id='confirmPassword'
                    placeholder='Confirm your new password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type='submit' className='btn btn-primary'>
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword