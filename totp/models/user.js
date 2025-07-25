 
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  secret: String,
  verifiedOnce: { type: Boolean, default: false },
  registered: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
