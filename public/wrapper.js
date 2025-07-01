const User = (function () {

    let peer = null;
    let currentCall = null;
    let localVideoId = null;
    let remoteVideoId = null;

    let dataConnection = null;

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

            // Connect *only after open*
            if (to) {
                console.log("Trying to connect to peer:", to);
                dataConnection = peer.connect(to);

                dataConnection.on('open', function () {
                    console.log("DataConnection to", to, "opened!");
                });

                dataConnection.on('data', function (data) {
                    receiveFiles(data);
                });

                dataConnection.on('close', function () {
                    console.log("DataConnection to", to, "closed");
                    dataConnection = null;
                });
            }
        });

        peer.on('connection', function (conn) {
            console.log("Received DataConnection from:", conn.peer);
            dataConnection = conn;

            conn.on('data', function (data) {
                receiveFiles(data);
            });

            conn.on('open', function () {
                console.log("DataConnection opened!");
            });

            conn.on('close', function () {
                console.log("DataConnection closed");
                dataConnection = null;
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


    function sendMessage() { }
    function receiveMessage() { }

    function sendFiles(file) {
        if (!dataConnection || dataConnection.open === false) {
            console.error("No open DataConnection!");
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {
            const arrayBuffer = reader.result;

            const payload = {
                fileName: file.name,
                fileType: file.type,
                fileData: arrayBuffer
            };

            dataConnection.send(payload);
            console.log("File sent:", file.name);
        };

        reader.readAsArrayBuffer(file);
    }

    function receiveFiles(data) {
        console.log("Received file:", data);

        const blob = new Blob([data.fileData], { type: data.fileType });

        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = data.fileName;
        downloadLink.textContent = `Download ${data.fileName}`;
        downloadLink.style.display = 'block';

        document.getElementById('download-link').appendChild(downloadLink);
    }

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
