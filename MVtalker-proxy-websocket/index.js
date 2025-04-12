const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// 启动 HTTP 服务用于升级为 WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    // 只允许路径为 /ws 的连接升级为 WebSocket
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', (clientSocket, req) => {
    const query = url.parse(req.url, true).query;
    const token = query.token;

    // 检查 token 是否存在
    if (!token) {
        clientSocket.close();
        return;
    }

    // 创建连接到后端 WebRTC 信令服务器的 WebSocket
    const backendSocket = new WebSocket('ws://mk-api.cavalry.gx.cn/webrtc/signaling', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    backendSocket.on('open', () => {
        console.log('✅ 成功连接后端信令服务器');

        // 通知前端连接成功（可选）
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
                type: 'system',
                message: '连接真实信令服务器成功 ✅'
            }));
        }
    });

    // 💬 转发客户端消息到后端，同时打印日志
    clientSocket.on('message', data => {
        try {

             // console.log('proxy -> backend:', JsonData);

            if (backendSocket.readyState === WebSocket.OPEN) { // 如果后端 WebSocket 已经就绪，则转发消息
                console.log('proxy -> backend:', data.toString())
                backendSocket.send(data.toString());
            } else {
                console.warn('❌ 后端 WebSocket 尚未就绪，无法转发消息');
            }
        } catch (e) {
            console.warn('⚠️ 无法解析前端发来的 JSON:', data.toString());
        }

    });
    // 💬 转发后端消息到客户端，同时打印日志
    backendSocket.on('message', data => {
        console.log('backend -> proxy:', data.toString());

        if (clientSocket.readyState === WebSocket.OPEN) {
             clientSocket.send(data.toString());
        } else {
            console.warn('❌ 客户端 WebSocket 已关闭，无法转发消息');
        }
    });

    // 🚫 客户端关闭，关闭后端连接
    clientSocket.on('close', () => {
        console.log('🚪 客户端连接关闭');
        backendSocket.close();
    });

    // 🚫 后端关闭，关闭客户端连接
    backendSocket.on('close', () => {
        console.log('🚪 后端连接关闭');
        clientSocket.close();
    });

    // ⚠️ 错误日志
    clientSocket.on('error', err => {
        console.error('❌ 客户端 WebSocket 错误:', err);
    });
    backendSocket.on('error', err => {
        console.error('❌ 后端 WebSocket 错误:', err);
    });
});

// 启动监听
server.listen(3000, () => {
    const ip = require('ip').address(); // 获取本机 IP
    console.log(`🚀 WebSocket 代理服务已启动：http://${ip}:3000/ws`);
});
