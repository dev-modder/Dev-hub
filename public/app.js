/* ═══════════════════════════════════════════════════════
   NTANDOSTORE TECH — DEV HUB · app.js
═══════════════════════════════════════════════════════ */

const API = '';  // same-origin

// ─── ACTIVE FILTERS ───────────────────────────────────
const filters = {
  groups: 'all',
  channels: 'all',
  playlists: 'all',
  tools: 'all'
};

// ─── SECTION NAVIGATION ───────────────────────────────
function navigate(section, uploadTab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link, .m-link').forEach(l => l.classList.remove('active'));

  const el = document.getElementById(section);
  if (el) el.classList.add('active');

  document.querySelectorAll(`[data-section="${section}"]`).forEach(l => l.classList.add('active'));

  // Close mobile menu
  document.getElementById('mobileMenu').classList.remove('open');

  // Load data
  if (section === 'home') { loadStats(); loadAnnouncements(); }
  if (section === 'groups') loadGroups();
  if (section === 'channels') loadChannels();
  if (section === 'playlists') loadPlaylists();
  if (section === 'tools') loadTools();
  if (section === 'projects') loadProjects();

  // If we want a specific upload tab
  if (section === 'upload' && uploadTab) {
    const tab = document.querySelector(`.utab[data-form="form-${uploadTab}"]`);
    if (tab) switchUploadTab(uploadTab, tab);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Nav links
document.querySelectorAll('.nav-link, .m-link').forEach(link => {
  link.addEventListener('click', e => {
    const section = link.dataset.section;
    if (section) { e.preventDefault(); navigate(section); }
  });
});

// Hamburger
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));

// ─── UPLOAD TABS ──────────────────────────────────────
function switchUploadTab(name, btn) {
  document.querySelectorAll('.utab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.upload-form').forEach(f => f.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const form = document.getElementById(`form-${name}`);
  if (form) form.classList.add('active');
}

// ─── FILTER ───────────────────────────────────────────
function setFilter(type, val, el) {
  filters[type] = val;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  if (type === 'groups') loadGroups();
  if (type === 'channels') loadChannels();
  if (type === 'playlists') loadPlaylists();
  if (type === 'tools') loadTools();
}

// ─── STATS ────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const data = await res.json();
    animateNum('stat-groups', data.groups);
    animateNum('stat-channels', data.channels);
    animateNum('stat-playlists', data.playlists);
    animateNum('stat-tools', data.tools);
    animateNum('stat-members', data.members);
  } catch (e) { console.error(e); }
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current.toLocaleString();
  }, 30);
}

// ─── ANNOUNCEMENTS ────────────────────────────────────
async function loadAnnouncements() {
  try {
    const res = await fetch(`${API}/api/announcements`);
    const data = await res.json();
    const container = document.getElementById('announcementsList');
    if (!data.length) {
      container.innerHTML = `<p style="color:var(--text3);font-family:var(--font-mono);font-size:0.8rem">No announcements yet.</p>`;
      return;
    }
    container.innerHTML = data.map(a => `
      <div class="announcement-card ${a.pinned ? 'pinned' : ''}">
        <div class="ann-content">
          <h4>${a.title}</h4>
          <p>${a.body}</p>
          <span class="ann-date">${new Date(a.date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

// ─── GROUPS ───────────────────────────────────────────
async function loadGroups() {
  const search = document.getElementById('groupSearch')?.value || '';
  const category = filters.groups;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category !== 'all') params.set('category', category);

  try {
    const res = await fetch(`${API}/api/groups?${params}`);
    const data = await res.json();
    renderCards('groupsList', data, renderGroupCard);
  } catch (e) { console.error(e); }
}

function renderGroupCard(g) {
  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-icon">${g.icon || '💬'}</div>
        <div class="item-info">
          <h4>${esc(g.name)}</h4>
          <div class="item-meta">👥 ${g.members || '?'} members · ${g.category}</div>
          ${g.verified ? '<span class="item-badge">✓ Verified</span>' : ''}
        </div>
      </div>
      ${g.description ? `<p class="item-desc">${esc(g.description)}</p>` : ''}
      <div class="item-actions">
        <a href="${esc(g.link)}" target="_blank" rel="noopener" class="btn-join">Join Group →</a>
      </div>
    </div>
  `;
}

// ─── CHANNELS ─────────────────────────────────────────
async function loadChannels() {
  const search = document.getElementById('channelSearch')?.value || '';
  const category = filters.channels;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category !== 'all') params.set('category', category);

  try {
    const res = await fetch(`${API}/api/channels?${params}`);
    const data = await res.json();
    renderCards('channelsList', data, renderChannelCard);
  } catch (e) { console.error(e); }
}

function renderChannelCard(c) {
  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-icon">${c.icon || '📢'}</div>
        <div class="item-info">
          <h4>${esc(c.name)}</h4>
          <div class="item-meta">📣 ${(c.subscribers || 0).toLocaleString()} followers · ${c.category}</div>
          ${c.verified ? '<span class="item-badge">✓ Verified</span>' : ''}
        </div>
      </div>
      ${c.description ? `<p class="item-desc">${esc(c.description)}</p>` : ''}
      <div class="item-actions">
        <a href="${esc(c.link)}" target="_blank" rel="noopener" class="btn-join">Follow Channel →</a>
      </div>
    </div>
  `;
}

// ─── PLAYLISTS ────────────────────────────────────────
async function loadPlaylists() {
  const search = document.getElementById('playlistSearch')?.value || '';
  const type = filters.playlists;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type !== 'all') params.set('type', type);

  try {
    const res = await fetch(`${API}/api/playlists?${params}`);
    const data = await res.json();
    renderCards('playlistsList', data, renderPlaylistCard);
  } catch (e) { console.error(e); }
}

const platformColors = {
  spotify: '#1DB954',
  youtube: '#FF0000',
  apple: '#FA57C1',
  soundcloud: '#FF5500',
  other: '#7a94b0'
};
const platformIcons = {
  spotify: '🎧', youtube: '▶️', apple: '🍎', soundcloud: '☁️', other: '🎵'
};

function renderPlaylistCard(p) {
  const color = platformColors[p.platform] || '#7a94b0';
  const icon = platformIcons[p.platform] || '🎵';
  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-icon" style="background:${color}18; border-color:${color}40;">${p.icon || icon}</div>
        <div class="item-info">
          <h4>${esc(p.name)}</h4>
          <div class="item-meta">${p.platform?.toUpperCase() || 'OTHER'} · ${p.type} · ${p.tracks} tracks</div>
        </div>
      </div>
      ${p.description ? `<p class="item-desc">${esc(p.description)}</p>` : ''}
      <div class="item-actions">
        ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="btn-join" style="background:${color}">Open Playlist →</a>` : ''}
        ${p.file ? `<a href="${esc(p.file)}" target="_blank" class="btn-join" style="background:var(--accent3)">Download →</a>` : ''}
      </div>
    </div>
  `;
}

// ─── TOOLS ────────────────────────────────────────────
async function loadTools() {
  const search = document.getElementById('toolSearch')?.value || '';
  const category = filters.tools;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category !== 'all') params.set('category', category);

  try {
    const res = await fetch(`${API}/api/tools?${params}`);
    const data = await res.json();
    renderCards('toolsList', data, renderToolCard);
  } catch (e) { console.error(e); }
}

function renderToolCard(t) {
  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-icon">${t.icon || '🔧'}</div>
        <div class="item-info">
          <h4>${esc(t.name)}</h4>
          <div class="item-meta">${t.category} · ⬆️ ${t.upvotes} upvotes</div>
        </div>
      </div>
      ${t.description ? `<p class="item-desc">${esc(t.description)}</p>` : ''}
      ${t.tags?.length ? `<div class="item-tags">${t.tags.map(tag => `<span class="item-tag">#${esc(tag)}</span>`).join('')}</div>` : ''}
      <div class="item-actions">
        <a href="${esc(t.link)}" target="_blank" rel="noopener" class="btn-join">Visit Tool →</a>
        <button class="btn-upvote" onclick="upvoteTool('${t.id}', this)">⬆️ Upvote</button>
      </div>
    </div>
  `;
}

async function upvoteTool(id, btn) {
  try {
    const res = await fetch(`${API}/api/tools/${id}/upvote`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      btn.textContent = `⬆️ ${data.upvotes}`;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      showToast('Upvoted! 🎉', 'success');
    }
  } catch (e) { console.error(e); }
}

// ─── PROJECTS ─────────────────────────────────────────
async function loadProjects() {
  const search = document.getElementById('projectSearch')?.value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  try {
    const res = await fetch(`${API}/api/projects?${params}`);
    const data = await res.json();
    renderCards('projectsList', data, renderProjectCard);
  } catch (e) { console.error(e); }
}

function renderProjectCard(p) {
  return `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-icon">${p.icon || '💻'}</div>
        <div class="item-info">
          <h4>${esc(p.name)}</h4>
          <div class="item-meta">⭐ ${p.stars} stars · ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      ${p.description ? `<p class="item-desc">${esc(p.description)}</p>` : ''}
      ${p.stack?.length ? `<div class="item-stack">${p.stack.map(s => `<span class="stack-tag">${esc(s)}</span>`).join('')}</div>` : ''}
      <div class="item-actions">
        ${p.repoLink ? `<a href="${esc(p.repoLink)}" target="_blank" rel="noopener" class="btn-join" style="background:#333;color:#fff">GitHub →</a>` : ''}
        ${p.demoLink ? `<a href="${esc(p.demoLink)}" target="_blank" rel="noopener" class="btn-join">Live Demo →</a>` : ''}
      </div>
    </div>
  `;
}

// ─── GENERIC RENDER ───────────────────────────────────
function renderCards(containerId, data, cardFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!data.length) {
    container.innerHTML = `<div class="empty-state"><span>🔍</span><p>Nothing found. Try a different search or add one!</p></div>`;
    return;
  }
  container.innerHTML = data.map(cardFn).join('');
}

// ─── SUBMIT FORMS ─────────────────────────────────────
async function submitGroup() {
  const name = document.getElementById('g-name').value.trim();
  const link = document.getElementById('g-link').value.trim();
  const desc = document.getElementById('g-desc').value.trim();
  const cat  = document.getElementById('g-cat').value;
  const icon = document.getElementById('g-icon').value.trim() || '💬';
  const msg  = document.getElementById('g-msg');

  if (!name || !link) { showMsg(msg, 'Name and link are required', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/groups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, link, description: desc, category: cat, icon })
    });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, data.error, 'error'); return; }
    showMsg(msg, '✓ Group uploaded successfully!', 'success');
    clearForm(['g-name','g-link','g-desc','g-icon']);
    showToast('Group added! 🎉', 'success');
    loadStats();
  } catch (e) { showMsg(msg, 'Upload failed. Try again.', 'error'); }
}

async function submitChannel() {
  const name = document.getElementById('c-name').value.trim();
  const link = document.getElementById('c-link').value.trim();
  const desc = document.getElementById('c-desc').value.trim();
  const cat  = document.getElementById('c-cat').value;
  const icon = document.getElementById('c-icon').value.trim() || '📢';
  const msg  = document.getElementById('c-msg');

  if (!name || !link) { showMsg(msg, 'Name and link are required', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/channels`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, link, description: desc, category: cat, icon })
    });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, data.error, 'error'); return; }
    showMsg(msg, '✓ Channel uploaded successfully!', 'success');
    clearForm(['c-name','c-link','c-desc','c-icon']);
    showToast('Channel added! 🎉', 'success');
    loadStats();
  } catch (e) { showMsg(msg, 'Upload failed. Try again.', 'error'); }
}

async function submitPlaylist() {
  const name     = document.getElementById('p-name').value.trim();
  const link     = document.getElementById('p-link').value.trim();
  const desc     = document.getElementById('p-desc').value.trim();
  const type     = document.getElementById('p-type').value;
  const platform = document.getElementById('p-platform').value;
  const file     = document.getElementById('p-file').files[0];
  const msg      = document.getElementById('p-msg');

  if (!name) { showMsg(msg, 'Playlist name is required', 'error'); return; }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', desc);
  formData.append('link', link);
  formData.append('type', type);
  formData.append('platform', platform);
  if (file) formData.append('file', file);

  try {
    const res = await fetch(`${API}/api/playlists`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, data.error, 'error'); return; }
    showMsg(msg, '✓ Playlist uploaded successfully!', 'success');
    clearForm(['p-name','p-link','p-desc']);
    document.getElementById('p-file').value = '';
    resetFileDrop();
    showToast('Playlist added! 🎵', 'success');
    loadStats();
  } catch (e) { showMsg(msg, 'Upload failed. Try again.', 'error'); }
}

async function submitTool() {
  const name = document.getElementById('t-name').value.trim();
  const link = document.getElementById('t-link').value.trim();
  const desc = document.getElementById('t-desc').value.trim();
  const cat  = document.getElementById('t-cat').value;
  const icon = document.getElementById('t-icon').value.trim() || '🔧';
  const tagsRaw = document.getElementById('t-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const msg  = document.getElementById('t-msg');

  if (!name || !link) { showMsg(msg, 'Name and link are required', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/tools`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, link, description: desc, category: cat, icon, tags })
    });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, data.error, 'error'); return; }
    showMsg(msg, '✓ Tool uploaded successfully!', 'success');
    clearForm(['t-name','t-link','t-desc','t-icon','t-tags']);
    showToast('Tool added! 🔧', 'success');
    loadStats();
  } catch (e) { showMsg(msg, 'Upload failed. Try again.', 'error'); }
}

async function submitProject() {
  const name  = document.getElementById('pr-name').value.trim();
  const repo  = document.getElementById('pr-repo').value.trim();
  const demo  = document.getElementById('pr-demo').value.trim();
  const desc  = document.getElementById('pr-desc').value.trim();
  const icon  = document.getElementById('pr-icon').value.trim() || '💻';
  const stackRaw = document.getElementById('pr-stack').value;
  const stack = stackRaw.split(',').map(s => s.trim()).filter(Boolean);
  const msg   = document.getElementById('pr-msg');

  if (!name) { showMsg(msg, 'Project name is required', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, repoLink: repo, demoLink: demo, description: desc, stack, icon })
    });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, data.error, 'error'); return; }
    showMsg(msg, '✓ Project uploaded successfully!', 'success');
    clearForm(['pr-name','pr-repo','pr-demo','pr-desc','pr-stack','pr-icon']);
    showToast('Project added! 💻', 'success');
    loadStats();
  } catch (e) { showMsg(msg, 'Upload failed. Try again.', 'error'); }
}

// ─── FILE DROP ────────────────────────────────────────
function updateFileDrop(input) {
  const drop = document.getElementById('fileDrop');
  if (input.files[0]) {
    drop.querySelector('.file-drop-text').textContent = `📄 ${input.files[0].name}`;
    drop.style.borderColor = 'var(--accent2)';
  }
}

function resetFileDrop() {
  const drop = document.getElementById('fileDrop');
  drop.querySelector('.file-drop-text').textContent = 'Click or drag & drop to upload a file';
  drop.style.borderColor = '';
}

// File drop drag support
const fileDrop = document.getElementById('fileDrop');
if (fileDrop) {
  fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.style.borderColor = 'var(--accent)'; });
  fileDrop.addEventListener('dragleave', () => { fileDrop.style.borderColor = ''; });
  fileDrop.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById('p-file');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      updateFileDrop(input);
    }
    fileDrop.style.borderColor = '';
  });
}

// ─── HELPERS ──────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `form-msg ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'form-msg'; }, 5000);
}

let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ─── MATRIX RAIN ──────────────────────────────────────
function initMatrix() {
  const canvas = document.getElementById('matrixCanvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const chars = '01アイウエオカキクケコサシスセソタチツテトNABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]<>/\\|#@$%';
  const fontSize = 11;
  let columns = Math.floor(window.innerWidth / fontSize);
  let drops = Array(columns).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(8,12,16,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00e5ff';
    ctx.font = `${fontSize}px JetBrains Mono, monospace`;

    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, y * fontSize);
      if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }

  setInterval(draw, 60);
}

// ─── NAV SCROLL EFFECT ────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  nav.style.background = window.scrollY > 20
    ? 'rgba(8,12,16,0.97)'
    : 'rgba(8,12,16,0.85)';
});

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMatrix();
  loadStats();
  loadAnnouncements();
});
