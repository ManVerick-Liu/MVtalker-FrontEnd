const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;
    let userId = Math.random().toString(36).substring(2, 10); // 生成随机用户ID

    console.log(`新用户连接: ${userId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`收到来自 ${userId} 的消息:`, data);

            switch (data.type) {
                case 'join':
                    handleJoin(data.roomId, ws, userId);
                    break;
                case 'leave':
                    handleLeave(data.roomId, userId);
                    break;
                case 'offer':
                case 'answer':
                case 'ice-candidate':
                    forwardMessage(data, userId);
                    break;
            }
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });

    ws.on('close', () => {
        console.log(`用户断开连接: ${userId}`);
        if (currentRoom) {
            handleLeave(currentRoom, userId);
        }
    });

    function handleJoin(roomId, ws, userId) {
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }

        currentRoom = roomId;
        rooms[roomId].add(ws);

        // 发送已加入确认
        ws.send(JSON.stringify({
            type: 'joined',
            roomId: roomId,
            userId: userId
        }));

        // 通知房间内其他用户
        const otherUsers = [];
        rooms[roomId].forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'newUser',
                    userId: userId
                }));
                otherUsers.push(client.userId || 'unknown');
            }
        });

        // 发送当前房间内的其他用户列表给新用户
        ws.send(JSON.stringify({
            type: 'otherUsers',
            users: otherUsers
        }));

        // 保存userId到ws对象
        ws.userId = userId;
    }

    function handleLeave(roomId, userId) {
        if (rooms[roomId]) {
            rooms[roomId].delete(ws);

            // 通知房间内其他用户
            rooms[roomId].forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'userLeft',
                        userId: userId
                    }));
                }
            });

            if (rooms[roomId].size === 0) {
                delete rooms[roomId];
            }
        }

        currentRoom = null;
    }

    function forwardMessage(data, senderId) {
        if (rooms[data.roomId]) {
            rooms[data.roomId].forEach(client => {
                if (client.userId === data.targetUserId && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        ...data,
                        userId: senderId
                    }));
                }
            });
        }
    }
});

console.log('WebSocket信令服务器已启动，监听端口 3000');