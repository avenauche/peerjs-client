const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  totpSecret: String,
  firstStep: String,
  secondSTep:String,
  isregistered: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);
