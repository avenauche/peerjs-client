const User = (function () {

    let peer = null;
    let currentCall = null;
    let localVideoId = null;
    let remoteVideoId = null;

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
        });

        peer.on('call', function (call) {
            currentCall = call;

            showIncomingCallNotification({
                from: call.peer,
                to: User.from,
            });
        })

    }

    function makeCall(to, localstream, cb) {
        var call = peer.call(to, localstream);
        currentCall = call;

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
