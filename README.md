FACUTRACK V2 – Full Stack (Auth + Roles + Drag & Drop + Chat + Performance)

Folders:
 - server: Express + SQLite + Socket.IO + JWT auth (port 4000)
 - client: Vite + React + React Router + Socket.IO-client (port 5173)

Run backend:
 cd server
 npm install
 npm start

Run frontend:
 cd client
 npm install
 npm run dev

Demo logins:
 - student1 / student1
 - faculty1 / faculty1
 - hod1 / hod1
 - admin1 / admin1

Highlights:
 - Student: view timetable, give feedback per class.
 - Faculty: see only their classes, chat with HOD.
 - HOD: drag & drop timetable (conflict detection), view by semester or by faculty, see faculty performance (average rating), chat with faculty/admin.
 - Admin: drag & drop timetable, smart faculty suggestion based on load + free slot, chat with HOD.
