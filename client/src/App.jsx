import React, {useState} from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import Login from './pages/Login';
import DashboardWrapper from './pages/DashboardWrapper';

export default function App(){
  const [user, setUser] = useState(()=>{
    const t = localStorage.getItem('token');
    if(!t) return null;
    try{ return jwtDecode(t); }catch(e){ return null; }
  });
  const navigate = useNavigate();

  function onLogin(token){
    localStorage.setItem('token', token);
    const d = jwtDecode(token);
    setUser(d);
    navigate('/');
  }

  function logout(){
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  }

  return (
    <div className='app'>
      <header className='header card'>
        <div><strong>FACUTRACK</strong><span className='badge'>V2</span></div>
        <div>
          {user ? (
            <>
              <span style={{marginRight:8}}>Hi, {user.username} ({user.role})</span>
              <button className='btn sm' onClick={logout}>Logout</button>
            </>
          ) : <Link to='/login'>Login</Link>}
        </div>
      </header>

      <main style={{marginTop:12}}>
        <Routes>
          <Route path='/login' element={<Login onLogin={onLogin} />} />
          <Route path='/' element={<DashboardWrapper user={user} />} />
        </Routes>
      </main>
    </div>
  );
}
