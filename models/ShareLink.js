const mongoose = require('mongoose');

const ShareLinkSchema = new mongoose.Schema({
  fromID: { type: String, required: true, unique: true },
  rules: {
    click: { type: mongoose.Schema.Types.Mixed, required: true },
    ttl: { type: String, required: true },
    "accept-ip": { type: [String], default: [] },
  },
  clickCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ShareLink', ShareLinkSchema);
