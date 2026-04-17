import React, {useEffect, useState} from 'react';
import { API, DAYS, SLOTS } from '../../constants';
import HodTimetable from '../../components/HodTimetable';
import io from 'socket.io-client';

const socket = io(API);

export default function AdminDash({user}){
  const token = localStorage.getItem('token');
  const [timetable, setTimetable] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [suggestDay, setSuggestDay] = useState('Mon');
  const [suggestSlot, setSuggestSlot] = useState(0);
  const [suggestList, setSuggestList] = useState([]);

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
      fromRole:'admin',
      fromUser:user.username,
      toRole:'hod',
      text,
      ts:new Date().toISOString()
    });
    setText('');
  }

  function computeSuggestions(){
    if(!timetable) return;
    const load = {};
    for(const d of timetable.days){
      timetable.table[d].forEach(c=>{
        if(c.teacher){
          load[c.teacher] = (load[c.teacher] || 0) + (c.duration || 1);
        }
      });
    }
    const teachers = new Set();
    for(const d of timetable.days){
      timetable.table[d].forEach(c=>{
        if(c.teacher) teachers.add(c.teacher);
      });
    }
    const candidates = [];
    teachers.forEach(t=>{
      let busy = false;
      for(const d of timetable.days){
        const c = timetable.table[d][suggestSlot];
        if(c.teacher === t){
          busy = true; break;
        }
      }
      if(!busy){
        candidates.push({teacher:t, load:load[t] || 0});
      }
    });
    candidates.sort((a,b)=>a.load-b.load);
    setSuggestList(candidates.slice(0,5));
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div className='notice card'>
        Admin can manage timetable, get smart faculty suggestions based on current load and availability, and chat with HOD.
      </div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <div className='card' style={{flex:1}}>
          <h3>Smart Faculty Suggestion</h3>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
            <label>Day:</label>
            <select value={suggestDay} onChange={e=>setSuggestDay(e.target.value)}>
              {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
            <label>Slot:</label>
            <select value={suggestSlot} onChange={e=>setSuggestSlot(Number(e.target.value))}>
              {SLOTS.map((s,i)=><option key={s} value={i}>{s}</option>)}
            </select>
            <button className='btn sm' onClick={computeSuggestions}>Suggest Faculty</button>
          </div>
          <div style={{fontSize:13}}>
            {suggestList.length===0 && <div>No suggestions yet. Click "Suggest Faculty".</div>}
            {suggestList.map((c,i)=>(
              <div key={i}>
                {i+1}. {c.teacher} — load: {c.load} hrs/week
              </div>
            ))}
          </div>
          <div style={{fontSize:11,opacity:0.8,marginTop:4}}>
            * Suggestions are based on current timetable load and free slot at selected time. Admin can then update timetable below using drag & drop.
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

      <div className='card'>
        <h3>Weekly Timetable (Admin – Editable)</h3>
        <HodTimetable editable={true} facultyFilter={null} semFilter={null} />
      </div>
    </div>
  );
}
