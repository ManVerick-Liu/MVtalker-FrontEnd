// 创建 PeerConnection
import {sendMessageStandard} from "@/api/websocket";
import {nextTick} from "vue";


const configuration = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        },
        {
            urls: 'stun:stun.qq.com:3478' // 腾讯云 STUN 服务器
        },
        { urls: 'stun:stun.163.com:3478' },        // 网易
        { urls: 'stun:stun.aliyun.com:3478' },     // 阿里云（非官方，测试可用性）
        {
            urls: ["turn:turn.cavalry.icu:3478?transport=udp"],
            username: "webrtc",
            credential: "3244228202"
        }
    ]
};
const createPeerConnection = (remoteAudioElement, currentUserId, targetUserId) => {
    const pc = new RTCPeerConnection(configuration);

     // 监听 ICE 候选
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('📤 发送 ICE 候选:', event.candidate);
            sendMessageStandard('iceCandidate', {
                sourceUserId: currentUserId.value,
                targetUserId: targetUserId.value,
                iceCandidates: [event.candidate],
            });
        }
    };

    // 监听远程音轨
    pc.ontrack = (event) => {
        // nextTick(() => {
            console.log('🎧 收到远程音轨:', event.track);
            if (remoteAudioElement) {
                const remoteStream = remoteAudioElement.srcObject || new MediaStream();
                remoteStream.addTrack(event.track);
                remoteAudioElement.srcObject = remoteStream;
            }

            remoteAudioElement.onplay = () => console.log('音频正在播放');
            remoteAudioElement.onloadedmetadata = () => console.log('音频元数据加载完成');
            remoteAudioElement.onerror = e => console.error('音频播放错误', e);

            setTimeout(() => {
                const promise = remoteAudioElement.play();
                if (promise !== undefined) {
                    promise.catch(e => console.error('播放失败: ', e));
                }
            }, 500);
        // });
    };

    pc.oniceconnectionstatechange = () => {
        console.log('🌐 ICE 状态:', pc.iceConnectionState);
    };

    return pc;
};