<template>
  <div class="voice-chat-container">
    <h1>WebRTC 语音聊天室</h1>
    <div class="controls">
      <button @click="joinRoom" :disabled="isInRoom">加入房间</button>
      <button @click="leaveRoom" :disabled="!isInRoom">离开房间</button>
      <button @click="toggleMic" :disabled="!isInRoom">
        {{ isMuted ? '取消静音' : '静音' }}
      </button>
    </div>

    <div class="participants">
      <div v-for="(stream, userId) in remoteStreams" :key="userId" class="participant">
        <audio :id="'audio-' + userId" autoplay playsinline></audio>
        <p>用户 {{ userId }} ({{ stream.active ? '活跃' : '静音' }})</p>
      </div>
    </div>

    <div class="status">
      <p>房间状态: {{ isInRoom ? '已加入' : '未加入' }}</p>
      <p>麦克风状态: {{ isMuted ? '静音' : '开启' }}</p>
      <p>连接用户数: {{ Object.keys(remoteStreams).length }}</p>
      <p>当前用户ID: {{ currentUserId }}</p>
      <p>PeerConnections: {{ Object.keys(peerConnections).join(', ') || '无' }}</p>
    </div>

    <div class="debug">
      <h3>调试信息</h3>
      <pre>{{ debugLog }}</pre>
    </div>
  </div>
</template>

<script setup>
import {ref, onBeforeUnmount, nextTick} from 'vue';

const roomId = 'test-room';
const localStream = ref(null);
const peerConnections = ref({});
const remoteStreams = ref({});
const isInRoom = ref(false);
const isMuted = ref(false);
const socket = ref(null);
const socketUrl = 'ws://192.168.1.10:8008';
const currentUserId = ref(null);
const debugLog = ref('');

// 调试日志
const log = (message) => {
  debugLog.value += `${new Date().toLocaleTimeString()}: ${message}\n`;
  console.log(message);
};

// 加入房间
const joinRoom = async () => {
  try {
    socket.value = new WebSocket(socketUrl);

    socket.value.onopen = () => {
      log('WebSocket连接已建立');
      socket.value.send(JSON.stringify({
        type: 'join',
        roomId: roomId
      }));
    };

    socket.value.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      log(`收到消息: ${JSON.stringify(message)}`);

      switch (message.type) {
        case 'joined':
          isInRoom.value = true;
          currentUserId.value = message.userId;
          await startLocalStream();
          break;
        case 'otherUsers':
          await handleOtherUsers(message.users);
          break;
        case 'newUser':
          await createPeerConnection(message.userId);
          break;
        case 'offer':
          await handleOffer(message);
          break;
        case 'answer':
          await handleAnswer(message);
          break;
        case 'ice-candidate':
          await handleIceCandidate(message);
          break;
        case 'userLeft':
          handleUserLeft(message.userId);
          break;
      }
    };

    socket.value.onclose = () => {
      log('WebSocket连接已关闭');
      leaveRoom();
    };

    socket.value.onerror = (error) => {
      log(`WebSocket错误: ${error}`);
    };

  } catch (error) {
    log(`加入房间失败: ${error}`);
  }
};

// 离开房间
const leaveRoom = () => {
  // 关闭所有PeerConnection
  Object.keys(peerConnections.value).forEach(userId => {
    peerConnections.value[userId].close();
    delete peerConnections.value[userId];
  });

  // 关闭本地流
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop());
    localStream.value = null;
  }

  // 通知服务器离开房间
  if (socket.value && socket.value.readyState === WebSocket.OPEN) {
    socket.value.send(JSON.stringify({
      type: 'leave',
      roomId: roomId
    }));
    socket.value.close();
  }

  isInRoom.value = false;
  remoteStreams.value = {};
  peerConnections.value = {};
  currentUserId.value = null;
};

// 切换麦克风状态
const toggleMic = () => {
  if (localStream.value) {
    const audioTrack = localStream.value.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      isMuted.value = !audioTrack.enabled;
      log(`麦克风状态: ${audioTrack.enabled ? '开启' : '静音'}`);
    }
  }
};

// 获取本地音频流
const startLocalStream = async () => {
  try {
    // 1. 兼容旧版浏览器 API
    const getUserMedia = navigator.mediaDevices?.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;

    if (!getUserMedia) {
      throw new Error("浏览器不支持 getUserMedia");
    }

    // 2. 如果是 HTTP 环境，提示用户调整浏览器设置
    if (window.location.protocol === 'http:' && !window.isSecureContext) {
      console.warn("运行在非安全上下文 (HTTP)");
      alert("请在 Chrome 启动时添加以下参数：\n\n" +
          "chrome.exe --unsafely-treat-insecure-origin-as-secure=\"http://" +
          window.location.host + "\"");
    }

    // 3. 获取麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.value = stream;
    console.log("麦克风已启用，音频轨道：", stream.getAudioTracks());
  } catch (error) {
    console.error("获取麦克风失败：", error);
    alert(`麦克风访问失败：${error.message}\n请确保：\n1. 已授予麦克风权限\n2. 使用 Chrome/Firefox\n3. 如果是 HTTP，需特殊启动浏览器`);
    leaveRoom();
  }
};

// 处理其他用户
const handleOtherUsers = async (users) => {
  log(`房间内其他用户: ${users.join(', ')}`);
  for (const userId of users) {
    await createPeerConnection(userId);
  }
};

// 创建PeerConnection
const createPeerConnection = async (userId) => {
  if (peerConnections.value[userId] || userId === currentUserId.value) {
    log(`已存在与用户 ${userId} 的连接或为自己，跳过创建`);
    return;
  }

  log(`正在创建与用户 ${userId} 的PeerConnection`);

  const configuration = {
    iceServers: [],
    iceTransportPolicy: 'all' // 更宽松的连接策略
  };

  const peerConnection = new RTCPeerConnection(configuration);
  peerConnections.value[userId] = peerConnection;

  // 添加本地流
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream.value);
      log(`添加本地轨道 ${track.kind} (${track.id}) 到PeerConnection`);
    });
  }

  // 处理ICE候选
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      log(`生成ICE候选 for ${userId}: ${event.candidate.candidate}`);
      socket.value.send(JSON.stringify({
        type: 'ice-candidate',
        roomId: roomId,
        targetUserId: userId,
        candidate: event.candidate
      }));
    } else {
      log(`ICE收集完成 for ${userId}`);
    }
  };

  // 处理ICE连接状态变化
  peerConnection.oniceconnectionstatechange = () => {
    log(`ICE连接状态变化 (${userId}): ${peerConnection.iceConnectionState}`);
  };

  // 处理连接状态变化
  peerConnection.onconnectionstatechange = () => {
    log(`PeerConnection状态变化 (${userId}): ${peerConnection.connectionState}`);
  };

  // 处理远程流
  peerConnection.ontrack = (event) => {
    log(`收到来自 ${userId} 的远程轨道`);
    const remoteStream = event.streams[0];
    remoteStreams.value[userId] = {
      stream: remoteStream,
      active: true
    };

    // 绑定音频元素
    nextTick(() => {
      const audioElement = document.getElementById(`audio-${userId}`);
      if (audioElement) {
        audioElement.srcObject = remoteStream;
        audioElement.play().catch(e => log(`音频播放失败: ${e}`));
        log(`已绑定音频元素 for ${userId}`);
      }
    });
  };

  // 如果是发起方，创建offer
  if (userId > currentUserId.value) {
    try {
      log(`作为发起方，创建offer给 ${userId}`);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true
      });
      await peerConnection.setLocalDescription(offer);
      log(`设置本地描述: ${JSON.stringify(offer)}`);

      socket.value.send(JSON.stringify({
        type: 'offer',
        roomId: roomId,
        targetUserId: userId,
        offer: offer
      }));
    } catch (error) {
      log(`创建offer失败: ${error}`);
    }
  }
};

// 处理offer
const handleOffer = async (message) => {
  const userId = message.userId;
  log(`收到来自 ${userId} 的offer`);

  await createPeerConnection(userId);
  const peerConnection = peerConnections.value[userId];

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
    log(`设置远程描述成功 for ${userId}`);

    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true
    });
    await peerConnection.setLocalDescription(answer);
    log(`创建answer成功 for ${userId}`);

    socket.value.send(JSON.stringify({
      type: 'answer',
      roomId: roomId,
      targetUserId: userId,
      answer: answer
    }));
  } catch (error) {
    log(`处理offer失败: ${error}`);
  }
};

// 处理answer
const handleAnswer = async (message) => {
  const userId = message.userId;
  log(`收到来自 ${userId} 的answer`);

  const peerConnection = peerConnections.value[userId];
  if (peerConnection) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
      log(`设置远程answer成功 for ${userId}`);
    } catch (error) {
      log(`处理answer失败: ${error}`);
    }
  }
};

// 处理ICE候选
const handleIceCandidate = async (message) => {
  const userId = message.userId;
  log(`收到来自 ${userId} 的ICE候选`);

  const peerConnection = peerConnections.value[userId];
  if (peerConnection) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      log(`添加ICE候选成功 for ${userId}`);
    } catch (error) {
      log(`添加ICE候选失败: ${error}`);
    }
  }
};

// 处理用户离开
const handleUserLeft = (userId) => {
  log(`用户 ${userId} 离开房间`);
  if (peerConnections.value[userId]) {
    peerConnections.value[userId].close();
    delete peerConnections.value[userId];
  }
  delete remoteStreams.value[userId];
};

// 组件卸载时清理
onBeforeUnmount(() => {
  leaveRoom();
});
</script>

<style scoped>
.voice-chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.controls {
  margin: 20px 0;
}

.controls button {
  margin-right: 10px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.participants {
  margin: 20px 0;
}

.participant {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.status {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.debug {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.debug pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 12px;
}
</style>