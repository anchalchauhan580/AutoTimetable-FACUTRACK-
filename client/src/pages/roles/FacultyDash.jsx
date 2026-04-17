import React, {useEffect, useState} from 'react';
import { API } from '../../constants';
import io from 'socket.io-client';

const socket = io(API);

export default function FacultyDash({user}){
  const [timetable, setTimetable] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const token = localStorage.getItem('token');

  useEffect(()=>{
    fetch(API + '/timetable', {headers:{Authorization:'Bearer '+token}})
      .then(r=>r.json()).then(j=>setTimetable(j.data)).catch(()=>{});
    socket.emit('join');
    socket.on('chat:message', msg=>{
      setMessages(prev=>[...prev, msg]);
    });
    return ()=>{ socket.off('chat:message'); };
  },[]);

  function send(){
    if(!text) return;
    socket.emit('chat:message', {
      fromRole:'faculty',
      fromUser:user.username,
      toRole:'hod',
      text,
      ts:new Date().toISOString()
    });
    setText('');
  }

  if(!timetable) return <div className='card'>Loading...</div>;

  return (
    <div>
      <h2>Faculty Dashboard</h2>
      <div className='notice card'>View your weekly classes and chat with HOD.</div>
      <div style={{display:'flex',gap:12}}>
        <div className='card' style={{flex:1}}>
          <h3>Your Weekly Timetable</h3>
          <div className='grid'>
            <div className='cell head'>Time / Day</div>
            {timetable.days.map(d=> <div key={d} className='cell head'>{d}</div>)}
            {timetable.slots.map((slot,si)=>(
              <React.Fragment key={si}>
                <div className='cell head'>{slot}</div>
                {timetable.days.map(d=>{
                  const c = timetable.table[d][si];
                  const mine = c.teacher === user.username;
                  return (
                    <div key={d+si} className='cell'>
                      {mine ? (
                        <>
                          <div><strong>{c.subject}</strong> {c.type==='Lab' && '(Lab)'}</div>
                          <div style={{fontSize:12}}>{c.room}</div>
                          <div style={{fontSize:11,opacity:0.8}}>Sem {c.semester}</div>
                        </>
                      ) : <span style={{opacity:0.3,fontSize:11}}>—</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className='card' style={{width:320}}>
          <h3>Chat with HOD</h3>
          <div className='chat'>
            {messages.map((m,i)=>(
              <div key={i} className='chat-msg'>
                <span className='chat-from'>{m.fromRole}({m.fromUser}) ➜ {m.toRole}:</span>
                <span> {m.text}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:6,display:'flex',gap:6}}>
            <input className='input' value={text} onChange={e=>setText(e.target.value)} placeholder='Message to HOD' />
            <button className='btn sm' onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
