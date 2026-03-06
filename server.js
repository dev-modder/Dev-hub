const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads dir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// In-memory store (for demo; swap for DB in prod)
let store = {
  whatsappGroups: [],
  whatsappChannels: [],
  playlists: [],
  tools: [],
  projects: [],
  announcements: [
    { id: uuidv4(), title: '🚀 NtandoStore Tech Dev Hub Launched!', body: 'Welcome to the ultimate developer community platform. Share, discover, and grow together.', date: new Date().toISOString(), pinned: true }
  ]
};

// Stats
let stats = { groups: 0, channels: 0, playlists: 0, tools: 0, projects: 0, members: 1247 };

// Multer for playlist files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Stats
app.get('/api/stats', (req, res) => {
  stats.groups = store.whatsappGroups.length;
  stats.channels = store.whatsappChannels.length;
  stats.playlists = store.playlists.length;
  stats.tools = store.tools.length;
  stats.projects = store.projects.length;
  res.json(stats);
});

// Announcements
app.get('/api/announcements', (req, res) => res.json(store.announcements));

// WhatsApp Groups
app.get('/api/groups', (req, res) => {
  const { search, category } = req.query;
  let data = [...store.whatsappGroups];
  if (search) data = data.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(g => g.category === category);
  res.json(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/groups', (req, res) => {
  const { name, description, link, category, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link are required' });
  if (!link.startsWith('https://chat.whatsapp.com/')) return res.status(400).json({ error: 'Invalid WhatsApp group link' });
  const group = { id: uuidv4(), name, description: description || '', link, category: category || 'general', icon: icon || '💬', createdAt: new Date().toISOString(), members: Math.floor(Math.random() * 200) + 10, verified: false };
  store.whatsappGroups.unshift(group);
  res.status(201).json(group);
});

// WhatsApp Channels
app.get('/api/channels', (req, res) => {
  const { search, category } = req.query;
  let data = [...store.whatsappChannels];
  if (search) data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(c => c.category === category);
  res.json(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/channels', (req, res) => {
  const { name, description, link, category, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link are required' });
  if (!link.startsWith('https://whatsapp.com/channel/') && !link.startsWith('https://www.whatsapp.com/channel/')) {
    return res.status(400).json({ error: 'Invalid WhatsApp channel link' });
  }
  const channel = { id: uuidv4(), name, description: description || '', link, category: category || 'general', icon: icon || '📢', createdAt: new Date().toISOString(), subscribers: Math.floor(Math.random() * 5000) + 100, verified: false };
  store.whatsappChannels.unshift(channel);
  res.status(201).json(channel);
});

// Playlists
app.get('/api/playlists', (req, res) => {
  const { search, type } = req.query;
  let data = [...store.playlists];
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  if (type && type !== 'all') data = data.filter(p => p.type === type);
  res.json(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/playlists', upload.single('file'), (req, res) => {
  const { name, description, link, type, platform, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const playlist = {
    id: uuidv4(), name, description: description || '', link: link || null,
    type: type || 'music', platform: platform || 'other', icon: icon || '🎵',
    file: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString(), tracks: Math.floor(Math.random() * 50) + 5
  };
  store.playlists.unshift(playlist);
  res.status(201).json(playlist);
});

// Dev Tools
app.get('/api/tools', (req, res) => {
  const { search, category } = req.query;
  let data = [...store.tools];
  if (search) data = data.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'all') data = data.filter(t => t.category === category);
  res.json(data.sort((a, b) => b.upvotes - a.upvotes));
});

app.post('/api/tools', (req, res) => {
  const { name, description, link, category, tags, icon } = req.body;
  if (!name || !link) return res.status(400).json({ error: 'Name and link are required' });
  const tool = { id: uuidv4(), name, description: description || '', link, category: category || 'utility', tags: tags || [], icon: icon || '🔧', upvotes: 0, createdAt: new Date().toISOString() };
  store.tools.unshift(tool);
  res.status(201).json(tool);
});

app.post('/api/tools/:id/upvote', (req, res) => {
  const tool = store.tools.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  tool.upvotes++;
  res.json(tool);
});

// Projects
app.get('/api/projects', (req, res) => {
  const { search, stack } = req.query;
  let data = [...store.projects];
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  if (stack && stack !== 'all') data = data.filter(p => p.stack.includes(stack));
  res.json(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/projects', (req, res) => {
  const { name, description, repoLink, demoLink, stack, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  const project = { id: uuidv4(), name, description: description || '', repoLink: repoLink || null, demoLink: demoLink || null, stack: stack || [], icon: icon || '💻', stars: 0, createdAt: new Date().toISOString() };
  store.projects.unshift(project);
  res.status(201).json(project);
});

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// Catch all
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 NtandoStore Tech Dev Hub running on port ${PORT}`));
