# PeerJS Secure P2P Client & Server

A **self-hosted PeerJS + WebRTC project** that enables **peer-to-peer video/audio calls and file sharing**, combined with a **secure, rule-based share-link system** (TTL, click limits, IP whitelist).

The server is used **only for signaling and access control**.  
All media and file data flows **directly between browsers**, encrypted end-to-end by WebRTC.

---

## What This Project Is

- 🔗 PeerJS signaling server over HTTPS
- 🎥 Browser-based 1-to-1 video & audio calling
- 📁 Direct peer-to-peer file transfer
- 🔐 Secure share links with:
  - Time-to-live (TTL)
  - Click limits
  - IP whitelisting
- 🧠 MongoDB-backed access control
- 🏠 LAN / on-prem / Docker-friendly

---

## What This Project Is NOT

- ❌ No media relay server
- ❌ No TURN server (direct P2P only)
- ❌ No group calls
- ❌ No authentication or user accounts
- ❌ No server-side file storage

This project is intentionally **minimal, explicit, and privacy-first**.

---

## High-Level Architecture

```
Browser A  ←──────── encrypted WebRTC ────────→  Browser B
    │                                                 │
    └──── HTTPS signaling + rules validation ───┐
                                                │
                                   Express + PeerJS Server
                                                │
                                             MongoDB
```

---

## Features

### Peer-to-Peer Communication
- One-to-one video & audio calls
- Manual accept / decline / hang-up
- Automatic cleanup on disconnect
- Works on LAN and over the internet

### Peer-to-Peer File Sharing
- Direct WebRTC DataChannel transfer
- No server storage
- Native “Save As” file picker
- Any file type supported (browser limits apply)

### Secure Share Links (Server-Side)
- Time-limited access (`10s`, `5min`, `2h`, etc.)
- Click-limited or unlimited access
- IP-whitelisted access
- Click tracking stored in MongoDB

---

## Privacy & Encryption

### Media & File Encryption
- Uses **WebRTC mandatory encryption**
- **DTLS-SRTP** for audio/video
- **DTLS** for data channels
- **AES-GCM + ECDHE**
- Perfect Forward Secrecy

> The server never sees audio, video, or file contents.

### What the Server Can See
- Peer IDs
- Connection events
- Share-link metadata

### What the Server Cannot See
- Media streams
- File contents
- Encryption keys

---

## Repository Structure

```
.
├── server.js              # Express + PeerJS server
├── models/
│   └── ShareLink.js       # MongoDB share-link schema
├── public/
│   ├── index.html         # Client UI
│   └── client.js          # PeerJS client logic
├── ssl/
│   ├── cert.pem
│   └── key.pem
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- SSL certificates (self-signed is fine for development)

### Install
```bash
npm install
```

### Run
```bash
node server.js
```

Server runs at:
```
https://localhost:3000
```

---

## Contributing

Contributions are welcome if they respect the core principles:

- Privacy-first
- P2P-first
- Minimal dependencies
- Explicit user control

Please avoid turning this into a media relay or account-based system.

---



