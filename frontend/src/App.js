import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import {Toaster} from "react-hot-toast";
import Home from './components/Home';
import ForgotPassword from './components/ForgotPassword';
import Error404 from './components/Error404';
import SignUp from './components/SignUp';
import Login from './components/Login';
import RessetPassword from './components/ResetPassword';
import UserProfile, {UserProfileFB} from './components/UserProfile';


function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster />
        <Routes>
          <Route path='/' element={<Home />}/>
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/login' element={<Login />} />
          <Route path='/forgot-password/:token' element={<RessetPassword />} />
          <Route path='/profile' element={<UserProfileFB />} />
          <Route path='*' element={<Error404 />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

// Sidebar - fetch all users
// message schema (sender{email, name}, receiver{email, name}, message, timestamp)
// on click of a user the props will be passed to the chatbox component
// chatbox component will fetch all the messages between the two users (useEffect)
// pass the name and email in header component
// user info(edit profile) page/modal where user can update name, email or password
// webSocket integration