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

// code to add config into db
//   .then(async () => {
//   console.log('MongoDB connected');

//   const config = {
//     fromID: 'a', 
//     rules: {
//       click: 5,                     // allow 5 total clicks
//       ttl: '24h',                   // time to live
//       'accept-ip': ['10.10.12.19'], // whitelist
//     },
//     clickCount: 0,
//   };

//   try {
//     // Create or overwrite config
//     const result = await ShareLink.findOneAndUpdate(
//       { fromID: config.fromID },
//       config,
//       { upsert: true, new: true }
//     );
//     console.log('Config saved:', result);
//   } catch (err) {
//     console.error('Error saving config:', err);
//   }
// })
// .catch(err => {
//   console.error('MongoDB connection error:', err);
// });


// Load ShareLink model
const ShareLink = require('./models/ShareLink');


// Serve main public folder
app.use('/', express.static(path.join(__dirname, 'public')));

// Serve 2FA static site
app.use('/totp', express.static(path.join(__dirname, 'totp', 'public')));

// Serve FlexStart UI
app.use('/ui', express.static(path.join(__dirname, 'ui')));

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

app.use('/share/:id/:to', async (req, res) => {
  try {
    const to = req.params.to;
    const shareId = to; // dynamically use the URL param --> id who sent the file
    console.log("got the to id :",to);
    console.log(`➡️ Checking share ID: ${shareId}`);

    const share = await ShareLink.findOne({ fromID: shareId });
    if (!share) {
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    // TTL check
    const ttlMs = parseTTL(share.rules.ttl);
    const ageMs = Date.now() - new Date(share.createdAt).getTime();
    if (ageMs > ttlMs) {
      return res.status(403).json({ error: 'Link has expired (TTL exceeded)' });
    }

    // Click limit check
    if (share.rules.click !== 'many' && typeof share.rules.click === 'number') {
      if (share.clickCount >= share.rules.click) {
        return res.status(403).json({ error: 'Link click limit exceeded' });
      }
    }

    // IP whitelist check
    const requesterIP = normalizeIP(req.ip || req.connection.remoteAddress);
    const normalizedWhitelist = (share.rules["accept-ip"] || []).map(normalizeIP);
    if (normalizedWhitelist.length > 0 && !normalizedWhitelist.includes(requesterIP)) {
      return res.status(403).json({ error: `Your IP (${requesterIP}) is not allowed` });
    }

    // ✅ All checks pass
    await ShareLink.updateOne({ fromID: shareId }, { $inc: { clickCount: 1 } });
    console.log(`✅ Access granted.`);

    return res.status(200).json({ message: "Access granted" });

  } catch (err) {
    console.error('❌ Error in /share route:', err);
    res.status(500).json({ error: 'Internal server error validating share link' });
  }
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
