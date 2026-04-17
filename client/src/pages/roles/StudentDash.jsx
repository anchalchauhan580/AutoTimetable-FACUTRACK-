import React, {useEffect, useState} from 'react';
import { API, DAYS, SLOTS } from '../../constants';

export default function StudentDash({user}){
  const [timetable, setTimetable] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const token = localStorage.getItem('token');

  useEffect(()=>{
    fetch(API + '/timetable', {headers:{Authorization:'Bearer '+token}})
      .then(r=>r.json()).then(j=>setTimetable(j.data)).catch(()=>{});
  },[]);

  function submitFeedback(day, slot){
    const f = feedbacks[day] && feedbacks[day][slot];
    if(!f || !f.rating) return alert('Provide rating and comment');
    fetch(API + '/feedback', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},
      body: JSON.stringify({day, slot, rating:f.rating, comment:f.comment})
    }).then(r=>r.json()).then(j=>{
      if(j.ok) alert('Feedback submitted');
      else alert(j.error || 'Failed');
    }).catch(()=>alert('Error'));
  }

  if(!timetable) return <div className='card'>Loading...</div>;

  return (
    <div>
      <h2>Student Dashboard</h2>
      <div className='notice card'>Provide feedback for each class and view full weekly timetable.</div>

      <div style={{display:'flex',gap:12, marginTop:8}}>
        <div className='card' style={{flex:1}}>
          <h3>Feedback per class</h3>
          {DAYS.map(d=>(
            <div key={d} style={{marginBottom:8}}>
              <strong>{d}</strong>
              {timetable.table[d].map((cell,idx)=>(
                <div key={idx} style={{display:'flex',gap:8,alignItems:'center',marginTop:6,fontSize:13}}>
                  <div style={{width:210}}>{cell.time} • {cell.subject} ({cell.teacher}) [{cell.room}]</div>
                  <input className='input' placeholder='comment'
                    value={(feedbacks[d]?.[idx]?.comment)||''}
                    onChange={e=>setFeedbacks(prev=>({
                      ...prev,
                      [d]:{...(prev[d]||{}), [idx]:{...(prev[d]?.[idx]||{}), comment:e.target.value}}
                    }))}
                  />
                  <select
                    value={(feedbacks[d]?.[idx]?.rating)||0}
                    onChange={e=>setFeedbacks(prev=>({
                      ...prev,
                      [d]:{...(prev[d]||{}), [idx]:{...(prev[d]?.[idx]||{}), rating:Number(e.target.value)}}
                    }))}
                  >
                    <option value={0}>Rate</option>
                    {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                  <button className='btn sm' onClick={()=>submitFeedback(d,idx)}>Send</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className='card' style={{width:320}}>
          <h3>Attendance</h3>
          <p style={{fontSize:13}}>Attendance API is present on backend; UI can be extended to show charts and percentages.</p>
        </div>
      </div>

      <div style={{marginTop:12}} className='card'>
        <h3>Weekly Timetable</h3>
        <div className='grid'>
          <div className='cell head'>Time / Day</div>
          {DAYS.map(d=> <div key={d} className='cell head'>{d}</div>)}
          {SLOTS.map((slot,si)=>(
            <React.Fragment key={si}>
              <div className='cell head'>{slot}</div>
              {DAYS.map(d=>{
                const c = timetable.table[d][si];
                return (
                  <div key={d+si} className='cell'>
                    <div><strong>{c.subject}</strong></div>
                    <div style={{fontSize:12}}>{c.teacher} • {c.room}</div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
