* NtandoStore Tech Dev Hub v2.0 — app.js */
const API = '';
let socket = null;
let myName = '';
let mySocketId = '';
let currentRoom = 'global';
let replyToMsg = null;
let peerConn = null;
let localStream = null;
let currentCallTarget = null;
let pendingOffer = null;
let micEnabled = true, camEnabled = true;
let typingTimer = null;
const filters = { groups:'all', channels:'all', playlists:'all', tools:'all', software:'all' };
let swPlatformFilter = 'all';
let groupSort = 'newest', toolSort = 'popular';

// ─── NAVIGATION ──────────────────────────────────────────
function navigate(sec, uploadTab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link,.m-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('sec-' + sec);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-section="${sec}"]`).forEach(l => l.classList.add('active'));
  document.getElementById('mobileMenu').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (sec === 'home') { loadStats(); loadAnnouncements(); }
  if (sec === 'groups') loadGroups();
  if (sec === 'channels') loadChannels();
  if (sec === 'playlists') loadPlaylists();
  if (sec === 'tools') loadTools();
  if (sec === 'projects') loadProjects();
  if (sec === 'software') loadSoftwares();
  if (sec === 'trending') loadTrending();
  if (sec === 'upload' && uploadTab) {
    const btn = document.querySelector(`.utab[onclick*="'${uploadTab}'"]`);
    if (btn) switchUploadTab(uploadTab, btn);
  }
}

document.querySelectorAll('.nav-link,.m-link').forEach(l => {
  l.addEventListener('click', e => { const s = l.dataset.section; if (s) { e.preventDefault(); navigate(s); } });
});
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

// ─── UPLOAD TABS ─────────────────────────────────────────
function switchUploadTab(name, btn) {
  document.querySelectorAll('.utab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.upload-form').forEach(f => f.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const f = document.getElementById('form-' + name);
  if (f) f.classList.add('active');
}

// ─── FILTERS ─────────────────────────────────────────────
function setFilter(type, val, el) {
  filters[type] = val;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  if (type === 'groups') loadGroups();
  if (type === 'channels') loadChannels();
  if (type === 'playlists') loadPlaylists();
  if (type === 'tools') loadTools();
  if (type === 'software') loadSoftwares();
}
function setPlatformFilter(val, el) {
  swPlatformFilter = val;
  el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  loadSoftwares();
}
function toggleSort(type, el) {
  if (type === 'groups') { groupSort = groupSort === 'newest' ? 'popular' : 'newest'; el.textContent = groupSort === 'newest' ? '⬇️ Newest' : '🔥 Popular'; loadGroups(); }
  if (type === 'tools') { toolSort = toolSort === 'popular' ? 'newest' : 'popular'; el.textContent = toolSort === 'popular' ? '⬆️ Top Voted' : '⬇️ Newest'; loadTools(); }
}

// ─── STATS ───────────────────────────────────────────────
async function loadStats() {
  try {
    const d = await (await fetch('/api/stats')).json();
    animNum('stat-groups', d.groups);
    animNum('stat-channels', d.channels);
    animNum('stat-playlists', d.playlists);
    animNum('stat-tools', d.tools);
    animNum('stat-softwares', d.softwares);
    animNum('stat-members', d.members);
    animNum('stat-online', d.onlineNow);
  } catch(e) {}
}
function animNum(id, target) {
  const el = document.getElementById(id); if (!el) return;
  let cur = 0; const step = Math.max(1, Math.ceil(target/40));
  const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = cur.toLocaleString(); }, 30);
}

// ─── ANNOUNCEMENTS ───────────────────────────────────────
async function loadAnnouncements() {
  try {
    const d = await (await fetch('/api/announcements')).json();
    const c = document.getElementById('announcementsList');
    if (!d.length) { c.innerHTML = `<p style="color:var(--text3);font-family:var(--font-mono);font-size:0.8rem">No announcements.</p>`; return; }
    c.innerHTML = d.map(a => `<div class="announcement-card ${a.pinned?'pinned':''}"><div class="ann-content"><h4>${esc(a.title)}</h4><p>${esc(a.body)}</p><span class="ann-date">${new Date(a.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span></div></div>`).join('');
  } catch(e) {}
}

// ─── GROUPS ──────────────────────────────────────────────
async function loadGroups() {
  const search = (document.getElementById('groupSearch')||{}).value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.groups !== 'all') params.set('category', filters.groups);
  if (groupSort) params.set('sort', groupSort);
  try {
    const d = await (await fetch(`/api/groups?${params}`)).json();
    renderCards('groupsList', d, renderGroupCard, '💬', 'No groups yet.');
  } catch(e) {}
}
function renderGroupCard(g) {
  return `<div class="item-card" id="card-${g.id}">
    <div class="item-card-header"><div class="item-icon">${g.icon||'💬'}</div><div class="item-info"><h4>${esc(g.name)}</h4><div class="item-meta">👥 ${g.members||'?'} members · ${g.category}</div>${g.verified?'<span class="item-badge">✓ Verified</span>':''}</div></div>
    ${g.description?`<p class="item-desc">${esc(g.description)}</p>`:''}
    <div class="reaction-strip">${['❤️','🔥','👍','🚀'].map(e=>`<button class="react-btn" onclick="react('${g.id}','${e}',this)">${e}</button>`).join('')}</div>
    <div class="item-actions">
      <a href="${esc(g.link)}" target="_blank" rel="noopener" class="btn-join" onclick="trackView('groups','${g.id}')">Join Group →</a>
      <button class="report-btn" onclick="reportItem('${g.id}','group')">🚩 Report</button>
    </div>
  </div>`;
}

// ─── CHANNELS ────────────────────────────────────────────
async function loadChannels() {
  const search = (document.getElementById('channelSearch')||{}).value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.channels !== 'all') params.set('category', filters.channels);
  try {
    const d = await (await fetch(`/api/channels?${params}`)).json();
    renderCards('channelsList', d, renderChannelCard, '📢', 'No channels yet.');
  } catch(e) {}
}
function renderChannelCard(c) {
  return `<div class="item-card"><div class="item-card-header"><div class="item-icon">${c.icon||'📢'}</div><div class="item-info"><h4>${esc(c.name)}</h4><div class="item-meta">📣 ${(c.subscribers||0).toLocaleString()} followers · ${c.category}</div></div></div>${c.description?`<p class="item-desc">${esc(c.description)}</p>`:''}<div class="reaction-strip">${['❤️','🔥','👍'].map(e=>`<button class="react-btn" onclick="react('${c.id}','${e}',this)">${e}</button>`).join('')}</div><div class="item-actions"><a href="${esc(c.link)}" target="_blank" rel="noopener" class="btn-join">Follow Channel →</a><button class="report-btn" onclick="reportItem('${c.id}','channel')">🚩</button></div></div>`;
}

// ─── PLAYLISTS ───────────────────────────────────────────
async function loadPlaylists() {
  const search = (document.getElementById('playlistSearch')||{}).value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.playlists !== 'all') params.set('type', filters.playlists);
  try {
    const d = await (await fetch(`/api/playlists?${params}`)).json();
    renderCards('playlistsList', d, renderPlaylistCard, '🎵', 'No playlists yet.');
  } catch(e) {}
}
const pColors = { spotify:'#1DB954', youtube:'#FF0000', apple:'#FA57C1', soundcloud:'#FF5500', other:'#7a94b0' };
const pIcons  = { spotify:'🎧', youtube:'▶️', apple:'🍎', soundcloud:'☁️', other:'🎵' };
function renderPlaylistCard(p) {
  const col = pColors[p.platform] || '#7a94b0';
  return `<div class="item-card"><div class="item-card-header"><div class="item-icon" style="background:${col}18;border-color:${col}40">${p.icon||pIcons[p.platform]||'🎵'}</div><div class="item-info"><h4>${esc(p.name)}</h4><div class="item-meta">${(p.platform||'').toUpperCase()} · ${p.type} · ${p.tracks} tracks</div></div></div>${p.description?`<p class="item-desc">${esc(p.description)}</p>`:''}<div class="item-actions">${p.link?`<a href="${esc(p.link)}" target="_blank" rel="noopener" class="btn-join" style="background:${col}">Open Playlist →</a>`:''}${p.file?`<a href="${esc(p.file)}" target="_blank" class="btn-join" style="background:var(--accent3)">Download →</a>`:''}</div></div>`;
}

// ─── TOOLS ───────────────────────────────────────────────
async function loadTools() {
  const search = (document.getElementById('toolSearch')||{}).value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.tools !== 'all') params.set('category', filters.tools);
  params.set('sort', toolSort);
  try {
    const d = await (await fetch(`/api/tools?${params}`)).json();
    renderCards('toolsList', d, renderToolCard, '🔧', 'No tools yet.');
  } catch(e) {}
}
function renderToolCard(t) {
  return `<div class="item-card"><div class="item-card-header"><div class="item-icon">${t.icon||'🔧'}</div><div class="item-info"><h4>${esc(t.name)}</h4><div class="item-meta">${t.category} · ⬆️ ${t.upvotes}</div></div></div>${t.description?`<p class="item-desc">${esc(t.description)}</p>`:''}<div class="item-tags">${(t.tags||[]).map(tg=>`<span class="item-tag">#${esc(tg)}</span>`).join('')}</div><div class="item-actions"><a href="${esc(t.link)}" target="_blank" rel="noopener" class="btn-join">Visit Tool →</a><button class="btn-upvote" onclick="upvoteTool('${t.id}',this)">⬆️ Upvote</button><button class="report-btn" onclick="reportItem('${t.id}','tool')">🚩</button></div></div>`;
}
async function upvoteTool(id, btn) {
  try {
    const r = await fetch(`/api/tools/${id}/upvote`, { method:'POST' });
    if (r.ok) { const d = await r.json(); btn.textContent = `⬆️ ${d.upvotes}`; btn.disabled = true; btn.style.opacity = '0.5'; showToast('Upvoted! ⬆️','success'); }
  } catch(e) {}
}

// ─── PROJECTS ────────────────────────────────────────────
async function loadProjects() {
  const search = (document.getElementById('projectSearch')||{}).value || '';
  const params = new URLSearchParams(); if (search) params.set('search', search);
  try {
    const d = await (await fetch(`/api/projects?${params}`)).json();
    renderCards('projectsList', d, renderProjectCard, '💻', 'No projects yet.');
  } catch(e) {}
}
function renderProjectCard(p) {
  return `<div class="item-card"><div class="item-card-header"><div class="item-icon">${p.icon||'💻'}</div><div class="item-info"><h4>${esc(p.name)}</h4><div class="item-meta">⭐ ${p.stars} stars · ${new Date(p.createdAt).toLocaleDateString()}</div></div></div>${p.description?`<p class="item-desc">${esc(p.description)}</p>`:''}<div class="item-stack">${(p.stack||[]).map(s=>`<span class="stack-tag">${esc(s)}</span>`).join('')}</div><div class="item-actions">${p.repoLink?`<a href="${esc(p.repoLink)}" target="_blank" rel="noopener" class="btn-join" style="background:#333;color:#fff">GitHub →</a>`:''}${p.demoLink?`<a href="${esc(p.demoLink)}" target="_blank" rel="noopener" class="btn-join">Live Demo →</a>`:''}<button class="btn-upvote" onclick="starProject('${p.id}',this)">⭐ Star</button></div></div>`;
}
async function starProject(id, btn) {
  try {
    const r = await fetch(`/api/projects/${id}/star`, { method:'POST' });
    if (r.ok) { const d = await r.json(); btn.textContent = `⭐ ${d.stars}`; btn.disabled = true; btn.style.opacity='0.5'; showToast('Starred! ⭐','success'); }
  } catch(e) {}
}

// ─── FREE SOFTWARE ───────────────────────────────────────
async function loadSoftwares() {
  const search = (document.getElementById('swSearch')||{}).value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.software !== 'all') params.set('category', filters.software);
  if (swPlatformFilter !== 'all') params.set('platform', swPlatformFilter);
  try {
    const d = await (await fetch(`/api/softwares?${params}`)).json();
    renderCards('softwareList', d, renderSoftwareCard, '💾', 'No software yet. Share the first!');
  } catch(e) {}
}
function renderSoftwareCard(s) {
  const platIcons = { windows:'🪟', mac:'🍎', linux:'🐧', android:'🤖', ios:'📱', web:'🌐' };
  const plats = (s.platforms||['windows']).map(p=>`<span class="platform-badge">${platIcons[p]||'🖥️'} ${p}</span>`).join('');
  return `<div class="item-card">
    <div class="item-card-header"><div class="item-icon">${s.icon||'💾'}</div><div class="item-info"><h4>${esc(s.name)}</h4><div class="item-meta">v${esc(s.version||'1.0')} · ${esc(s.size||'?')}</div><span class="license-badge">${esc(s.license||'Freeware')}</span></div></div>
    <div class="platform-badges">${plats}</div>
    ${s.description?`<p class="item-desc">${esc(s.description)}</p>`:''}
    <div class="software-meta"><span>📥 ${(s.downloads||0).toLocaleString()} downloads</span><span>🗂️ ${s.category}</span></div>
    <div class="item-actions">
      <button class="btn-join" onclick="downloadSoftware('${s.id}','${esc(s.downloadLink||s.file||'')}',this)">📥 Download</button>
      <button class="report-btn" onclick="reportItem('${s.id}','software')">🚩 Report</button>
    </div>
    <div style="margin-top:0.5rem;font-family:var(--font-mono);font-size:0.58rem;color:var(--yellow);line-height:1.4">⚠️ Always scan with antivirus before installing.</div>
  </div>`;
}
async function downloadSoftware(id, url, btn) {
  try {
    const r = await fetch(`/api/softwares/${id}/download`, { method:'POST' });
    const d = await r.json();
    const link = d.downloadLink || d.file || url;
    if (link) { window.open(link, '_blank'); showToast('Download started! Scan with antivirus 🛡️', 'success'); }
    else showToast('No download link available.', '');
    btn.textContent = `📥 ${d.downloads} downloads`;
  } catch(e) {}
}

// ─── TRENDING ────────────────────────────────────────────
async function loadTrending() {
  try {
    const d = await (await fetch('/api/trending')).json();
    const c = document.getElementById('trendingContent');
    let html = '';
    if (d.groups?.length) html += `<div class="trending-section"><h3>🔥 Most Viewed WA Groups</h3><div class="trending-row">${d.groups.map(g=>`<div class="item-card"><span class="trending-badge">#TRENDING</span>${renderGroupCard(g).replace('<div class="item-card">','')}`).join('')}</div></div>`;
    if (d.tools?.length) html += `<div class="trending-section"><h3>⬆️ Top Voted Dev Tools</h3><div class="trending-row">${d.tools.map(t=>renderToolCard(t)).join('')}</div></div>`;
    if (d.projects?.length) html += `<div class="trending-section"><h3>⭐ Most Starred Projects</h3><div class="trending-row">${d.projects.map(p=>renderProjectCard(p)).join('')}</div></div>`;
    if (d.softwares?.length) html += `<div class="trending-section"><h3>📥 Most Downloaded Software</h3><div class="trending-row">${d.softwares.map(s=>renderSoftwareCard(s)).join('')}</div></div>`;
    c.innerHTML = html || '<div class="empty-state"><span>🔥</span><p>No trending content yet. Be the first to upload!</p></div>';
  } catch(e) {}
}

// ─── REACTIONS ───────────────────────────────────────────
async function react(itemId, emoji, btn) {
  try {
    const r = await fetch(`/api/react/${itemId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({emoji}) });
    const d = await r.json();
    btn.textContent = `${emoji} ${d.reactions[emoji]||1}`;
    btn.style.borderColor = 'var(--accent)';
    showToast(`Reacted with ${emoji}`, '');
  } catch(e) {}
}

// ─── REPORTS ─────────────────────────────────────────────
async function reportItem(itemId, itemType) {
  const reason = prompt('Why are you reporting this? (scam, spam, malware, inappropriate)');
  if (!reason) return;
  try {
    await fetch('/api/report', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({itemId,itemType,reason}) });
    showToast('Reported. Ntando Baileys will review it. 🛡️', 'success');
  } catch(e) {}
}

// ─── VIEW TRACKER ────────────────────────────────────────
async function trackView(type, id) {
  try { await fetch(`/api/${type}/${id}/view`, { method:'POST' }); } catch(e) {}
}

// ─── RENDER CARDS ────────────────────────────────────────
function renderCards(cid, data, fn, icon, emptyMsg) {
  const c = document.getElementById(cid); if (!c) return;
  if (!data.length) { c.innerHTML = `<div class="empty-state"><span>${icon}</span><p>${emptyMsg}</p></div>`; return; }
  c.innerHTML = data.map(fn).join('');
}

// ─── SUBMIT FORMS ────────────────────────────────────────
async function post(url, body) {
  return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
}
function showMsg(id, text, type) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = text; el.className = `form-msg ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'form-msg'; }, 5000);
}
function clearFields(ids) { ids.forEach(id => { const e = document.getElementById(id); if(e) e.value=''; }); }

async function submitGroup() {
  const name=val('g-name'), link=val('g-link'), desc=val('g-desc'), cat=val('g-cat'), icon=val('g-icon')||'💬';
  if (!name||!link) return showMsg('g-msg','Name and link required','error');
  const r = await post('/api/groups',{name,link,description:desc,category:cat,icon});
  const d = await r.json();
  if (!r.ok) return showMsg('g-msg',d.error,'error');
  showMsg('g-msg','✓ Group uploaded!','success'); clearFields(['g-name','g-link','g-desc','g-icon']); showToast('Group added! 💬','success'); loadStats();
}
async function submitChannel() {
  const name=val('c-name'), link=val('c-link'), desc=val('c-desc'), cat=val('c-cat'), icon=val('c-icon')||'📢';
  if (!name||!link) return showMsg('c-msg','Name and link required','error');
  const r = await post('/api/channels',{name,link,description:desc,category:cat,icon});
  const d = await r.json();
  if (!r.ok) return showMsg('c-msg',d.error,'error');
  showMsg('c-msg','✓ Channel uploaded!','success'); clearFields(['c-name','c-link','c-desc','c-icon']); showToast('Channel added! 📢','success'); loadStats();
}
async function submitPlaylist() {
  const name=val('p-name'), link=val('p-link'), desc=val('p-desc'), type=val('p-type'), platform=val('p-platform');
  if (!name) return showMsg('p-msg','Name required','error');
  const fd = new FormData();
  fd.append('name',name); fd.append('link',link); fd.append('description',desc);
  fd.append('type',type); fd.append('platform',platform);
  const file = document.getElementById('p-file')?.files[0];
  if (file) fd.append('file',file);
  const r = await fetch('/api/playlists',{method:'POST',body:fd});
  const d = await r.json();
  if (!r.ok) return showMsg('p-msg',d.error,'error');
  showMsg('p-msg','✓ Playlist uploaded!','success'); clearFields(['p-name','p-link','p-desc']); resetFileDrop(); showToast('Playlist added! 🎵','success'); loadStats();
}
async function submitTool() {
  const name=val('t-name'), link=val('t-link'), desc=val('t-desc'), cat=val('t-cat'), icon=val('t-icon')||'🔧';
  const tags=val('t-tags').split(',').map(s=>s.trim()).filter(Boolean);
  if (!name||!link) return showMsg('t-msg','Name and link required','error');
  const r = await post('/api/tools',{name,link,description:desc,category:cat,icon,tags});
  const d = await r.json();
  if (!r.ok) return showMsg('t-msg',d.error,'error');
  showMsg('t-msg','✓ Tool uploaded!','success'); clearFields(['t-name','t-link','t-desc','t-icon','t-tags']); showToast('Tool added! 🔧','success'); loadStats();
}
async function submitProject() {
  const name=val('pr-name'), repo=val('pr-repo'), demo=val('pr-demo'), desc=val('pr-desc'), icon=val('pr-icon')||'💻';
  const stack=val('pr-stack').split(',').map(s=>s.trim()).filter(Boolean);
  if (!name) return showMsg('pr-msg','Name required','error');
  const r = await post('/api/projects',{name,repoLink:repo,demoLink:demo,description:desc,stack,icon});
  const d = await r.json();
  if (!r.ok) return showMsg('pr-msg',d.error,'error');
  showMsg('pr-msg','✓ Project uploaded!','success'); clearFields(['pr-name','pr-repo','pr-demo','pr-desc','pr-stack','pr-icon']); showToast('Project added! 💻','success'); loadStats();
}
async function submitSoftware() {
  const name=val('sw-name'), link=val('sw-link'), desc=val('sw-desc'), cat=val('sw-cat'), version=val('sw-version'), size=val('sw-size'), license=val('sw-license'), icon=val('sw-icon')||'💾';
  const platforms = [...document.querySelectorAll('.sw-platform:checked')].map(i=>i.value);
  if (!name) return showMsg('sw-msg','Name required','error');
  const fd = new FormData();
  fd.append('name',name); fd.append('downloadLink',link); fd.append('description',desc);
  fd.append('category',cat); fd.append('version',version); fd.append('size',size);
  fd.append('license',license); fd.append('icon',icon);
  platforms.forEach(p => fd.append('platforms', p));
  const file = document.getElementById('sw-file')?.files[0];
  if (file) fd.append('file', file);
  const r = await fetch('/api/softwares',{method:'POST',body:fd});
  const d = await r.json();
  if (!r.ok) return showMsg('sw-msg',d.error,'error');
  showMsg('sw-msg','✓ Software shared!','success'); clearFields(['sw-name','sw-link','sw-desc','sw-version','sw-size','sw-icon']); document.getElementById('sw-file').value=''; resetSwFileDrop(); showToast('Software shared! 💾','success'); loadStats();
}

// ─── FILE DROP ───────────────────────────────────────────
function updateFileDrop(input) {
  const d = document.getElementById('fileDrop'); if (!d) return;
  if (input.files[0]) { d.querySelector('.file-drop-text').textContent = `📄 ${input.files[0].name}`; d.style.borderColor='var(--accent2)'; }
}
function resetFileDrop() {
  const d = document.getElementById('fileDrop'); if (!d) return;
  d.querySelector('.file-drop-text').textContent = 'Click or drag to upload';
  d.style.borderColor = ''; document.getElementById('p-file').value='';
}
function updateSwFileDrop(input) {
  const d = document.getElementById('swFileDrop'); if (!d) return;
  if (input.files[0]) { d.querySelector('.file-drop-text').textContent = `📦 ${input.files[0].name}`; d.style.borderColor='var(--accent2)'; }
}
function resetSwFileDrop() {
  const d = document.getElementById('swFileDrop'); if (!d) return;
  d.querySelector('.file-drop-text').textContent = 'Click or drag to upload installer';
  d.style.borderColor = '';
}

// ─── SOCKET.IO CHAT ──────────────────────────────────────
function initSocket() {
  socket = io();
  socket.on('connect', () => { mySocketId = socket.id; });
  socket.on('chat_message', appendChatMessage);
  socket.on('room_message', appendChatMessage);
  socket.on('chat_history', msgs => { document.getElementById('chatMessages').innerHTML = ''; msgs.forEach(appendChatMessage); scrollChat(); });
  socket.on('user_online', user => { addOnlineUser(user); appendSystemMsg(`${user.name} joined 👋`); updateOnlineCount(); });
  socket.on('user_offline', ({ id, name }) => { removeOnlineUser(id); appendSystemMsg(`${name} left`); updateOnlineCount(); });
  socket.on('online_count', n => { const el=document.getElementById('onlineCount'); if(el) el.textContent=n; const el2=document.getElementById('sidebarOnlineNum'); if(el2) el2.textContent=n; const st=document.getElementById('stat-online'); if(st) st.textContent=n; });
  socket.on('user_typing', ({ name, id }) => { if (id !== mySocketId) showTyping(`${name} is typing...`); });
  socket.on('user_stop_typing', () => clearTyping());
  socket.on('new_announcement', ann => { showToast(`📢 ${ann.title}`, 'success'); });
  socket.on('new_content', ({ type, data }) => { showToast(`New ${type}: ${data.name} 🆕`, ''); });
  socket.on('upvote_update', ({ id, upvotes }) => {
    const btn = document.querySelector(`[onclick*="'${id}'"]`);
    if (btn && btn.classList.contains('btn-upvote')) btn.textContent = `⬆️ ${upvotes}`;
  });
  // Video call events
  socket.on('call_offer', ({ from, offer, callerName }) => handleIncomingCall(from, offer, callerName));
  socket.on('call_answer', ({ from, answer }) => handleCallAnswer(answer));
  socket.on('ice_candidate', ({ from, candidate }) => { if (peerConn) peerConn.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{}); });
  socket.on('call_rejected', () => { showToast('Call rejected.',''); endCall(); });
  socket.on('call_ended', () => { showToast('Call ended.',''); endCall(); });
}

function joinChat() {
  const name = document.getElementById('chatNameInput').value.trim();
  if (!name) { showToast('Enter your name first!','error'); return; }
  myName = name;
  socket.emit('user_join', { name, avatar: '' });
  document.getElementById('joinForm').style.display = 'none';
  document.getElementById('chatInputArea').style.display = '';
  document.getElementById('chatMessages').innerHTML = '';
  appendSystemMsg(`Welcome, ${name}! 🎉`);
  if (currentRoom !== 'global') socket.emit('join_room', { roomId: currentRoom, name });
}

function switchRoom(roomId, btn) {
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentRoom = roomId;
  const names = { global:'🌍 Global Chat', dev:'💻 Dev Talk', music:'🎵 Music Room', gaming:'🎮 Gaming', random:'🎲 Random' };
  document.getElementById('chatRoomName').textContent = names[roomId] || roomId;
  document.getElementById('chatMessages').innerHTML = '';
  if (roomId === 'global') {
    socket.emit('user_join', { name: myName, avatar: '' });
  } else {
    socket.emit('join_room', { roomId, name: myName });
    appendSystemMsg(`Joined ${names[roomId]}`);
  }
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !socket || !myName) return;
  if (currentRoom === 'global') {
    socket.emit('chat_message', { text, replyTo: replyToMsg });
  } else {
    socket.emit('room_message', { roomId: currentRoom, text });
  }
  input.value = '';
  input.style.height = '';
  replyToMsg = null;
  document.getElementById('chatReplyPreview').style.display = 'none';
  socket.emit('typing_stop');
  clearTimeout(typingTimer);
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function handleTyping() {
  if (!socket || !myName) return;
  socket.emit('typing_start');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('typing_stop'), 2000);
}

function appendChatMessage(msg) {
  const c = document.getElementById('chatMessages'); if (!c) return;
  const isOwn = msg.userId === mySocketId;
  const initials = (msg.userName||'?').substring(0,2).toUpperCase();
  const time = new Date(msg.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const row = document.createElement('div');
  row.className = `msg-row ${isOwn?'own':''}`;
  row.innerHTML = `
    <div class="msg-avatar">${initials}</div>
    <div class="msg-bubble">
      ${!isOwn?`<div class="msg-name">${esc(msg.userName)}</div>`:''}
      ${msg.replyTo?`<div class="msg-reply-preview">↩️ Replying</div>`:''}
      <div class="msg-text">${esc(msg.text)}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;
  row.querySelector('.msg-bubble').addEventListener('dblclick', () => setReply(msg));
  c.appendChild(row);
  scrollChat();
}

function appendSystemMsg(text) {
  const c = document.getElementById('chatMessages'); if (!c) return;
  const d = document.createElement('div'); d.className = 'system-msg'; d.textContent = text;
  c.appendChild(d); scrollChat();
}

function scrollChat() {
  const c = document.getElementById('chatMessages');
  if (c) c.scrollTop = c.scrollHeight;
}

function setReply(msg) {
  replyToMsg = msg.id;
  const p = document.getElementById('chatReplyPreview');
  p.style.display = 'flex';
  p.innerHTML = `<span>↩️ Replying to ${esc(msg.userName)}: ${esc(msg.text.substring(0,60))}</span><button onclick="clearReply()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem">✕</button>`;
}
function clearReply() { replyToMsg = null; document.getElementById('chatReplyPreview').style.display='none'; }

function addOnlineUser(user) {
  const c = document.getElementById('onlineUsersList'); if (!c) return;
  const existing = document.getElementById('ou-'+user.id);
  if (existing) return;
  const d = document.createElement('div'); d.className='online-user'; d.id='ou-'+user.id;
  const initials = (user.name||'?').substring(0,2).toUpperCase();
  d.innerHTML = `<div class="user-avatar-small">${initials}</div><span class="user-name-small">${esc(user.name)}</span><div class="user-status-dot"></div><button class="call-user-btn" onclick="callUser('${user.id}','${esc(user.name)}')">📹</button>`;
  c.appendChild(d);
}
function removeOnlineUser(id) { const el=document.getElementById('ou-'+id); if(el) el.remove(); }
function updateOnlineCount() {}

function showTyping(text) { const el=document.getElementById('typingIndicator'); if(el) el.textContent=text; }
function clearTyping() { const el=document.getElementById('typingIndicator'); if(el) el.textContent=''; }

function toggleEmojiPicker() {
  const p = document.getElementById('emojiPicker');
  p.style.display = p.style.display === 'none' ? 'grid' : 'none';
}
function insertEmoji(e) {
  const input = document.getElementById('chatInput'); if (!input) return;
  input.value += e; input.focus();
  document.getElementById('emojiPicker').style.display = 'none';
}
function autoGrow(el) { el.style.height=''; el.style.height=Math.min(el.scrollHeight,120)+'px'; }

// ─── WEBRTC VIDEO CALLS ──────────────────────────────────
const ICE_SERVERS = { iceServers: [{ urls:'stun:stun.l.google.com:19302' }, { urls:'stun:stun1.l.google.com:19302' }] };

async function callUser(targetId, targetName) {
  if (!socket || !myName) { showToast('Join chat first to make calls!','error'); return; }
  if (peerConn) { showToast('Already in a call.','error'); return; }
  currentCallTarget = targetId;
  document.getElementById('remoteName').textContent = targetName;
  document.getElementById('videoCallTitle').textContent = `📹 Calling ${targetName}...`;
  document.getElementById('videoCallStatus').textContent = 'Ringing...';
  await startLocalVideo();
  showVideoOverlay();
  peerConn = createPeerConnection();
  localStream.getTracks().forEach(track => peerConn.addTrack(track, localStream));
  const offer = await peerConn.createOffer();
  await peerConn.setLocalDescription(offer);
  socket.emit('call_offer', { to: targetId, offer, callerName: myName });
}

function handleIncomingCall(from, offer, callerName) {
  pendingOffer = { from, offer };
  document.getElementById('incomingCallerName').textContent = callerName || 'Someone';
  document.getElementById('incomingCallOverlay').style.display = '';
}

async function acceptCall() {
  if (!pendingOffer) return;
  document.getElementById('incomingCallOverlay').style.display = 'none';
  currentCallTarget = pendingOffer.from;
  await startLocalVideo();
  showVideoOverlay();
  document.getElementById('videoCallTitle').textContent = '📹 Video Call';
  document.getElementById('videoCallStatus').textContent = 'Connected';
  peerConn = createPeerConnection();
  localStream.getTracks().forEach(track => peerConn.addTrack(track, localStream));
  await peerConn.setRemoteDescription(new RTCSessionDescription(pendingOffer.offer));
  const answer = await peerConn.createAnswer();
  await peerConn.setLocalDescription(answer);
  socket.emit('call_answer', { to: currentCallTarget, answer });
  pendingOffer = null;
}

function rejectCall() {
  if (pendingOffer) { socket.emit('call_reject', { to: pendingOffer.from }); pendingOffer = null; }
  document.getElementById('incomingCallOverlay').style.display = 'none';
}

async function handleCallAnswer(answer) {
  if (!peerConn) return;
  await peerConn.setRemoteDescription(new RTCSessionDescription(answer));
  document.getElementById('videoCallStatus').textContent = 'Connected ✅';
  document.getElementById('videoCallTitle').textContent = '📹 Video Call';
}

function createPeerConnection() {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  pc.onicecandidate = e => { if (e.candidate && currentCallTarget) socket.emit('ice_candidate', { to: currentCallTarget, candidate: e.candidate }); };
  pc.ontrack = e => {
    const rv = document.getElementById('remoteVideo');
    rv.srcObject = e.streams[0];
    document.getElementById('videoPlaceholder').style.display = 'none';
  };
  pc.onconnectionstatechange = () => {
    const s = document.getElementById('videoCallStatus');
    if (s) s.textContent = { connected:'Connected ✅', disconnected:'Disconnected', failed:'Connection Failed' }[pc.connectionState] || pc.connectionState;
  };
  return pc;
}

async function startLocalVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) {
    showToast('Camera/mic access denied. Check browser permissions.', 'error');
    localStream = null;
  }
}

function showVideoOverlay() { document.getElementById('videoCallOverlay').style.display = 'flex'; }

function endCall() {
  if (peerConn) { peerConn.close(); peerConn = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (currentCallTarget) { socket.emit('call_end', { to: currentCallTarget }); currentCallTarget = null; }
  document.getElementById('videoCallOverlay').style.display = 'none';
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('videoPlaceholder').style.display = 'flex';
}

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  document.getElementById('vcMic').textContent = micEnabled ? '🎤' : '🔇';
  document.getElementById('vcMic').classList.toggle('vcb--muted', !micEnabled);
}
function toggleCam() {
  if (!localStream) return;
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
  document.getElementById('vcCam').textContent = camEnabled ? '📷' : '📵';
  document.getElementById('vcCam').classList.toggle('vcb--muted', !camEnabled);
}

// ─── MATRIX RAIN ─────────────────────────────────────────
function initMatrix() {
  const canvas = document.getElementById('matrixCanvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  const chars = '01アイウエオカキクサシスタチツNABCDEFGHI{}[]<>/\\#@$%⬡🛡';
  const sz = 11; let cols = Math.floor(window.innerWidth/sz); let drops = Array(cols).fill(1);
  setInterval(() => {
    ctx.fillStyle='rgba(8,12,16,0.05)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#00e5ff'; ctx.font=`${sz}px JetBrains Mono,monospace`;
    drops.forEach((y,i) => {
      ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*sz,y*sz);
      if(y*sz>canvas.height && Math.random()>0.975) drops[i]=0; drops[i]++;
    });
  }, 60);
}

// ─── HELPERS ─────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function val(id) { const e=document.getElementById(id); return e?(e.value||'').trim():''; }
let _toastTimer;
function showToast(msg, type='') {
  const t=document.getElementById('toast'); t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(_toastTimer); _toastTimer=setTimeout(()=>{ t.className='toast'; },3500);
}
window.addEventListener('scroll',()=>{
  const n=document.getElementById('nav');
  if(n) n.style.background=window.scrollY>20?'rgba(8,12,16,0.97)':'rgba(8,12,16,0.85)';
});

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMatrix();
  initSocket();
  loadStats();
  loadAnnouncements();
});
