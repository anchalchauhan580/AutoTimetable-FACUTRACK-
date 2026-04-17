import React, {useEffect, useState} from 'react';
import { DAYS, SLOTS, API } from '../constants';
import io from 'socket.io-client';

const socket = io(API);

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

export default function HodTimetable({editable=true, facultyFilter=null, semFilter=null}){
  const [timetable, setTimetable] = useState(null);
  const [msg, setMsg] = useState('');
  const [dragItem, setDragItem] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(()=>{
    fetch(API + '/timetable', {headers:{Authorization:'Bearer '+token}})
      .then(r=>r.json()).then(j=>setTimetable(j.data)).catch(()=>setMsg('Failed to load timetable'));
    socket.emit('join');
    socket.on('timetable:update', data=>setTimetable(data));
    socket.on('timetable:error', e=>setMsg(e.reason || 'Error'));
    return ()=>{ socket.off('timetable:update'); socket.off('timetable:error'); };
  },[]);

  function save(newTt){
    socket.emit('timetable:update', newTt);
    fetch(API + '/timetable', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},
      body: JSON.stringify(newTt)
    }).then(r=>r.json()).then(j=>{
      if(j.error) setMsg(j.error); else setMsg('Saved');
    }).catch(()=>setMsg('Save failed'));
  }

  function onDragStart(e, day, idx){
    if(!editable || facultyFilter) return;
    setDragItem({day, idx});
    e.dataTransfer.setData('text/plain', JSON.stringify({day, idx}));
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e){
    if(!editable || facultyFilter) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, targetDay, targetIdx){
    if(!editable || facultyFilter) return;
    e.preventDefault();
    let src = dragItem;
    try{
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if(data.day) src = data;
    }catch(err){}
    if(!src) return;
    if(src.day===targetDay && src.idx===targetIdx){ setMsg('No change'); return; }

    const newTt = clone(timetable);
    const moving = newTt.table[src.day][src.idx];
    const target = newTt.table[targetDay][targetIdx];

    if(target && target.subject){
      setMsg('Conflict: target slot occupied');
      return;
    }
    for(const d of DAYS){
      const c = newTt.table[d][targetIdx];
      if(c && c.subject){
        if(c.teacher && moving.teacher && c.teacher === moving.teacher && !(d===src.day && targetIdx===src.idx)){
          setMsg('Conflict: teacher already has class at that time');
          return;
        }
        if(c.room && moving.room && c.room === moving.room && !(d===src.day && targetIdx===src.idx)){
          setMsg('Conflict: room already occupied at that time');
          return;
        }
      }
    }

    newTt.table[targetDay][targetIdx] = moving;
    newTt.table[src.day][src.idx] = {
      time: newTt.slots[src.idx],
      subject:'',
      teacher:'',
      room:'',
      type:'',
      duration:0,
      semester:moving.semester
    };
    setTimetable(newTt);
    setMsg('Moved — saving...');
    save(newTt);
  }

  if(!timetable) return <div className='card'>Loading timetable...</div>;

  return (
    <div>
      <div className='msg'>{msg}</div>
      <div className='grid'>
        <div className='cell head'>Time / Day</div>
        {DAYS.map(d=> <div key={d} className='cell head'>{d}</div>)}
        {SLOTS.map((slot,si)=>(
          <React.Fragment key={si}>
            <div className='cell head'>{slot}</div>
            {DAYS.map(d=>{
              const c = timetable.table[d][si];
              const facultyOk = !facultyFilter || c.teacher === facultyFilter;
              const semOk = !semFilter || c.semester === semFilter;
              const show = c.subject && facultyOk && semOk;
              return (
                <div
                  key={d+si}
                  className='cell'
                  onDragOver={onDragOver}
                  onDrop={e=>onDrop(e,d,si)}
                >
                  {show ? (
                    <div
                      draggable={editable && !facultyFilter}
                      onDragStart={e=>onDragStart(e,d,si)}
                      className='card small'
                    >
                      <div><strong>{c.subject}</strong> {c.type==='Lab' && '(Lab)'}</div>
                      <div style={{fontSize:12}}>{c.teacher} • {c.room}</div>
                      <div style={{fontSize:11,opacity:0.8}}>Sem {c.semester} • {c.duration}h</div>
                    </div>
                  ) : (
                    <span style={{opacity:0.4,fontSize:11}}>—</span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
