import React from 'react';
import StudentDash from './roles/StudentDash';
import FacultyDash from './roles/FacultyDash';
import HodDash from './roles/HodDash';
import AdminDash from './roles/AdminDash';

export default function DashboardWrapper({user}){
  if(!user) return <div className='card'>Please login to continue.</div>;
  if(user.role === 'student') return <StudentDash user={user} />;
  if(user.role === 'faculty') return <FacultyDash user={user} />;
  if(user.role === 'hod') return <HodDash user={user} />;
  if(user.role === 'admin') return <AdminDash user={user} />;
  return <div className='card'>Unknown role.</div>;
}
