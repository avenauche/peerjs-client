const Util = {
    getLocalMedia: async function (constraints) {
        let stream = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            /* use the stream */
        } catch (err) {
            /* handle the error */
        }
        return stream;
    },

    playStream: async function (videoElementId, stream) {
        try {
            videoElementId.pause();
        } catch (e) {}
        videoElementId.srcObject = null; // Clear previous stream if any
        videoElementId.srcObject = stream;
        try {
            await videoElementId.play();
        } catch (e) {
            console.warn(`${videoElementId} play interrupted:`, e);
        }
    },

    closeStream: (videoElementId) => {
        
        try {
            videoElementId.pause();
            let tracks = videoElementId.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        } catch (e) {}
        videoElementId.srcObject = null;
    }

}