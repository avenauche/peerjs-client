// Use a random string if no hash is provided
var from = location.hash.substring(1) || (Math.random().toString(36).substring(2, 10));
document.getElementById("from").setAttribute("value", from);

const peer = new Peer(from, {
  host: '10.10.12.21', // Use your LAN IP for cross-browser and Docker compatibility
  port: 9000,
  path: '/myapp',
  secure: location.protocol === 'https:', // Use secure if on HTTPS
  debug: 3 // Enable verbose debug logging
});

// Autofill the 'to' field if a ?to= query param is present in the URL
var urlParams = new URLSearchParams(window.location.search);
var toParam = urlParams.get('to');
if (toParam) {
  document.getElementById('to').setAttribute('value', toParam);
}

// Store the current incoming call globally
var currentCall = null;

function callPeer() {
  var to = document.getElementById("to").getAttribute("value");
  if (!to) {
    alert('Please enter the peer ID to call.');
    return;
  }
  var localId = document.getElementById("local-video");
  var remoteId = document.getElementById("remote-video");
  var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  getUserMedia({ video: true, audio: true }, function (stream) {
    var call = peer.call(to, stream);
    if (!call) {
      console.error('Call could not be established.');
      return;
    }
    localId.srcObject = stream;
    localId.play();
    call.on('stream', function (remoteStream) {
      remoteId.srcObject = remoteStream;
      remoteId.play();
    });
    call.on('error', function (err) {
      console.error('Call error:', err);
    });
  }, function (err) {
    console.log('Failed to get local stream', err);
  });

}

peer.on('open', function (id) {
  console.log('My peer ID is: ' + id);
  document.getElementById("from").setAttribute("value", id);
  document.getElementById('status').innerText = 'Connected as ' + id;
});

peer.on('error', function (err) {
  console.error('PeerJS error:', err);
  // Handle error appropriately, e.g., show an error message to the user
});

peer.on('close', function () {
  console.log('Connection closed');

  // Handle connection closure, e.g., reset UI or notify the user
  document.getElementById("remote-video").srcObject = null;
  document.getElementById("local-video").srcObject = null;
  currentCall = null; // Reset the current call
  document.getElementById('incoming-call').classList.add('hidden'); // Hide incoming call UI
  document.getElementById("from").setAttribute("value", ""); // Clear the from value

});


peer.on('disconnected', function () {
  console.log('Disconnected from PeerJS server');
  // Handle disconnection, e.g., show a message or attempt to reconnect
  document.getElementById("remote-video").srcObject = null;
  document.getElementById("local-video").srcObject = null;
  currentCall = null; // Reset the current call
  document.getElementById('incoming-call').classList.add('hidden'); // Hide incoming call UI
  document.getElementById("from").setAttribute("value", ""); // Clear the from value
});

peer.on('call', function (call) {
  console.log('Incoming call from:', call.peer);
  currentCall = call;
  var incomingCallDiv = document.getElementById('incoming-call');
  incomingCallDiv.classList.remove('hidden');
  incomingCallDiv.style.display = 'block';
  document.getElementById('caller-id').textContent = call.peer;
  call.on('error', function (err) {
    console.error('Call error:', err);
  });
});

function answerCall() {
  // Hide incoming call UI immediately
  var incomingCallDiv = document.getElementById('incoming-call');
  incomingCallDiv.classList.add('hidden');
  incomingCallDiv.style.display = 'none';

  var localId = document.getElementById("local-video");
  var remoteId = document.getElementById("remote-video");
  var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (!currentCall) return;
  getUserMedia({ video: true, audio: true }, function (stream) {
    localId.srcObject = stream;
    localId.play();
    currentCall.answer(stream);
    currentCall.on('stream', function (remoteStream) {
      remoteId.srcObject = remoteStream;
      remoteId.play();
    });
    currentCall.on('close', function () {
      console.log('Call ended');
      remoteId.srcObject = null;
    });
    currentCall.on('error', function (err) {
      console.error('Call error:', err);
    });
  }, function (err) {
    console.log('Failed to get local stream', err);
  });
}


function hangUp() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
    document.getElementById("remote-video").srcObject = null;
  }
}

function declineCall() {
  // Hide incoming call UI
  var incomingCallDiv = document.getElementById('incoming-call');
  incomingCallDiv.classList.add('hidden');
  incomingCallDiv.style.display = 'none';
  // If a call is incoming, close it
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
}

// Listen for incoming data connections
peer.on('connection', function (conn) {
  conn.on('data', function (data) {
    console.log('Received data:', data);
      // Handle file transfer
      var blob = new Blob([data.buffer], { type: data.type });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = data.name;
      a.textContent = `Download ${data.name}`;
      a.onclick = async function (e) {
        e.preventDefault(); // Prevent default link behavior
        const handle = await window.showSaveFilePicker({
          suggestedName: data.name,
          types: [{
            description: data.type,
            accept: { [data.type]: [`.${data.name.split('.').pop()}`] }
          }]
        });

        // Write the blob to file
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return false; // Prevent default link behavior
      }
      // a.rel = 'noopener noreferrer';
      // a.target = '_blank';
      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);
      // URL.revokeObjectURL(url);
      document.getElementById('download-link').appendChild(a);
      document.getElementById('status').innerText = `Received file: ${data.name}`;
    
  });
  conn.on('open', function () {
    console.log('DataConnection open with peer:', conn.peer);
  });
});

function shareFile() {
  var fileInput = document.getElementById('file-input');
  var file = fileInput.files[0];
  if (!file) {
    alert('Please select a file to share.');
    return;
  }
  var to = document.getElementById("to").getAttribute("value");
  if (!to) {
    alert('Please enter the peer ID to send the file to.');
    return;
  }
  var conn = peer.connect(to);
  conn.on('open', function () {
    const reader = new FileReader();
    reader.onload = function () {
      conn.send({
        type: file.type,
        name: file.name,
        size: file.size,
        buffer: reader.result
      });
      document.getElementById('status').innerText = `Sending file... ${file.name}`;
    };
    reader.readAsArrayBuffer(file);
  });
  conn.on('error', function (err) {
    console.error('DataConnection error:', err);
    document.getElementById('status').innerText = 'Failed to send file.';
  });
}

// Attach declineCall to the Decline button
document.getElementById('decline-btn').onclick = declineCall;

document.getElementById('call-btn').onclick = callPeer;
document.getElementById('send-btn').onclick = shareFile;