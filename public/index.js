document.addEventListener("DOMContentLoaded", async function () {
    let incomingCallType = null;
    User.connect({
        from: User.from, // Use the from method to get the user's ID from the URL hash
        to: User.to, // Use the to method to get the peer ID from the URL query parameter
        host: "10.10.12.29", // Use your LAN IP for cross-browser and Docker compatibility
        port: 9000,
        path: "/myapp",
        secure: true,
        localVideoId: "local-video",
        remoteVideoId: "remote-video"
    });

    function makeVideoCall() {
        makeCall('video')
    }

    function makeAudioCall() {
        makeCall('audio')
    }

    async function makeCall(callType) {
        const localstream = await User.getLocalstream(callType);
        let localId = document.getElementById("local-video");
        await User.playStream(localId, localstream);

        User.makeCall(User.to, localstream, async function (remoteStream) {
            let remoteId = document.getElementById("remote-video");
            await User.playStream(remoteId, remoteStream);
        })
    }

    function showCallNotification(event) {
        incomingCallType = event.detail.callType;
        var incomingCallDiv = document.getElementById('incoming-call');
        incomingCallDiv.classList.remove('hidden');
        incomingCallDiv.style.display = 'block';
    }

    function hideCallNotification(event) {
        var incomingCallDiv = document.getElementById('incoming-call');
        incomingCallDiv.classList.add('hidden');
        incomingCallDiv.style.display = 'none';
    };


    async function answerCall() {
        hideCallNotification();

        User.answerCall({
            stream: await User.getLocalstream(incomingCallType)
        }, async (remoteStream) => {
            const localstream = await User.getLocalstream(incomingCallType);
            let localId = document.getElementById("local-video");
            await User.playStream(localId, localstream);

            let remoteId = document.getElementById("remote-video");
            await User.playStream(remoteId, remoteStream);
        });
    }


    function declineCall() {
        hideCallNotification();
        User.declineCall();
    }

    function hangupCall() {
        hideCallNotification();
        User.hangupCall();
    }


    function sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        if (message) {
            User.sendMessage(message);
            messageInput.value = ''; // Clear the input field after sending
        }
    }


    async function sendFile() {
        const file = document.getElementById('file-input').files[0];
        const passphrase = document.getElementById('passphrase-input').value;
        if (!file) {
            console.warn("No file selected");
            return;
        }
        if (!passphrase) {
            alert("Passphrase is required for file encryption and JWT.");
            return;
        }
        // Derive JWT secret from passphrase using PBKDF2 (same salt as file key, or a new one)
        // We'll use a fixed salt for JWT key derivation for demo, but in production use a user/session-specific salt
        const enc = new TextEncoder();
        const jwtSalt = enc.encode('jwt-static-salt'); // Use a static salt for JWT key derivation (for demo only)
        const jwtKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(passphrase),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const derivedJwtKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: jwtSalt,
                iterations: 100000,
                hash: "SHA-512"
            },
            jwtKey,
            { name: "HMAC", hash: "SHA-512", length: 512 },
            true,
            ["sign", "verify"]
        );
        // Export the derived key as a string for use in wrapper.js
        const rawJwtKey = await window.crypto.subtle.exportKey("raw", derivedJwtKey);
        const jwtSecret = Array.from(new Uint8Array(rawJwtKey)).map(b => String.fromCharCode(b)).join("");
        User.sendFiles(file, passphrase, jwtSecret);
    }

    window.addEventListener("showCallNotification", showCallNotification);
    document.getElementById('video-call-btn').onclick = makeVideoCall;
    document.getElementById('audio-call-btn').onclick = makeAudioCall;
    document.getElementById('hangup-btn').onclick = hangupCall;
    document.getElementById('answer-btn').onclick = answerCall;
    document.getElementById('decline-btn').onclick = declineCall;
    
    
    document.getElementById('send-message-btn').onclick = sendMessage;
    document.getElementById('send-file-btn').onclick = sendFile;

})


