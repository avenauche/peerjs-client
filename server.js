const express = require('express');
const https = require('https');
const fs = require("fs");
const { ExpressPeerServer } = require('peer');

const app = express();

const options = {
    key: fs.readFileSync("./ssl/key.pem"),
    cert: fs.readFileSync("./ssl/cert.pem"),
};

const server = https.createServer(options, app);


const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});

app.use('/peerjs', peerServer);
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server listening at http://localhost:${PORT}`)
);
