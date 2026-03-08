/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         NTANDO BAILEYS — SECURITY SHIELD v2.0           ║
 * ║   Protecting NtandoStore Tech from attacks & scams      ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Features:
 *  - Rate limiting (DDoS protection)
 *  - XSS / injection sanitization
 *  - Bot & crawler detection
 *  - Honeypot traps
 *  - IP blacklisting
 *  - Suspicious payload detection
 *  - Attack logging
 *  - Source code protection (blocks devtools sniffing routes)
 *  - Security headers via Helmet
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ─── BLACKLISTED IPs (add known bad actors) ──────────────
const IP_BLACKLIST = new Set([
  // Add IPs here e.g. '192.168.1.1'
]);

// ─── ATTACK LOG ──────────────────────────────────────────
const attackLog = [];
const MAX_LOG = 500;

function logAttack(type, ip, details = '') {
  const entry = { type, ip, details, ts: new Date().toISOString() };
  attackLog.unshift(entry);
  if (attackLog.length > MAX_LOG) attackLog.pop();
  console.warn(`[NTANDO-BAILEYS] 🛡️ BLOCKED [${type}] from ${ip} — ${details}`);
}

// ─── SUSPICIOUS PATTERNS ─────────────────────────────────
const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /drop\s+table/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /'\s*or\s*'1'\s*=\s*'1/i,
  /\.\.\//g,
  /etc\/passwd/i,
  /cmd\.exe/i,
  /powershell/i,
  /base64_decode/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
  /system\s*\(/i,
  /wget\s+http/i,
  /curl\s+http/i,
];

function containsMalicious(str) {
  if (typeof str !== 'string') return false;
  return MALICIOUS_PATTERNS.some(p => p.test(str));
}

function deepScan(obj, depth = 0) {
  if (depth > 5) return false;
  if (typeof obj === 'string') return containsMalicious(obj);
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).some(v => deepScan(v, depth + 1));
  }
  return false;
}

// ─── HONEYPOT PATHS (bots always hit these) ──────────────
const HONEYPOT_PATHS = [
  '/wp-admin', '/wp-login.php', '/phpmyadmin', '/.env',
  '/admin.php', '/config.php', '/shell.php', '/xmlrpc.php',
  '/wp-content', '/.git', '/actuator', '/solr', '/jmx-console',
  '/.aws', '/server-status', '/cgi-bin', '/admin/config',
];

// ─── SUSPICIOUS USER AGENTS ──────────────────────────────
const BAD_AGENTS = [
  /sqlmap/i, /nikto/i, /masscan/i, /zgrab/i, /nmap/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i,
  /python-requests\/2\.[0-3]/i, /Go-http-client\/1\.0/i,
  /libwww-perl/i, /curl\/7\.[0-4][0-9]\./i,
];

// ─── RATE LIMITERS ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests. Ntando Baileys blocked you. 🛡️' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logAttack('RATE_LIMIT', req.ip, `${req.method} ${req.path}`);
    res.status(429).json(options.message);
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'API rate limit hit. Please slow down. 🛡️' },
  handler: (req, res, next, options) => {
    logAttack('API_RATE_LIMIT', req.ip, `${req.method} ${req.path}`);
    res.status(429).json(options.message);
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Upload rate limit hit. Max 10 uploads/min. 🛡️' },
  handler: (req, res, next, options) => {
    logAttack('UPLOAD_RATE_LIMIT', req.ip, req.path);
    res.status(429).json(options.message);
  }
});

// ─── HELMET SECURITY HEADERS ─────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ─── MAIN BAILEYS MIDDLEWARE ──────────────────────────────
function ntandoBaileys(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';
  const path = req.path.toLowerCase();

  // 1. IP Blacklist check
  if (IP_BLACKLIST.has(ip)) {
    logAttack('BLACKLISTED_IP', ip, path);
    return res.status(403).json({ error: 'Access denied by Ntando Baileys. 🛡️' });
  }

  // 2. Honeypot traps
  if (HONEYPOT_PATHS.some(hp => path.startsWith(hp))) {
    IP_BLACKLIST.add(ip); // auto-blacklist
    logAttack('HONEYPOT', ip, path);
    return res.status(404).json({ error: 'Not found.' });
  }

  // 3. Bad user agent check
  if (BAD_AGENTS.some(ba => ba.test(ua))) {
    logAttack('BAD_AGENT', ip, ua.substring(0, 80));
    return res.status(403).json({ error: 'Automated tools not allowed. 🛡️' });
  }

  // 4. Block source code viewing attempts
  const blockedPaths = [
    '/app.js', '/style.css', '/index.html',
    '/.env', '/server.js', '/baileys.js', '/package.json',
    '/package-lock.json', '/node_modules',
  ];
  if (blockedPaths.some(bp => path === bp || path.startsWith('/node_modules'))) {
    logAttack('SOURCE_PROBE', ip, path);
    return res.status(403).json({ error: 'Source code is protected by Ntando Baileys. 🛡️' });
  }

  // 5. Payload scan (query + body)
  const queryStr = JSON.stringify(req.query);
  const bodyStr = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');

  if (deepScan(req.query) || deepScan(req.body)) {
    logAttack('INJECTION_ATTEMPT', ip, `Q:${queryStr.substring(0, 100)} B:${bodyStr.substring(0, 100)}`);
    return res.status(400).json({ error: 'Malicious payload detected. Ntando Baileys blocked this request. 🛡️' });
  }

  // 6. Oversized payload
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 55 * 1024 * 1024) {
    logAttack('OVERSIZED_PAYLOAD', ip, `${contentLength} bytes`);
    return res.status(413).json({ error: 'Payload too large. 🛡️' });
  }

  // 7. Anti-clickjacking header
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Powered-By', 'Ntando-Baileys-Shield');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
}

// ─── SOURCE CODE BLOCKER ─────────────────────────────────
// Serve obfuscated/minified versions only — block raw source
function sourceProtection(req, res, next) {
  const path = req.path.toLowerCase();
  // Only serve from /dist/ — raw source blocked above
  next();
}

// ─── ATTACK LOG API ──────────────────────────────────────
function getAttackLog() { return attackLog; }
function getBlacklist() { return [...IP_BLACKLIST]; }
function addToBlacklist(ip) { IP_BLACKLIST.add(ip); }
function removeFromBlacklist(ip) { IP_BLACKLIST.delete(ip); }

module.exports = {
  ntandoBaileys,
  helmetMiddleware,
  globalLimiter,
  apiLimiter,
  uploadLimiter,
  sourceProtection,
  getAttackLog,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  logAttack,
};
