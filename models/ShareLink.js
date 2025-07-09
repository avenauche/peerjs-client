const mongoose = require('mongoose');

const ShareLinkSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  rules: {
    click: { type: mongoose.Schema.Types.Mixed, required: true }, // can be number or "many"
    ttl: { type: String, required: true },
    "accept-ip": [String]
  },
  clickCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShareLink', ShareLinkSchema);
