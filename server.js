const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const { ExpressPeerServer } = require('peer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// SSL options
const options = {
  key: fs.readFileSync("./ssl/key.pem"),
  cert: fs.readFileSync("./ssl/cert.pem"),
};

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/ipwhitelist', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Load ShareLink model
const ShareLink = require('./models/ShareLink');

// Utility functions
function parseTTL(ttl) {
  if (!ttl) return Infinity;
  const num = parseInt(ttl);
  if (ttl.includes("min")) return num * 60 * 1000;
  if (ttl.includes("h")) return num * 60 * 60 * 1000;
  if (ttl.includes("s")) return num * 1000;
  return Infinity;
}

function normalizeIP(ip) {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

// Middleware for /share
app.use('/share', async (req, res, next) => {
  try {
    // Extract ID from URL
    const parts = req.path.split('/').filter(Boolean);
    const shareId = parts[0];

    if (!shareId) {
      return res.status(400).json({ error: 'No share ID provided' });
    }

    console.log(`➡️ Checking share ID: ${shareId}`);

    // Load from DB
    const share = await ShareLink.findById(shareId);
    if (!share) {
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    const { rules, clickCount, createdAt } = share;

    // TTL check
    const ttlMs = parseTTL(rules.ttl);
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (ageMs > ttlMs) {
      return res.status(403).json({ error: 'Link has expired (TTL exceeded)' });
    }

    // Click limit check
    if (rules.click !== 'many' && typeof rules.click === 'number') {
      if (clickCount >= rules.click) {
        return res.status(403).json({ error: 'Link click limit exceeded' });
      }
    }

    // IP whitelist check
    const requesterIP = normalizeIP(req.ip);
    console.log(`Requester IP: ${requesterIP}`);

    const normalizedWhitelist = rules["accept-ip"].map(normalizeIP);
    if (normalizedWhitelist.length > 0 && !normalizedWhitelist.includes(requesterIP)) {
      return res.status(403).json({ error: `Your IP (${requesterIP}) is not allowed` });
    }

    // All checks pass
    await ShareLink.findByIdAndUpdate(shareId, { $inc: { clickCount: 1 } });

    console.log(`Access granted. Incremented clickCount.`);
    req.share = share;
    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error validating share link' });
  }
});

// Route to serve the file metadata
app.get('/share/:id', (req, res) => {
  const share = req.share;

  if (!share) {
    return res.status(500).json({ error: 'No share config found after middleware' });
  }

  res.json({
    message: `File is ready to download`,
    filePath: share.filePath,
    currentClicks: share.clickCount + 1,
    remainingClicks: share.rules.click === 'many'
      ? 'unlimited'
      : (share.rules.click - (share.clickCount + 1))
  });
});

//  Serve static assets
app.use(express.static('public'));

//  HTTPS Server
const server = https.createServer(options, app);

//  PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});
app.use('/peerjs', peerServer);

//  Start
server.listen(PORT, () =>
  console.log(`🚀 HTTPS server listening at https://localhost:${PORT}`)
);
