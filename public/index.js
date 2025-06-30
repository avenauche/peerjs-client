document.addEventListener("DOMContentLoaded", async function () {

    User.connect({
        from: User.from, // Use the from method to get the user's ID from the URL hash
        to: User.to, // Use the to method to get the peer ID from the URL query parameter
        host: "127.0.0.1", // Use your LAN IP for cross-browser and Docker compatibility
        port: 9000,
        path: "/myapp",
        secure: true,
        localVideoId: "local-video",
        remoteVideoId: "remote-video"
    });

    async function makeCall() {
        const localstream = await User.getLocalstream();
        let localId = document.getElementById("local-video");
        await User.playStream(localId, localstream);

        User.makeCall(User.to, localstream, async function (remoteStream) {
            let remoteId = document.getElementById("remote-video");
            await User.playStream(remoteId, remoteStream);
        })
    }

    function showCallNotification(event) {
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

        const localstream = await User.getLocalstream();
        let localId = document.getElementById("local-video");
        await User.playStream(localId, localstream);

        User.answerCall({
            stream: await User.getLocalstream()
        }, async (remoteStream) => {
            let remoteId = document.getElementById("remote-video");
            await User.playStream(remoteId, remoteStream);
        });
    }

        
    function declineCall(){
        hideCallNotification();
        User.declineCall();
    }

    function hangupCall(){
        hideCallNotification();
        User.hangupCall();
    }

    window.addEventListener("showCallNotification", showCallNotification);
    document.getElementById('call-btn').onclick = makeCall;
    document.getElementById('hangup-btn').onclick = hangupCall;
    document.getElementById('answer-btn').onclick = answerCall;
    document.getElementById('decline-btn').onclick = declineCall;

})


