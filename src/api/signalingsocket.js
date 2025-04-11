
// signalingsocket.js
import dayjs from "dayjs";

let socket = null;

/**
 * 连接信令服务器
 * @param {string} serverPath - 既可以是完整地址（如 wss://xxx），也可以是相对路径（如 /webrtc/signaling）
 */
export function connectSignalingServer(serverPath = '/webrtc/signaling') {
    // 判断是否完整 URL
    const isFullUrl = serverPath.startsWith('ws://') || serverPath.startsWith('wss://');

    const url = isFullUrl
        ? serverPath
        : `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.host}${serverPath}`;

    socket = new WebSocket(url);

    socket.onopen = () => {
        console.log('✅ 已连接信令服务器');
    };

    socket.onclose = () => {
        console.warn('⚠️ 信令服务器断开连接');
    };

    socket.onmessage = (event) => {
        console.log("📨 收到消息:", event.data);
        // 可选：解析 JSON 消息并处理
    };

    socket.onerror = (e) => {
        console.error('❌ WebSocket 连接出错:', e);
    };
}

// export const  sendMessage = (type, data) => {
//     if (socket?.readyState === WebSocket.OPEN) {
//         console.log('✉️ 发送消息:', type, data);
//         socket.send(JSON.stringify({ type, data }));
//     }
// }

export const sendMessageStandard = (type, payload =
{
    sourceUserId: "", // 发送者用户ID
    targetUserId: "", // 接收者用户ID
    sdp: "", // SDP
    iceCandidates: [{}] // ICE 候选项
}) => {
    if (socket?.readyState === WebSocket.OPEN) {
        if (!payload.sourceUserId?.trim() || !payload.targetUserId?.trim()){
            throw new Error("sourceUserId and targetUserId are required");
        }
        const message = {
            type,
            timestamp: dayjs().toISOString(),
            data: {
                ...payload
            }
        };
        // console.log('✉️ 发送消息:', type, message);
        socket.send(JSON.stringify( message ));
    }
}
export const onMessage = ( type, callback) => {
    socket?.addEventListener('message', event => {
        const { type: t, data } = JSON.parse(event.data);
        // console.log("📩 收到消息:", t, data);
        if (t === type) callback(data);
    });
}
