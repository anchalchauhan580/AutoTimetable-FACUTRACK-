const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const DB = path.join(__dirname, 'facutrack.db');
const db = new sqlite3.Database(DB);

function initDb(){
  db.serialize(()=>{
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY,
      student TEXT,
      day TEXT,
      slot INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY,
      student TEXT,
      day TEXT,
      slot INTEGER,
      present INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // seed default users
    db.get('SELECT COUNT(*) as c FROM users', (err,row)=>{
      if(err) return console.error(err);
      if(row.c === 0){
        const users = [
          {username:'student1', password:'student1', role:'student'},
          {username:'faculty1', password:'faculty1', role:'faculty'},
          {username:'hod1', password:'hod1', role:'hod'},
          {username:'admin1', password:'admin1', role:'admin'}
        ];
        const stmt = db.prepare('INSERT INTO users (username,password,role) VALUES (?,?,?)');
        users.forEach(u=>{
          const pw = bcrypt.hashSync(u.password, 8);
          stmt.run(u.username, pw, u.role);
        });
        stmt.finalize(()=>console.log('Seeded users'));
      }
    });

    // seed timetable
    db.get('SELECT COUNT(*) as c FROM timetable', (err,row)=>{
      if(err) return console.error(err);
      if(row.c === 0){
        const sample = generateSample();
        const stmt = db.prepare('INSERT INTO timetable (data) VALUES (?)');
        stmt.run(JSON.stringify(sample), function(){
          stmt.finalize(()=>console.log('Seeded timetable'));
        });
      }
    });
  });
}

function generateSample(){
  const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
  const SLOTS = ['09:00','10:00','11:00','12:00','14:00'];
  const subjects = ['DBMS','OS','Networks','ML','DAA'];
  const teachers = ['faculty1','faculty2','faculty3','faculty1','faculty2'];
  const rooms = ['C-101','C-102','L-201','L-202','C-103'];
  const table = {};
  for(const d of DAYS){
    table[d] = SLOTS.map((s,i)=>({
      time: s,
      subject: subjects[i%subjects.length],
      teacher: teachers[i%teachers.length],
      room: rooms[i%rooms.length],
      type: Math.random()>0.8 ? 'Lab' : 'Class',
      duration: 1,
      semester: (i % 8) + 1
    }));
  }
  return { days: DAYS, slots: SLOTS, table };
}

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'Missing auth'});
  const token = auth.split(' ')[1];
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  }catch(e){
    return res.status(401).json({error:'Invalid token'});
  }
}

function validateTimetable(data){
  const { days, slots, table } = data || {};
  if(!days || !slots || !table) return {ok:false, reason:'Invalid structure'};
  for(let si=0; si<slots.length; si++){
    const teacherMap = new Map();
    const roomMap = new Map();
    for(const d of days){
      const cell = (table[d] && table[d][si]) || null;
      if(cell && cell.subject){
        const t = cell.teacher || '';
        const r = cell.room || '';
        if(t){
          if(teacherMap.has(t)){
            return {ok:false, reason:`Teacher conflict: ${t} at ${slots[si]} on ${teacherMap.get(t)} and ${d}`};
          }
          teacherMap.set(t, d);
        }
        if(r){
          if(roomMap.has(r)){
            return {ok:false, reason:`Room conflict: ${r} at ${slots[si]} on ${roomMap.get(r)} and ${d}`};
          }
          roomMap.set(r, d);
        }
      }
    }
  }
  for(const d of days){
    for(const c of table[d]){
      if(!c || !c.subject) continue;
      if(c.type === 'Lab' && c.duration > 2) return {ok:false, reason:'A lab exceeds 2 hours'};
      if(c.type !== 'Lab' && c.duration > 1) return {ok:false, reason:'A class exceeds 1 hour'};
    }
  }
  return {ok:true};
}

// auth endpoints
app.post('/auth/register', async (req,res)=>{
  const { username, password, role } = req.body;
  if(!username || !password || !role) return res.status(400).json({error:'missing fields'});
  const hash = await bcrypt.hash(password, 8);
  const stmt = db.prepare('INSERT INTO users (username,password,role) VALUES (?,?,?)');
  stmt.run(username, hash, role, function(err){
    if(err) return res.status(400).json({error:err.message});
    const token = jwt.sign({id:this.lastID, username, role}, JWT_SECRET, {expiresIn:'8h'});
    res.json({token, user:{id:this.lastID, username, role}});
  });
});

app.post('/auth/login', (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'missing fields'});
  db.get('SELECT id, username, password, role FROM users WHERE username = ?', [username], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(400).json({error:'invalid credentials'});
    const ok = bcrypt.compareSync(password, row.password);
    if(!ok) return res.status(400).json({error:'invalid credentials'});
    const token = jwt.sign({id:row.id, username:row.username, role:row.role}, JWT_SECRET, {expiresIn:'8h'});
    res.json({token, user:{id:row.id, username:row.username, role:row.role}});
  });
});

// timetable endpoints
app.get('/timetable', authMiddleware, (req,res)=>{
  db.get('SELECT data FROM timetable ORDER BY id DESC LIMIT 1', (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'not found'});
    return res.json({data: JSON.parse(row.data)});
  });
});

app.post('/timetable', authMiddleware, (req,res)=>{
  const user = req.user;
  if(!['admin','hod'].includes(user.role)) return res.status(403).json({error:'forbidden'});
  const data = req.body;
  const v = validateTimetable(data);
  if(!v.ok) return res.status(400).json({error:v.reason});
  const stmt = db.prepare('INSERT INTO timetable (data) VALUES (?)');
  stmt.run(JSON.stringify(data), function(err){
    if(err) return res.status(500).json({error:err.message});
    io.emit('timetable:update', data);
    res.json({ok:true, id:this.lastID});
  });
});

// feedback
app.post('/feedback', authMiddleware, (req,res)=>{
  const user = req.user;
  if(user.role !== 'student') return res.status(403).json({error:'only students can post feedback'});
  const { day, slot, rating, comment } = req.body;
  const stmt = db.prepare('INSERT INTO feedback (student,day,slot,rating,comment) VALUES (?,?,?,?,?)');
  stmt.run(user.username, day, slot, rating, comment || '', function(err){
    if(err) return res.status(500).json({error:err.message});
    res.json({ok:true, id:this.lastID});
  });
});

// faculty performance (optional sem filter)
app.get('/faculty/performance', authMiddleware, (req,res)=>{
  const faculty = req.query.name;
  const sem = req.query.sem ? Number(req.query.sem) : null;
  if(!faculty) return res.status(400).json({error:'missing faculty'});
  db.get('SELECT data FROM timetable ORDER BY id DESC LIMIT 1', (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'no timetable'});
    const tt = JSON.parse(row.data);
    db.all('SELECT day, slot, rating FROM feedback', [], (err2, rows)=>{
      if(err2) return res.status(500).json({error:err2.message});
      let sum = 0, count = 0;
      for(const r of rows){
        const day = r.day;
        const idx = r.slot;
        if(!tt.table[day] || !tt.table[day][idx]) continue;
        const cell = tt.table[day][idx];
        if(cell.teacher === faculty){
          if(sem && cell.semester !== sem) continue;
          if(r.rating != null){
            sum += r.rating;
            count += 1;
          }
        }
      }
      const avg = count ? (sum / count) : 0;
      res.json({faculty, sem, count, averageRating: avg});
    });
  });
});

// attendance
app.post('/attendance', authMiddleware, (req,res)=>{
  const user = req.user;
  if(user.role !== 'student') return res.status(403).json({error:'only students can post attendance'});
  const { day, slot, present } = req.body;
  const stmt = db.prepare('INSERT INTO attendance (student,day,slot,present) VALUES (?,?,?,?)');
  stmt.run(user.username, day, slot, present?1:0, function(err){
    if(err) return res.status(500).json({error:err.message});
    res.json({ok:true, id:this.lastID});
  });
});

app.get('/attendance/:student', authMiddleware, (req,res)=>{
  const student = req.params.student;
  db.all('SELECT day, slot, present FROM attendance WHERE student = ?', [student], (err, rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json({rows});
  });
});

// sockets
io.on('connection', (socket)=>{
  console.log('socket connected', socket.id);
  socket.on('join', ()=>{
    db.get('SELECT data FROM timetable ORDER BY id DESC LIMIT 1', (err,row)=>{
      if(!err && row) socket.emit('timetable:update', JSON.parse(row.data));
    });
  });
  socket.on('chat:message', (msg)=>{
    io.emit('chat:message', msg);
  });
  socket.on('timetable:update', (data)=>{
    const v = validateTimetable(data);
    if(!v.ok){
      socket.emit('timetable:error', {reason: v.reason});
      return;
    }
    io.emit('timetable:update', data);
    const stmt = db.prepare('INSERT INTO timetable (data) VALUES (?)');
    stmt.run(JSON.stringify(data));
  });
});

server.listen(PORT, ()=>{ initDb(); console.log('Server listening on', PORT); });
