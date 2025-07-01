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

    function sendFile() {
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        if (file) {
            User.sendFiles(file);
        } else {
            console.warn("No file selected");
        }
    }

    window.addEventListener("showCallNotification", showCallNotification);
    document.getElementById('video-call-btn').onclick = makeVideoCall;
    document.getElementById('audio-call-btn').onclick = makeAudioCall;
    document.getElementById('hangup-btn').onclick = hangupCall;
    document.getElementById('answer-btn').onclick = answerCall;
    document.getElementById('decline-btn').onclick = declineCall;
    document.getElementById('send-btn').onclick = sendFile;

})


