# ⬡ NtandoStore Tech — Dev Hub

**The ultimate developer community platform.** Share WhatsApp groups, channels, playlists, open-source tools, and projects — all in one powerful hub.

---

## 🚀 Features

- **WhatsApp Groups** — Share and discover developer WA groups by category
- **WhatsApp Channels** — Follow and share WA channels for news, tutorials & more
- **Playlists** — Share Spotify, YouTube, Apple Music, SoundCloud playlists or upload files
- **Dev Tools** — Community-curated developer tools with upvoting
- **Projects** — Showcase open-source projects with GitHub links and live demos
- **Upload Hub** — Single upload interface for all content types
- **Live Search & Filtering** — Filter by category across all sections
- **Live Stats Counter** — Real-time community stats
- **Announcements** — Pinned community announcements
- **Matrix Rain Background** — Cyberpunk terminal aesthetic 🌧️

---

## 📦 Deploy on Render.com

### Option 1 — Deploy via GitHub (Recommended)

1. Push this project to GitHub
2. Go to [render.com](https://render.com) and create a new account
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Render auto-detects the `render.yaml` config
6. Click **Deploy** — it's live in ~2 minutes! 🎉

### Option 2 — Manual Setup on Render

| Setting | Value |
|---|---|
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free |

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

---

## 📁 Project Structure

```
ntandostore-tech/
├── server.js          # Express API server
├── package.json       # Node.js config
├── render.yaml        # Render.com deployment config
├── .gitignore
├── public/
│   ├── index.html     # Main HTML
│   ├── style.css      # Styling (dark terminal theme)
│   └── app.js         # Frontend JavaScript
└── uploads/           # Uploaded files (auto-created)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Community statistics |
| GET | `/api/announcements` | Announcements list |
| GET | `/api/groups` | List WA groups |
| POST | `/api/groups` | Add a WA group |
| GET | `/api/channels` | List WA channels |
| POST | `/api/channels` | Add a WA channel |
| GET | `/api/playlists` | List playlists |
| POST | `/api/playlists` | Add/upload playlist |
| GET | `/api/tools` | List dev tools |
| POST | `/api/tools` | Add dev tool |
| POST | `/api/tools/:id/upvote` | Upvote a tool |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Add project |

---

## 🎨 Tech Stack

- **Backend**: Node.js + Express
- **File Uploads**: Multer
- **Frontend**: Vanilla HTML/CSS/JS (no framework needed)
- **Fonts**: Syne + JetBrains Mono + Space Mono
- **Aesthetic**: Dark terminal, neon cyan accents, matrix rain

---

## 📌 Notes

- Data is stored **in-memory** by default (resets on restart)
- For production persistence, replace the `store` object with MongoDB, PostgreSQL, or any DB
- Uploaded files are stored in `/uploads/` directory

---

**Built with ❤️ by NtandoStore Tech**
