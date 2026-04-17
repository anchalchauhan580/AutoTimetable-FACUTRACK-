import React, {useEffect, useState} from 'react';
import { API } from '../../constants';
import HodTimetable from '../../components/HodTimetable';
import io from 'socket.io-client';

const socket = io(API);

export default function HodDash({user}){
  const token = localStorage.getItem('token');
  const [viewMode, setViewMode] = useState('semester'); // 'semester' or 'faculty'
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSem, setSelectedSem] = useState(1);
  const [facultyList, setFacultyList] = useState([]);
  const [perf, setPerf] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(()=>{
    fetch(API + '/timetable', {headers:{Authorization:'Bearer '+token}})
      .then(r=>r.json()).then(j=>{
        const t = j.data;
        const set = new Set();
        for(const d of t.days){
          for(const c of t.table[d]){
            if(c.teacher) set.add(c.teacher);
          }
        }
        setFacultyList(Array.from(set));
      }).catch(()=>{});
    socket.emit('join');
    socket.on('chat:message', msg=>{
      setMessages(prev=>[...prev, msg]);
    });
    return ()=>{ socket.off('chat:message'); };
  },[]);

  function loadPerformance(){
    if(!selectedFaculty) return;
    const url = API + '/faculty/performance?name=' + encodeURIComponent(selectedFaculty) + '&sem=' + selectedSem;
    fetch(url, {headers:{Authorization:'Bearer '+token}})
      .then(r=>r.json()).then(j=>setPerf(j)).catch(()=>{});
  }

  function send(toRole){
    if(!text) return;
    socket.emit('chat:message', {
      fromRole:'hod',
      fromUser:user.username,
      toRole,
      text,
      ts:new Date().toISOString()
    });
    setText('');
  }

  return (
    <div>
      <h2>HOD Dashboard</h2>
      <div className='notice card'>
        Drag & drop timetable below to rearrange classes. View timetable by semester or by faculty, and monitor faculty performance based on student feedback.
      </div>

      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <div className='card' style={{flex:1}}>
          <h3>View Controls</h3>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
            <label>View mode:</label>
            <select value={viewMode} onChange={e=>setViewMode(e.target.value)}>
              <option value='semester'>Semester timetable</option>
              <option value='faculty'>Faculty timetable</option>
            </select>
            {viewMode === 'semester' && (
              <>
                <label style={{marginLeft:8}}>Semester:</label>
                <select value={selectedSem} onChange={e=>setSelectedSem(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            {viewMode === 'faculty' && (
              <>
                <label style={{marginLeft:8}}>Faculty:</label>
                <select value={selectedFaculty} onChange={e=>setSelectedFaculty(e.target.value)}>
                  <option value=''>Select</option>
                  {facultyList.map(f=> <option key={f} value={f}>{f}</option>)}
                </select>
              </>
            )}
          </div>
          <div style={{fontSize:13,color:'#9fb4c9'}}>
            Note: Sample timetable uses a single grid; semester filter is simulated using the semester field of each class.
          </div>
        </div>

        <div className='card' style={{width:340}}>
          <h3>Faculty Performance</h3>
          <div style={{display:'flex',gap:6,marginBottom:6}}>
            <select className='input' value={selectedFaculty} onChange={e=>setSelectedFaculty(e.target.value)}>
              <option value=''>Select faculty</option>
              {facultyList.map(f=> <option key={f} value={f}>{f}</option>)}
            </select>
            <select className='input' value={selectedSem} onChange={e=>setSelectedSem(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Sem {s}</option>)}
            </select>
            <button className='btn sm' onClick={loadPerformance}>View</button>
          </div>
          {perf ? (
            <div style={{fontSize:13}}>
              <div><strong>{perf.faculty}</strong> (Sem {perf.sem || selectedSem})</div>
              <div>Total feedbacks: {perf.count}</div>
              <div>Average rating: {perf.averageRating.toFixed(2)}</div>
              <div style={{fontSize:11,opacity:0.8,marginTop:4}}>* Ratings computed from student feedback mapped to this faculty's classes.</div>
            </div>
          ) : <div style={{fontSize:13,color:'#9fb4c9'}}>Select faculty and semester to see performance.</div>}
        </div>

        <div className='card' style={{width:320}}>
          <h3>Chat (HOD)</h3>
          <div className='chat'>
            {messages.map((m,i)=>(
              <div key={i} className='chat-msg'>
                <span className='chat-from'>{m.fromRole}({m.fromUser}) ➜ {m.toRole}:</span>
                <span> {m.text}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:6}}>
            <input className='input' value={text} onChange={e=>setText(e.target.value)} placeholder='Message' />
            <div style={{display:'flex',gap:6,marginTop:4}}>
              <button className='btn sm' onClick={()=>send('faculty')}>To Faculty</button>
              <button className='btn sm' onClick={()=>send('admin')}>To Admin</button>
            </div>
          </div>
        </div>
      </div>

      <div className='card'>
        <h3>
          {viewMode==='semester'
            ? <>Semester {selectedSem} Timetable (Editable)</>
            : <>Timetable for Faculty: {selectedFaculty || 'Select a faculty'}</>
          }
        </h3>
        {viewMode === 'semester'
          ? <HodTimetable editable={true} facultyFilter={null} semFilter={selectedSem} />
          : <HodTimetable editable={false} facultyFilter={selectedFaculty || null} semFilter={null} />}
      </div>
    </div>
  );
}
