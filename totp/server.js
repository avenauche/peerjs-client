const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const otplib = require('otplib');
const qrcode = require('qrcode');
const path = require('path');
const User = require('./models/user');

mongoose.connect('mongodb://127.0.0.1:27017/2faapp');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Check username
app.post('/check', async (req, res) => {
  const { username } = req.body;
  let user = await User.findOne({ username });

  if (!user) {
    const secret = otplib.authenticator.generateSecret();
    const otpauth = otplib.authenticator.keyuri(username, '2FA-App', secret);
    const qrImage = await qrcode.toDataURL(otpauth);

    user = new User({ username, secret });
    await user.save();

    return res.send(`
      <script>
        sessionStorage.setItem('username', '${username}');
        sessionStorage.setItem('qrImage', '${qrImage}');
        location.href = '/qr.html';
      </script>
    `);
  }

  if (!user.registered && user.verifiedOnce) {
    return res.send(`
      <script>
        sessionStorage.setItem('username', '${username}');
        location.href = '/step2.html';
      </script>
    `);
  }

  if (user.registered) {
    return res.send(`
      <script>
        sessionStorage.setItem('username', '${username}');
        location.href = '/login.html';
      </script>
    `);
  }
});

// Verify TOTP
app.post('/verify', async (req, res) => {
  const { username, token } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.send('❌ User not found <a href="/verify">back</a>');
  const isValid = otplib.authenticator.check(token, user.secret);

  if (!isValid) return res.send('❌ Invalid token, try again <a href="/login.html">back</a>');

  if (!user.registered && !user.verifiedOnce) {
    user.verifiedOnce = true;
    await user.save();

    return res.send(`
      <script>
        sessionStorage.setItem('username', '${username}');
        location.href = '/step2.html';
      </script>
    `);
  }

  if (!user.registered && user.verifiedOnce) {
    user.registered = true;
    await user.save();
    return res.redirect('/');
  }

  res.send(`✅ Welcome back, ${username}! You are logged in.`);
});

app.listen(3000, () => console.log('🚀 Server running at http://localhost:3000'));
