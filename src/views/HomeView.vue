<script setup>
import exitIcon from '@/assets/ic--baseline-exit-to-app.svg';
import {ref, onMounted, nextTick, watch} from 'vue';
import {useRouter} from 'vue-router';
import {connectSignalingServer, onMessage, sendMessageStandard} from '@/api/signalingsocket';
import {testGetOnlineUserViews} from "@/api/UserService/test";
import {userOffline} from "@/api/UserService";

const router = useRouter();
const remoteAudio = ref(null);
const isCalling = ref(false);
const isMuted = ref(false);
const targetUserIdList = ref([]);
const currentUserId = ref('');
const targetUserId = ref('');

let localStream = null;
let peerConnection = null;

// 退登录
const outLogin = async () => {
   await userOffline().catch((err) => {
     router.push('/login');
   });
  console.log('✅ 退出登录成功');
  alert('✅ 退出登录成功');
  await router.push('/login');
};

// 封装媒体初始化逻辑
const initLocalAudio = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ 获取本地音频成功');
    return localStream;
  } catch (err) {
    console.error('❌ 获取本地音频失败:', err);
    return null;
  }
};

// 创建 PeerConnection
const createPeerConnection = () => {
  const pc = new RTCPeerConnection();

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
    nextTick(() => {
      console.log('🎧 收到远程音轨:', event.track);
      if (remoteAudio.value) {
        const remoteStream = remoteAudio.value.srcObject || new MediaStream();
        remoteStream.addTrack(event.track);
        remoteAudio.value.srcObject = remoteStream;
      }

      remoteAudio.value.onplay = () => console.log('音频正在播放');
      remoteAudio.value.onloadedmetadata = () => console.log('音频元数据加载完成');
      remoteAudio.value.onerror = e => console.error('音频播放错误', e);

      setTimeout(() => {
        const promise = remoteAudio.value.play();
        if (promise !== undefined) {
          promise.catch(e => console.error('播放失败: ', e));
        }
      }, 500);
    });
  };

  pc.oniceconnectionstatechange = () => {
    console.log('🌐 ICE 状态:', pc.iceConnectionState);
  };

  return pc;
};

// 📞 主叫方：发起通话
const startCall = async () => {
  isCalling.value = true;
  peerConnection = createPeerConnection();
  const stream = await initLocalAudio();
  if (!stream) return;

  // 确保 stream 存在
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Offer SDP:', offer.sdp);

  remoteAudio.value.srcObject = stream;

  sendMessageStandard('offer', {
    sourceUserId: currentUserId.value,
    targetUserId: targetUserId.value,
    sdp: offer.sdp,
    iceCandidates: [{}],
  });
};

//  挂断通话
const hangUp = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (remoteAudio.value) {
    localStream.getTracks().forEach(track => track.stop());
    remoteAudio.value.srcObject = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  isCalling.value = false;
};

// 🔇 静音通话
const muteCall = () => {
  isMuted.value = !isMuted.value;
  console.log(`麦克风状态: ${isMuted.value ? '静音' : '开启'}`)
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }
  if (remoteAudio.value){
    remoteAudio.value.muted = !remoteAudio.value.muted;
  }
  isMuted.value = !isMuted.value;
};

// 调试监听本地音频
const handerListen = async () => {
  const stream = await initLocalAudio();
  if (remoteAudio.value && stream) {
    remoteAudio.value.srcObject = stream;
  }
};

// 初始化信令通道和事件
onMounted(async () => {
  const token = localStorage.getItem('token');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  currentUserId.value = userInfo.userId;

  const onlineUserRes = await testGetOnlineUserViews();
  targetUserIdList.value = onlineUserRes.data.data.userViews;

  await connectSignalingServer(`ws://192.168.10.4:3000/ws?token=${token}`);

  // 📥 被叫方收到 offer
  await onMessage('offer', async (offer) => {
    console.log('📥 收到 offer:', offer);
    isCalling.value = true;
    targetUserId.value = offer.sourceUserId;

    peerConnection = createPeerConnection();
    const stream = await initLocalAudio();
    if (!stream) return;

    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: offer.sdp
    }));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    sendMessageStandard('answer', {
      sourceUserId: currentUserId.value,
      targetUserId: offer.sourceUserId,
      sdp: answer.sdp,
      iceCandidates: [{}],
    });
  });

  // 📥 主叫方收到 answer
  await onMessage('answer', async (answer) => {
    console.log('📥 收到 answer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answer.sdp,
    }));
  });

  // 📥 收到 ICE 候选
  await onMessage('iceCandidate', async (message) => {
    for (const candidate of message.iceCandidates) {
      if (candidate && candidate.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('❌ 添加 ICE 候选失败:', e);
        }
      }
    }
  });
  remoteAudio.value.onplay = () => {
    console.log('音频正在播放');
  };
  remoteAudio.value.onloadedmetadata = () => {
    console.log('音频元数据加载完成');
  };
});

;
</script>


<template>
  <img @click="outLogin" :src="exitIcon" class="exit-img"   alt="exit"/>

  <!-- 页面模板 -->
  <div class="home">
    <div class="controls">
      <button @click="startCall" :disabled="isCalling">🎤 开始通话</button>
      <button @click="hangUp" :disabled="!isCalling">☎️ 挂断</button>
      <button class="controls-button" @click="muteCall" :class="{'selected': isMuted.value}">⏸️ 静音</button>
<!--      TODO: 添加静音功能-->
<!--      <button @click="handerListen">🎤 麦克风监听</button>-->
      <audio ref="remoteAudio" autoplay playsinline ></audio>
<!--      playsinline controls-->
    </div>
    <div class="player-list" >
    <div class="player"
         v-for="item in targetUserIdList"
         @click="targetUserId = item.userId;console.log(targetUserId);"
         :class="{ 'selected': targetUserId === item.userId }"
    >{{item.nickname}}</div>
    </div>
    <div class="radar-container">
      <div class="radar-circle">
        <div class="radar-scan"></div>
      </div>
      <!-- 刻度线 -->
      <div class="radar-lines">
        <div class="line horizontal"></div>
        <div class="line vertical"></div>
        <div></div>
        <!--        <div class="line diagonal-1"></div>-->
        <!--        <div class="line diagonal-2"></div>-->
      </div>
    </div>
  </div>
</template>

<style scoped>
.selected {
  background: #ff9900 !important;
  color: #0a1a2e !important;
}

.player-list{
  position: fixed;
  width: auto;
  height: auto;
  left: 80%;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}
.player{
  width: 100px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #00ff99;
  margin: 20px;
  cursor: pointer;
}
.home {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #0a1a2e;
}

.exit-img {
  position: fixed;
  left: 95%;
  top: 3%;
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  z-index: 9999;
  cursor: pointer;
}
.radar-container {
  position: relative;
  width: 70vh;
  height: 70vh;
}

.radar-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(16, 36, 60, 0.8);
  box-shadow: 0 0 20px rgba(0, 150, 255, 0.3);
  position: relative;
  overflow: hidden;
}

.radar-scan {
  position: absolute;
  width: 50%;
  height: 50%;
  background: linear-gradient(
      45deg,
      rgba(0, 255, 150, 0) 0%,
      rgba(0, 255, 150, 0.1) 50%,
      rgba(0, 255, 150, 0) 100%
  );
  top: 0;
  left: 0;
  transform-origin: 100% 100%;
  animation: radar-scan 4s linear infinite;
  border-radius: 100% 0 0 0;
}

.radar-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.line {
  position: absolute;
  background: rgba(0, 255, 150, 0.3);
}

.horizontal {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  transform: translateY(-50%);
}

.vertical {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

/*扫描动画*/
@keyframes radar-scan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.radar-circle::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(0, 255, 150, 0.8);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 5px rgba(0, 255, 150, 0.2),
  0 0 0 10px rgba(0, 255, 150, 0.1),
  0 0 0 15px rgba(0, 255, 150, 0.05);
  animation: radar-pulse 2s infinite;
}

@keyframes radar-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 150, 0.8),
    0 0 0 5px rgba(0, 255, 150, 0.4),
    0 0 0 10px rgba(0, 255, 150, 0.1);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(0, 255, 150, 0),
    0 0 0 20px rgba(0, 255, 150, 0),
    0 0 0 30px rgba(0, 255, 150, 0);
  }
}

.controls {
  position: relative;
  top: -100px;
  margin-top: 2rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.controls button {
  margin: 0 1rem;
  padding: 0.8rem 1.4rem;
  font-size: 1.2rem;
  border: none;
  background-color: #00ff99;
  color: #0a1a2e;
  border-radius: 8px;
  cursor: pointer;
}

.controls button:disabled {
  background-color: gray;
  cursor: not-allowed;
}

.controls button[class*="selected"]{
  background-color: #ff9900 !important;
  color: #0a1a2e !important;
}

</style>