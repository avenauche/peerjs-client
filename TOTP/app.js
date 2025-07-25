const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('./models/user');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // ✅ Added for views path

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ✅ Fix: use TOTP app's views folder

mongoose.connect('mongodb+srv://sabarivasan216:Sabari2004*@cluster0.lscwxwv.mongodb.net/Totp');

// Render register form
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Handle registration
app.post('/register', async (req, res) => {
    const { username } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.render('register', { error: 'Username already exists. Please choose a different one.' });
    }

    const secret = speakeasy.generateSecret({ name: `burnabl:(${username})` });
    let userId;
    let exists = true;

    while (exists) {
        userId = uuidv4().replace(/-/g, '').slice(0, 16); // 16-character alphanumeric ID
        exists = await User.findOne({ userId }); // Ensure uniqueness
    }

    const user = new User({
        userId,
        username,
        totpSecret: secret.base32,
    });

    await user.save();

    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    res.render('verify', { username, qrCodeDataURL, step: 1 });
});

// Handle first OTP
app.post('/verify-step1', async (req, res) => {
    const { username, token } = req.body;
    const user = await User.findOne({ username });

    const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token,
        window: 1,
    });

    if (verified) {
        user.firstStep = "verified";
        await user.save();
        res.render('verify', { username, step: 2, qrCodeDataURL: null });
    } else {
        res.send('Invalid first OTP. Try again.');
    }
});

// Handle second OTP
app.post('/verify-step2', async (req, res) => {
    const { username, token } = req.body;
    const user = await User.findOne({ username });

    if (user.firstStep !== "verified") return res.send('First OTP not verified.');

    const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token,
        window: 1,
    });

    if (verified) {
        user.isregistered = true;
        user.secondSTep = "verified";
        await user.save();
        res.send('User fully verified and registered successfully!');
    } else {
        res.send('Invalid second OTP.');
    }
});

app.get('/', (req, res) => {
    res.redirect('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/verify-login', async (req, res) => {
    const { username, token } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        return res.send('User not found.');
    }

    const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token,
        window: 1,
    });

    if (verified) {
        res.send(`Login verified! ✅ Welcome back, ${username}! You are logged in.`);
    } else {
        res.send('Invalid OTP.');
    }
});

// ✅ Do not start a new server; this app will be mounted in main app
module.exports = app;
