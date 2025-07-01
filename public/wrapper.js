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

            const conn = peer.connect(to);
            // Only assign dataConnection and allow sending after open
            conn.on('open', function () {
                console.log('Data connection established with ' + to);
                dataConnection = conn;
                // Attach data and error handlers once
                // dataConnection.on('data', function (data) {
                //     console.log('Data received:', data);
                //     // if (data.type === 'message') {
                //     //     console.log('Message received:', data.content);
                //     //     // Handle the received message (e.g., display it in the UI)
                //     // }
                // });
                dataConnection.on('error', function (err) {
                    console.error('Connection error:', err);
                });
                // Send any queued messages
                while (messageQueue.length > 0) {
                    const msg = messageQueue.shift();
                    dataConnection.send(msg);
                    console.log('Queued message sent:', msg);
                }
            });

            // Handle incoming data connections
            peer.on('connection', function (conn) {
                dataConnection = conn;
                dataConnection.on('data', function (data) {
                    console.log('Data received (incoming connection):', data);
                    if (data.type === 'message') {
                        console.log('Message received:', data.content);
                        // Handle the received message (e.g., display it in the UI)
                        receiveMessage(data);
                    }
                });
                dataConnection.on('error', function (err) {
                    console.error('Connection error:', err);
                });
            });

            conn.on('error', function (err) {
                console.error('Connection error:', err);
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


        if (!dataConnection || !dataConnection.open) {
            console.warn('No open data connection, queuing message');
            messageQueue.push(msgObj);
            return;
        }
        dataConnection.send(msgObj);
        console.log('Message sent:', message);

    }

    // receiveMessage is now handled automatically when the data connection opens.
    function receiveMessage(data) {
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
        } else {
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
                <div class="chat-bubble">${data.content}</div>
                <div class="chat-footer opacity-50">Seen at 12:46</div>
            `;
            chatWindow.appendChild(messageElement);
        }

    }

    function sendFiles() { }
    function receiveFiles() { }

    // return {
    //     from,
    //     to,
    //     getLocalstream,
    //     playStream,
    //     connect,
    //     call: {
    //         make: makeCall,
    //         answer: answerCall,
    //         decline: declineCall,
    //         hangup: declineCall, // Alias for consistency
    //     },
    //     message: {
    //         send: sendMessage,
    //         receive: receiveMessage,
    //     },
    //     files: {
    //         sendFiles,
    //         receiveFiles,
    //     }
    // }


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
