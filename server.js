/**
 * NTANDOSTORE TECH v2.0 — Protected by Ntando Baileys
 */
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { ntandoBaileys, helmetMiddleware, globalLimiter, apiLimiter, uploadLimiter, getAttackLog, getBlacklist, addToBlacklist, removeFromBlacklist } = require('./baileys');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'ntando-admin-2026';

const io = new SocketIO(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  pingTimeout: 60000,
});

app.use(cors());
app.use(helmetMiddleware);
app.use(globalLimiter);
app.use(ntandoBaileys);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const DIST = path.join(__dirname, 'dist');
const PUBLIC = path.join(__dirname, 'public');
const SERVE_DIR = fs.existsSync(DIST) ? DIST : PUBLIC;

const BLOCKED_SOURCES = ['/app.js','/style.css','/index.html','/baileys.js','/server.js','/build.js','/package.json'];
app.use((req, res, next) => {
  if (BLOCKED_SOURCES.includes(req.path)) return res.status(403).json({ error: 'Protected by Ntando Baileys Shield' });
  next();
});

app.use(express.static(SERVE_DIR, { setHeaders: res => { res.setHeader('X-Protected-By','Ntando-Baileys'); }}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const banned = ['.exe','.bat','.cmd','.sh','.ps1','.vbs','.msi','.dll','.php','.py'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (banned.includes(ext)) return cb(new Error('File type blocked by Ntando Baileys'));
    cb(null, true);
  }
});

const store = {
  whatsappGroups: [], whatsappChannels: [], playlists: [], tools: [],
  projects: [], softwares: [], reactions: {}, reports: [], users: {},
  chatMessages: [],
  announcements: [{
    id: uuidv4(),
    title: '🚀 NtandoStore Tech Dev Hub v2.0 Launched!',
    body: 'Now featuring real-time chat, video calls, free software hub, and Ntando Baileys security. Welcome!',
    date: new Date().toISOString(), pinned: true,
  }],
};

// STATS
app.get('/api/stats', (req, res) => {
  res.json({
    groups: store.whatsappGroups.length, channels: store.whatsappChannels.length,
    playlists: store.playlists.length, tools: store.tools.length,
    projects: store.projects.length, softwares: store.softwares.length,
    members: 1247 + store.whatsappGroups.length * 3,
    onlineNow: Object.keys(store.users).length,
    totalUploads: store.whatsappGroups.length + store.whatsappChannels.length + store.playlists.length + store.tools.length + store.projects.length + store.softwares.length,
  });
});

// ANNOUNCEMENTS
app.get('/api/announcements', (req, res) => res.json(store.announcements));
app.post('/api/announcements', apiLimiter, (req, res) => {
  const { title, body, pinned, adminKey } = req.body;
  if (adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
  const ann = { id: uuidv4(), title, body, pinned: !!pinned, date: new Date().toISOString() };
  store.announcements.unshift(ann);
  io.emit('new_announcement', ann);
  res.status(201).json(ann);
});

// REACTIONS
app.post('/api/react/:itemId', apiLimiter, (req, res) => {
  const { emoji } = req.body;
  const allowed = ['❤️','🔥','👍','🚀','💯','😍','🎉','🤯'];
  if (!allowed.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });
  if (!store.reactions[req.params.itemId]) store.reactions[req.params.itemId] = {};
  store.reactions[req.params.itemId][emoji] = (store.reactions[req.params.itemId][emoji] || 0) + 1;
  io.emit('reaction_update', { itemId: req.params.itemId, reactions: store.reactions[req.params.itemId] });
  res.json({ reactions: store.reactions[req.params.itemId] });
});
app.get('/api/reactions/:itemId', (req, res) => res.json(store.reactions[req.params.itemId] || {}));

// REPORTS
app.post('/api/report', apiLimiter, (req, res) => {
  const { itemId, itemType, reason } = req.body;
  if (!itemId || !reason) return res.status(400).json({ error: 'itemId and reason required' });
  store.reports.push({ id: uuidv4(), itemId, itemType, reason, ip: req.ip, ts: new Date().toISOString() });
  res.json({ success: true });
});

// GROUPS
app.get('/api/groups', apiLimiter, (req, res) => {
  const { search, category, sort } = req.query;
  let data = [...store.whatsappGroups];
  if (search) data = data.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(g => g.category === category);
  if (sort === 'popular') data.sort((a,b) => b.members - a.members);
  else data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(data);
});
app.post('/api/groups', apiLimiter, (req, res) => {
  const { name, description, link, category, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link required' });
  if (!link.startsWith('https://chat.whatsapp.com/')) return res.status(400).json({ error: 'Invalid WhatsApp group link' });
  const g = { id: uuidv4(), name, description: description || '', link, category: category || 'general', icon: icon || '💬', createdAt: new Date().toISOString(), members: Math.floor(Math.random()*200)+10, verified: false, views: 0 };
  store.whatsappGroups.unshift(g);
  io.emit('new_content', { type: 'group', data: g });
  res.status(201).json(g);
});
app.post('/api/groups/:id/view', (req, res) => {
  const item = store.whatsappGroups.find(g => g.id === req.params.id);
  if (item) item.views = (item.views || 0) + 1;
  res.json({ views: item?.views || 0 });
});

// CHANNELS
app.get('/api/channels', apiLimiter, (req, res) => {
  const { search, category } = req.query;
  let data = [...store.whatsappChannels];
  if (search) data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(c => c.category === category);
  res.json(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});
app.post('/api/channels', apiLimiter, (req, res) => {
  const { name, description, link, category, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link required' });
  const c = { id: uuidv4(), name, description: description || '', link, category: category || 'general', icon: icon || '📢', createdAt: new Date().toISOString(), subscribers: Math.floor(Math.random()*5000)+100, verified: false };
  store.whatsappChannels.unshift(c);
  io.emit('new_content', { type: 'channel', data: c });
  res.status(201).json(c);
});

// PLAYLISTS
app.get('/api/playlists', apiLimiter, (req, res) => {
  const { search, type } = req.query;
  let data = [...store.playlists];
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  if (type && type !== 'all') data = data.filter(p => p.type === type);
  res.json(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});
app.post('/api/playlists', uploadLimiter, upload.single('file'), (req, res) => {
  const { name, description, link, type, platform, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const p = { id: uuidv4(), name, description: description || '', link: link || null, type: type || 'music', platform: platform || 'other', icon: icon || '🎵', file: req.file ? `/uploads/${req.file.filename}` : null, createdAt: new Date().toISOString(), tracks: Math.floor(Math.random()*50)+5 };
  store.playlists.unshift(p);
  io.emit('new_content', { type: 'playlist', data: p });
  res.status(201).json(p);
});

// TOOLS
app.get('/api/tools', apiLimiter, (req, res) => {
  const { search, category, sort } = req.query;
  let data = [...store.tools];
  if (search) data = data.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(t => t.category === category);
  if (sort === 'newest') data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  else data.sort((a,b) => b.upvotes - a.upvotes);
  res.json(data);
});
app.post('/api/tools', apiLimiter, (req, res) => {
  const { name, description, link, category, tags, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link required' });
  const t = { id: uuidv4(), name, description: description || '', link, category: category || 'utility', tags: tags || [], icon: icon || '🔧', upvotes: 0, createdAt: new Date().toISOString() };
  store.tools.unshift(t);
  io.emit('new_content', { type: 'tool', data: t });
  res.status(201).json(t);
});
app.post('/api/tools/:id/upvote', apiLimiter, (req, res) => {
  const t = store.tools.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.upvotes++;
  io.emit('upvote_update', { id: t.id, upvotes: t.upvotes });
  res.json(t);
});

// PROJECTS
app.get('/api/projects', apiLimiter, (req, res) => {
  const { search } = req.query;
  let data = [...store.projects];
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});
app.post('/api/projects', apiLimiter, (req, res) => {
  const { name, description, repoLink, demoLink, stack, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const p = { id: uuidv4(), name, description: description || '', repoLink: repoLink || null, demoLink: demoLink || null, stack: stack || [], icon: icon || '💻', stars: 0, createdAt: new Date().toISOString() };
  store.projects.unshift(p);
  io.emit('new_content', { type: 'project', data: p });
  res.status(201).json(p);
});
app.post('/api/projects/:id/star', apiLimiter, (req, res) => {
  const p = store.projects.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.stars++;
  res.json(p);
});

// FREE SOFTWARES
app.get('/api/softwares', apiLimiter, (req, res) => {
  const { search, category, platform, sort } = req.query;
  let data = [...store.softwares];
  if (search) data = data.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(s => s.category === category);
  if (platform && platform !== 'all') data = data.filter(s => s.platforms && s.platforms.includes(platform));
  if (sort === 'downloads') data.sort((a,b) => b.downloads - a.downloads);
  else data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(data);
});
app.post('/api/softwares', uploadLimiter, upload.single('file'), (req, res) => {
  const { name, description, downloadLink, category, platforms, version, size, license, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const s = {
    id: uuidv4(), name, description: description || '', downloadLink: downloadLink || null,
    file: req.file ? `/uploads/${req.file.filename}` : null,
    category: category || 'utility',
    platforms: Array.isArray(platforms) ? platforms : (platforms ? [platforms] : ['windows']),
    version: version || '1.0.0', size: size || 'Unknown', license: license || 'Freeware',
    icon: icon || '💾', downloads: 0, safe: true, createdAt: new Date().toISOString(),
    warning: 'Always scan downloads with your antivirus. NtandoStore is not responsible for third-party software.',
  };
  store.softwares.unshift(s);
  io.emit('new_content', { type: 'software', data: s });
  res.status(201).json(s);
});
app.post('/api/softwares/:id/download', apiLimiter, (req, res) => {
  const s = store.softwares.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.downloads++;
  res.json({ downloads: s.downloads, downloadLink: s.downloadLink, file: s.file });
});

// CHAT HISTORY
app.get('/api/chat/history', (req, res) => res.json(store.chatMessages.slice(-100)));

// TRENDING
app.get('/api/trending', (req, res) => {
  res.json({
    groups: [...store.whatsappGroups].sort((a,b) => (b.views||0)-(a.views||0)).slice(0,4),
    tools: [...store.tools].sort((a,b) => b.upvotes-a.upvotes).slice(0,4),
    projects: [...store.projects].sort((a,b) => b.stars-a.stars).slice(0,4),
    softwares: [...store.softwares].sort((a,b) => b.downloads-a.downloads).slice(0,4),
  });
});

// ADMIN
app.get('/api/admin/dashboard', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  res.json({
    stats: { groups: store.whatsappGroups.length, channels: store.whatsappChannels.length, playlists: store.playlists.length, tools: store.tools.length, projects: store.projects.length, softwares: store.softwares.length, onlineUsers: Object.keys(store.users).length },
    attackLog: getAttackLog().slice(0,50),
    blacklist: getBlacklist(),
    reports: store.reports.slice(0,50),
  });
});
app.post('/api/admin/blacklist', (req, res) => {
  if (req.body.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  if (req.body.action === 'add') addToBlacklist(req.body.ip);
  if (req.body.action === 'remove') removeFromBlacklist(req.body.ip);
  res.json({ success: true });
});
app.delete('/api/admin/content/:type/:id', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  const map = { group:'whatsappGroups', channel:'whatsappChannels', playlist:'playlists', tool:'tools', project:'projects', software:'softwares' };
  const arr = store[map[req.params.type]];
  if (!arr) return res.status(400).json({ error: 'Invalid type' });
  const idx = arr.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  arr.splice(idx, 1);
  res.json({ success: true });
});

app.use('/uploads', express.static(uploadsDir));

// SOCKET.IO — Chat + Video Signaling
io.on('connection', (socket) => {
  socket.on('user_join', ({ name, avatar }) => {
    store.users[socket.id] = { id: socket.id, name: name || 'Anonymous', avatar: avatar || '', joinedAt: new Date().toISOString() };
    socket.broadcast.emit('user_online', store.users[socket.id]);
    socket.emit('chat_history', store.chatMessages.slice(-50));
    io.emit('online_count', Object.keys(store.users).length);
  });

  socket.on('chat_message', ({ text, replyTo }) => {
    const user = store.users[socket.id];
    if (!user || !text) return;
    const msg = { id: uuidv4(), userId: socket.id, userName: user.name, userAvatar: user.avatar, text: text.substring(0, 1000), replyTo: replyTo || null, ts: new Date().toISOString() };
    store.chatMessages.push(msg);
    if (store.chatMessages.length > 200) store.chatMessages.shift();
    io.emit('chat_message', msg);
  });

  socket.on('join_room', ({ roomId, name }) => {
    socket.join(String(roomId));
    socket.to(String(roomId)).emit('room_user_joined', { socketId: socket.id, name });
  });

  socket.on('room_message', ({ roomId, text }) => {
    const user = store.users[socket.id];
    const msg = { id: uuidv4(), userId: socket.id, userName: user?.name || 'Anonymous', userAvatar: user?.avatar || '', text: text.substring(0,1000), ts: new Date().toISOString() };
    socket.to(String(roomId)).emit('room_message', msg);
  });

  // WebRTC video call signaling
  socket.on('call_offer', ({ to, offer, callerName }) => io.to(to).emit('call_offer', { from: socket.id, offer, callerName }));
  socket.on('call_answer', ({ to, answer }) => io.to(to).emit('call_answer', { from: socket.id, answer }));
  socket.on('ice_candidate', ({ to, candidate }) => io.to(to).emit('ice_candidate', { from: socket.id, candidate }));
  socket.on('call_reject', ({ to }) => io.to(to).emit('call_rejected', { from: socket.id }));
  socket.on('call_end', ({ to }) => io.to(to).emit('call_ended', { from: socket.id }));

  socket.on('typing_start', () => { const u = store.users[socket.id]; if (u) socket.broadcast.emit('user_typing', { name: u.name, id: socket.id }); });
  socket.on('typing_stop', () => socket.broadcast.emit('user_stop_typing', { id: socket.id }));

  socket.on('disconnect', () => {
    const user = store.users[socket.id];
    delete store.users[socket.id];
    if (user) socket.broadcast.emit('user_offline', { id: socket.id, name: user.name });
    io.emit('online_count', Object.keys(store.users).length);
  });
});

app.get('/{*path}', (req, res) => res.sendFile(path.join(SERVE_DIR, 'index.html')));

server.listen(PORT, () => {
  console.log(`\n  🚀 NtandoStore Tech Dev Hub v2.0`);
  console.log(`  🛡️  Ntando Baileys Security: ACTIVE`);
  console.log(`  💬 Real-time Chat + Video Calls: ONLINE`);
  console.log(`  💾 Free Software Hub: READY`);
  console.log(`  Port: ${PORT}\n`);
});
