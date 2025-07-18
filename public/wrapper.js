const User = (function () {

    let peer = null;
    let dataConnection = null;
    let currentCall = null;
    let localVideoId = null;
    let remoteVideoId = null;
    let messageQueue = [];

    const searchParams = new URLSearchParams(window.location.search);
    let from = searchParams.has("from") ? searchParams.get('from') : "";
    let to = searchParams.has("to") ? searchParams.get('to') : "";

    async function getLocalstream(callType) {
        let constraints = { video: true, audio: true };
        if (callType === 'audio') {
            constraints = { video: false, audio: true };
        }
        return await Util.getLocalMedia(constraints)
    }

    async function playStream(videoElementId, stream) {
        await Util.playStream(videoElementId, stream)
    }

    function showIncomingCallNotification(data) {
        const event = new CustomEvent("showCallNotification", {
            detail: data, // pass any custom data here
        });
        window.dispatchEvent(event);
    }

    function connect(options) {

        localVideoId = document.getElementById(options.localVideoId);
        remoteVideoId = document.getElementById(options.remoteVideoId);

        if (!peer) {
            peer = new Peer(options.from, {
                host: options.host,
                port: options.port,
                path: options.path,
                secure: (location.protocol === 'https:'),
                debug: 3, // Enable verbose debug logging
            });
        }

        peer.on('open', function (id) {
            console.log('My peer ID is: ' + id);
            document.getElementById("from").setAttribute("value", id);
            document.getElementById('status').innerText = 'Connected as ' + id;


            if (to) {
                console.log("Trying to connect to peer:", to);
                dataConnection = peer.connect(to);

                dataConnection.on('open', function () {
                    console.log("DataConnection to", to, "opened!");

                    console.log('Data connection established with ' + to);

                    dataConnection.on('error', function (err) {
                        console.error('Connection error:', err);
                    });

                    while (messageQueue.length > 0) {
                        const msg = messageQueue.shift();
                        dataConnection.send(msg);
                        console.log('Queued message sent:', msg);
                    }
                });

                dataConnection.on('data', function (data) {
                    console.log('Data received (incoming):', data);
                    if (data.type === 'message') {
                        receiveMessage(data);
                    } else {
                        receiveFiles(data);
                    }
                });

                dataConnection.on('close', function () {
                    console.log("DataConnection to", to, "closed");
                    dataConnection = null;
                });
            }


            peer.on('connection', function (conn) {
                console.log("Received DataConnection from:", conn.peer);
                dataConnection = conn;

                conn.on('open', function () {
                    console.log("DataConnection opened!");
                });

                conn.on('data', function (data) {
                    console.log('Data received (incoming):', data);
                    if (data.type === 'message') {
                        receiveMessage(data);
                    } else {
                        receiveFiles(data);
                    }
                });

                conn.on('close', function () {
                    console.log("DataConnection closed");
                    dataConnection = null;
                });

                conn.on('error', function (err) {
                    console.error('Connection error (incoming):', err);
                });
            });
        });

        peer.on('call', function (call) {
            currentCall = call;

            showIncomingCallNotification({
                from: call.peer,
                to: User.from,
                callType: call.metadata.callType,
            });
        })

    }

    function makeCall(to, localstream, cb) {
        var call = peer.call(to, localstream);
        currentCall = call;
        currentCall.metadata = { callType: localstream.getVideoTracks().length > 0 ? 'video' : 'audio' };
        call.on('stream', function (remoteStream) {
            cb(remoteStream);
        });

        call.on('close', function () {
            Util.closeStream(localVideoId)
        })

    }

    async function answerCall(options, cb) {
        // Await the stream if it's a Promise
        let stream = options && options.stream;
        if (stream && typeof stream.then === 'function') {
            stream = await stream;
        }
        currentCall.answer(stream);

        currentCall.on('stream', function (remoteStream) {
            cb(remoteStream);
        });
    }

    function declineCall() {
        if (currentCall) {
            Util.closeStream(localVideoId)
            currentCall.close();
            currentCall = null;

        }
    }

    // function from() {
    //     return from;
    // }

    // function to() {
    //     return to;
    // }

    function sendMessage(message) {
        const msgObj = { type: 'message', from: from, to: to, content: message };

        if (!dataConnection || !dataConnection.open) {
            console.warn('No open data connection, queuing message');
            messageQueue.push(msgObj);
            return;
        }
        dataConnection.send(msgObj);
        console.log('Message sent:', message);

        const chatWindow = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat chat-end';
        messageElement.id = 'message-' + Date.now(); // Unique ID for the message element
        messageElement.innerHTML = `
                <div class="chat-image avatar">
                    <div class="w-10 rounded-full">
                    <img
                        alt="Tailwind CSS chat bubble component"
                        src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
                    />
                    </div>
                </div>
                <div class="chat-header">
                    ${to}
                    <time class="text-xs opacity-50">${(() => {
                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return timeString;
            })()}</time>
                </div>
                <div class="chat-bubble">${message}</div>
                <div class="chat-footer opacity-50">Seen at 12:46</div>
            `;
        chatWindow.appendChild(messageElement);


        // if (!dataConnection || !dataConnection.open) {
        //     console.warn('No open data connection, queuing message');
        //     messageQueue.push(msgObj);
        //     return;
        // }
        // dataConnection.send(msgObj);
        // console.log('Message sent:', message);

    }

    // receiveMessage is now handled automatically when the data connection opens.
    function receiveMessage(data) {
        console.log("data --> :", data);
        // No-op: handler is attached when data connection opens.
        if (data.to === from) {
            console.log('Message received:', data.content);
            // Handle the received message (e.g., display it in the UI)
            // For example, you could append it to a chat window
            const chatWindow = document.getElementById('messages');
            const messageElement = document.createElement('div');
            messageElement.className = 'chat chat-start';
            messageElement.id = 'message-' + Date.now(); // Unique ID for the message element

            messageElement.innerHTML = `
                    <div class="chat-image avatar">
                        <div class="w-10 rounded-full">
                        <img
                            alt="Tailwind CSS chat bubble component"
                            src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                        />
                        </div>
                    </div>
                    <div class="chat-header">
                        ${from}
                        <time class="text-xs opacity-50">${(() => {
                    const now = new Date();
                    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return timeString;
                })()}</time>
                    </div>
                    <div class="chat-bubble">${data.content}</div>
                    <div class="chat-footer opacity-50">Delivered</div>
                `;
            chatWindow.appendChild(messageElement);
        } else { console.log("msg did not came to me. ignoring"); return }
    }

    // =============== AES-GCM ENCRYPTION HELPERS ===================
    const generateAESKey = async () => crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const encryptFile = async (file, key) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const fileData = await file.arrayBuffer();
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        fileData
      );
      return { encrypted, iv };
    };

    const decryptFile = async (data, key, iv) =>
      crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

    const exportKeyRaw = key => crypto.subtle.exportKey("raw", key);
    const importKeyRaw = buf => crypto.subtle.importKey("raw", buf, "AES-GCM", true, ["encrypt", "decrypt"]);

    // =============== PASSPHRASE ENCRYPTION ===================
    const deriveKeyFromPassphrase = async (passphrase, salt) => {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-512",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
    };

    const encryptAESKey = async (rawKey, passphrase) => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        rawKey
      );
      return { encrypted, salt, iv };
    };

    const decryptAESKey = async (encKeyBuf, passphrase, salt, iv) => {
      const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);
      return crypto.subtle.decrypt({ name: "AES-GCM", iv }, derivedKey, encKeyBuf)
        .then(importKeyRaw);
    };

    // =============== JWT TOKEN ===================
    const base64url = str => btoa(String.fromCharCode(...new Uint8Array(str)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const encodeJWT = async (payload, secretKey) => {
      const enc = new TextEncoder();
      const header = { alg: "HS512", typ: "JWT" };
      const headerStr = base64url(enc.encode(JSON.stringify(header)));
      const payloadStr = base64url(enc.encode(JSON.stringify(payload)));
      const toSign = `${headerStr}.${payloadStr}`;
      const key = await crypto.subtle.importKey("raw", enc.encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
      const signature = await crypto.subtle.sign("HMAC", key, enc.encode(toSign));
      return `${toSign}.${base64url(signature)}`;
    };

    const verifyJWT = async (token, secretKey) => {
      const enc = new TextEncoder();
      const [header, payload, sig] = token.split(".");
      const key = await crypto.subtle.importKey("raw", enc.encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["verify"]);
      const valid = await crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(sig.replace(/[-_]/g, m => ({ '-': '+', '_': '/' })[m])), c => c.charCodeAt(0)), enc.encode(`${header}.${payload}`));
      if (!valid) throw new Error("Invalid JWT signature");
      return JSON.parse(atob(payload.replace(/[-_]/g, m => ({ '-': '+', '_': '/' })[m])));
    };

    // =============== URL ENCODING/DECODING ===================
    const encodeTransferURL = (peerId, jwtToken, encKeyData) => {
      return `myapp://transfer#${btoa(JSON.stringify({ peerId, token: jwtToken, key: encKeyData }))}`;
    };

    const decodeTransferURL = () => {
      const hash = location.hash.slice(1);
      if (!hash) return null;
      try {
        return JSON.parse(atob(hash));
      } catch (e) {
        return null;
      }
    };

    // =============== PEERJS FILE SEND (SECURE) ===================
    async function sendFiles(file, passphrase, jwtSecret, peerId) {
        if (!dataConnection || dataConnection.open === false) {
            console.error("No open DataConnection!");
            return;
        }
        // 1. Generate AES key
        const aesKey = await generateAESKey();
        // 2. Encrypt file with AES key
        const { encrypted: encryptedFile, iv: fileIv } = await encryptFile(file, aesKey);
        // 3. Export and encrypt AES key with passphrase
        const rawKey = await exportKeyRaw(aesKey);
        const { encrypted: encKey, salt, iv: keyIv } = await encryptAESKey(rawKey, passphrase);
        // 4. Create JWT (with expiry, e.g., 10min)
        const jwtPayload = { exp: Math.floor(Date.now() / 1000) + 600, file: file.name };
        const jwtToken = await encodeJWT(jwtPayload, jwtSecret);
        // 5. Send encrypted file and meta to peer
        // Only send small meta as JSON, send file and key as Uint8Array (binary)
        dataConnection.send({
            type: "file",
            data: new Uint8Array(encryptedFile).buffer, // send as ArrayBuffer
            meta: {
                name: file.name,
                type: file.type,
                iv: Array.from(fileIv),
                encKey: Array.from(new Uint8Array(encKey)),
                salt: Array.from(salt),
                keyIv: Array.from(keyIv), // use 'keyIv' consistently
                jwt: jwtToken
            }
        });
        console.log("Encrypted file sent:", file.name);
    }


    // =============== PEERJS FILE RECEIVE (SECURE) ===================
    async function receiveFiles(data) {
        if (!data || !data.data || !data.meta) {
            console.error("Malformed file transfer data");
            return;
        }
        try {
            // Get passphrase from UI if available
            let passphrase = "";
            const passInput = document.getElementById('passphrase-input');
            if (passInput) {
                passphrase = passInput.value;
            }
            if (!passphrase) {
                passphrase = prompt("Enter passphrase to decrypt file and verify JWT:");
            }
            if (!passphrase) {
                alert("Passphrase is required.");
                return;
            }
            // Derive JWT secret from passphrase (same as sender)
            const enc = new TextEncoder();
            const jwtSalt = enc.encode('jwt-static-salt');
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
            const rawJwtKey = await window.crypto.subtle.exportKey("raw", derivedJwtKey);
            const jwtSecret = Array.from(new Uint8Array(rawJwtKey)).map(b => String.fromCharCode(b)).join("");
            // 1. Verify JWT
            const payload = await verifyJWT(data.meta.jwt, jwtSecret);
            if (payload.exp < Math.floor(Date.now() / 1000)) {
                alert("File transfer token expired.");
                return;
            }
            // 2. Decrypt AES key with passphrase
            const encryptedAESKeyArr = data.meta.encryptedAESKey ? data.meta.encryptedAESKey : data.meta.encKey;
            const encryptedAESKey = new Uint8Array(encryptedAESKeyArr);
            const salt = new Uint8Array(data.meta.salt);
            const keyIv = new Uint8Array(data.meta.keyIv); // use 'keyIv' consistently
            const aesKey = await decryptAESKey(
                encryptedAESKey.buffer.slice(
                    encryptedAESKey.byteOffset,
                    encryptedAESKey.byteOffset + encryptedAESKey.byteLength
                ),
                passphrase,
                salt,
                keyIv
            );
            // 3. Decrypt file
            const fileIVArr = data.meta.fileIV ? data.meta.fileIV : data.meta.iv;
            const fileIV = new Uint8Array(fileIVArr);
            let encryptedFile = data.data;
            if (Array.isArray(encryptedFile)) {
                encryptedFile = new Uint8Array(encryptedFile);
            } else if (encryptedFile instanceof ArrayBuffer) {
                encryptedFile = new Uint8Array(encryptedFile);
            } else if (encryptedFile instanceof Uint8Array) {
                // ok
            } else if (encryptedFile.buffer && encryptedFile.byteLength !== undefined) {
                encryptedFile = new Uint8Array(encryptedFile.buffer, encryptedFile.byteOffset, encryptedFile.byteLength);
            } else {
                throw new Error("Unsupported encrypted file data type");
            }
            const decrypted = await decryptFile(encryptedFile, aesKey, fileIV);
            // // 4. Download file
            // const blob = new Blob([decrypted], { type: data.meta.type });
            // const downloadUrl = URL.createObjectURL(blob);
            // console.log('url : ',downloadUrl);
            // const link = document.createElement('a');
            // link.href = downloadUrl;
            // link.download = data.meta.name;
            // link.textContent = `Download ${data.meta.name}`;
            // link.style.display = 'block';
            // document.getElementById('downloads').appendChild(link);
            // alert("File decrypted and downloaded: " + data.meta.name);

            // Step 1: Create blobId and set cookie (for backend verification if needed)
            const blob = new Blob([decrypted], { type: data.meta.type });
            const blobUrl = URL.createObjectURL(blob);
            console.log("✅ Blob URL created:", blobUrl);

            // Use only for frontend-side ID, not for backend fetch
            const blobId = blobUrl.split('/').pop();

            const currentUrl = window.location.href;
            const To = currentUrl.split('&').pop();
            console.log("from and to id : ", To);

            const toId = currentUrl.split('=').pop();
            console.log(toId);

            // Create a share path that will trigger validation
            const customSharePath = `${window.location.origin}/share/${blobId}/${toId}`;
            console.log('custom url : ',customSharePath);

            // Step 2: Create a link element
            const a = document.createElement("a");
            a.href = `${customSharePath}`; // Don't navigate immediately
            a.target = '_blank';
            a.textContent = `Download ${data.meta.name}`;
            a.style.cursor = "pointer";
            a.style.color = "blue";
            a.style.textDecoration = "underline";

            // Step 3: Add onclick handler for validating access and downloading
            a.onclick = async (e) => {
                e.preventDefault();

                try {
                    const res = await fetch(`/share/${blobId}/${toId}`);
                    if (!res.ok) {
                        const error = await res.json();
                        alert("❌ " + (error.error || "Access denied"));
                        return;
                    }

                    const result = await res.json();
                    if (result.message === "Access granted") {
                        console.log("🔐 Access granted, reconstructing blob...");

                        // Recreate blob and download
                        const finalBlob = new Blob([decrypted], { type: data.meta.type });
                        const downloadUrl = URL.createObjectURL(finalBlob);

                        // Trigger download
                        const temp = document.createElement("a");
                        temp.href = downloadUrl;
                        temp.download = data.meta.name;
                        temp.style.display = "none";
                        document.body.appendChild(temp);
                        temp.click();
                        document.body.removeChild(temp);

                    } else {
                        alert("Unexpected response: " + result.message);
                    }
                } catch (err) {
                    console.error("❌ Error in share fetch:", err);
                    alert("Something went wrong. Try again.");
                }
            };

            document.getElementById("downloads").appendChild(a);

        } catch (e) {
            console.error("File receive/decrypt error:", e);
            alert("Failed to decrypt or verify file: " + (e && e.message ? e.message : e));
        }
    }

    return {
        from,
        to,
        getLocalstream,
        playStream,
        connect,
        makeCall,
        answerCall,
        declineCall,
        hangupCall: declineCall, // Alias for consistency
        sendMessage,
        receiveMessage,
        sendFiles,
        receiveFiles,
    }
})();
