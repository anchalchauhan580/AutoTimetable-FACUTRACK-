import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../constants';

export default function Login({onLogin}){
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [role,setRole] = useState('student');
  const [mode,setMode] = useState('login');
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    const url = API + (mode==='login' ? '/auth/login' : '/auth/register');
    const body = mode==='login' ? {username,password} : {username,password,role};
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const j = await res.json();
    if(!res.ok){ alert(j.error || 'Failed'); return; }
    onLogin(j.token);
    navigate('/');
  }

  return (
    <div className='card'>
      <h2>{mode==='login' ? 'Login' : 'Register'}</h2>
      <form className='form' onSubmit={submit}>
        <input className='input' value={username} onChange={e=>setUsername(e.target.value)} placeholder='username' />
        <input className='input' type='password' value={password} onChange={e=>setPassword(e.target.value)} placeholder='password' />
        {mode==='register' && (
          <select className='input' value={role} onChange={e=>setRole(e.target.value)}>
            <option value='student'>student</option>
            <option value='faculty'>faculty</option>
            <option value='hod'>hod</option>
            <option value='admin'>admin</option>
          </select>
        )}
        <div style={{display:'flex',gap:8}}>
          <button className='btn' type='submit'>{mode==='login' ? 'Login' : 'Register'}</button>
          <button type='button' className='btn sm' onClick={()=>setMode(mode==='login'?'register':'login')}>
            {mode==='login' ? 'Switch to Register' : 'Switch to Login'}
          </button>
        </div>
      </form>
      <p style={{marginTop:8,fontSize:13}}>
        Demo users: student1/student1, faculty1/faculty1, hod1/hod1, admin1/admin1
      </p>
    </div>
  );
}
