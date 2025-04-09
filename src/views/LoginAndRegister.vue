<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="toggle-buttons">
        <button :class="{ active: isLogin }" @click="isLogin = true">登录</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">注册</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="phone-input-wrapper">
          <div class="prefix-selector" @click.stop="showRegionList = !showRegionList">
            {{ selectedRegion.flag }} {{ selectedRegion.code }}
            <div v-if="showRegionList" class="region-dropdown" @click.stop>
              <div v-for="region in regionList" :key="region.code" @click="selectRegion(region)">
                {{ region.flag }} {{ region.name }} {{ region.code }}
              </div>
            </div>
          </div>
          <input   :class="{ 'input-error': !inputStates.phone.valid }"
                   v-model="form.phone"
                   type="text"
                   :placeholder="inputStates.phone.placeholder"
                   @blur="() => validateInput('phone', form.phone, 'phone', selectedRegion.code)"
                   required
          />
        </div>
        <input
            v-if="!isLogin"
            :class="{ 'input-error': !inputStates.password.valid }"
            v-model="form.nickname"
            type="text"
            :placeholder="inputStates.nickname.placeholder"
            @blur="validateInput('nickname', form.nickname, 'nickname')"
        />
        <input
            :class="{ 'input-error': !inputStates.password.valid }"
            v-model="form.password"
            type="password"
            :placeholder="inputStates.password.placeholder"
            @blur="() => validateInput('password', form.password, 'password')"
        />
        <input
            v-if="!isLogin"
            :class="{ 'input-error': !inputStates.confirm.valid }"
            v-model="form.confirm"
            type="password"
            :placeholder="inputStates.confirm.placeholder"
            @blur="() => validateInput('confirm', form.confirm, 'confirm')"/>
        <button type="submit">{{ isLogin ? '登录' : '注册' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import {nextTick, onMounted, reactive, ref} from 'vue'
import Rex from '../utils/rex'
import {register, login, userOffline} from "../api/UserService";
import {useRouter} from  "vue-router"

const isLogin = ref(true)
const form = reactive({
  phone: '',
  nickname: '',
  password: '',
  confirm: '',
});

const selectedRegion = reactive({
  name: '中国',
  code: '+86',
  flag: '🇨🇳'
})

const regionList = [
  { name: '中国', code: '+86', flag: '🇨🇳' },
  { name: '美国', code: '+1', flag: '🇺🇸' },
  { name: '日本', code: '+81', flag: '🇯🇵' },
  { name: '韩国', code: '+82', flag: '🇰🇷' },
  { name: '香港', code: '+852', flag: '🇭🇰' },
  { name: '台湾', code: '+886', flag: '🇹🇼' }
]

const showRegionList = ref(false);
const router = useRouter();
const inputStates = reactive({
  phone: { valid: true, placeholder: '请输入手机号' },
  nickname: { valid: true, placeholder: '请输入昵称' },
  password: { valid: true, placeholder: '请输入密码' },
  confirm: { valid: true, placeholder: '确认密码' },
});

function selectRegion(region) {
  selectedRegion.name = region.name;
  selectedRegion.code = region.code;
  selectedRegion.flag = region.flag;
  showRegionList.value = false;
}

function handleSubmit() {
  // if (!isLogin.value && form.password !== form.confirm) {
  //   alert('两次密码不一致')
  //   return
  // }
  const fullPhone = `${selectedRegion.code}${form.phone}`;
  // 验证inputStates个字段校验结果是否都通过
  const isValid = Object.values(inputStates).every(state => state.valid);

  if (!isLogin.value) {

    // payload.confirm = form.confirm;
    if (isValid){
      const payload = {
        mobile: fullPhone,
        password: form.password,
        nickname: form.nickname,
      };
      // 校验通过发送请求接口
      register(payload).then(res => {
        console.log(res.data.token);
        localStorage.setItem('token', res.data.token);
        console.log(res);
      }).catch(err => {
        console.log(err);
      });
    }
  }else {
    if (isValid){
      login({
        mobile: fullPhone,
        password: form.password,
      }).then(res => {
        if (res.status === 200){
          router.push('/');
        }
      }).catch(err => {
        console.error(err);
      });
    }
  }



}
const validateInput = (field, value, type, regionCode = '') => {
  const val = value.trim();
  let isValid = true;

  // 空校验
  if (!val) {
    let fieldName;
    switch (field){
      case 'phone':
        fieldName = '手机号';
        break;
      case 'password':
        fieldName = '密码';
        break;
      case 'confirm':
        fieldName = '确认密码';
        break;
      case 'nickname':
        fieldName = '昵称';
        break;
      default:
        fieldName = '';
        break;
    }
    isValid = false;
    inputStates[field].placeholder = fieldName + '不能为空';
  }

  // 类型校验
  if (isValid) {
    if (type === 'phone') {
      if (regionCode === '+86') {
        isValid = Rex.checkPhone(val);
      } else {
        isValid = Rex.checkOtherPhone(val);
      }
      if (!isValid) {
        inputStates[field].placeholder = '手机号格式不正确';
      }
    }

    if (type === 'confirm') {
      if (val !== form.password) {
        isValid = false;
        inputStates[field].placeholder = '两次密码不一致';
      }
    }

    // 密码强度等校验? 不写啦嘻嘻:)
  }
  console.log(field);
  if (!isValid) {
    form[field] = '';
    inputStates[field].valid = false;
  } else {
    inputStates[field].valid = true;
    if (type === 'phone') inputStates[field].placeholder = '请输入手机号';
    else if (type === 'nickname') inputStates[field].placeholder = '请输入昵称'
    else if (type === 'password') inputStates[field].placeholder = '请输入密码';
    else if (type === 'confirm') inputStates[field].placeholder = '确认密码';
  }

  return isValid;
}

onMounted(()=>{
  nextTick(()=>{
    userOffline().then((res) => {
     const message = res.data.message;
     alert(message);
    })
  });
});
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(270deg, #ff9a9e, #fad0c4, #a1c4fd, #c2e9fb, #d4fc79, #96e6a1);
  background-size: 600% 600%;
  animation: gradientShift 20s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.auth-card {
  background: rgba(255, 255, 255, 0.2); /* 提高透明度显毛玻璃 */
  border-radius: 16px;
  padding: 2rem;
  width: 320px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  color: #333;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.toggle-buttons {
  display: flex;
  justify-content: space-between;
}

.toggle-buttons button {
  flex: 1;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #333;
  cursor: pointer;
  font-weight: bold;
  transition: color 0.3s, border-bottom 0.3s;
}

.toggle-buttons button.active {
  color: #111;
  border-bottom: 2px solid #111;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

input {
  padding: 0.5rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3) !important;
  color: #333;
  outline: none;
}

input::placeholder {
  color: #666;
}

button[type="submit"] {
  padding: 0.5rem;
  background: #4c4cff;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
}

button[type="submit"]:hover {
  background: #6c6cff;
}


.phone-input-wrapper {
  display: flex;
  position: relative;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}

.prefix-selector {
  background-color: rgba(255, 255, 255, 0.3);
  padding: 0 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  border-radius: 8px;
}

.region-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  color: #000;
  width: max-content;
  max-height: 500px;
  overflow-y: auto;
  z-index: 99999;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 10px;
}

.region-dropdown div {
  padding: 6px 12px;
  cursor: pointer;
}

.region-dropdown div:hover {
  background: #eee;
}

input[type="text"] {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px;
  background: transparent;
  color: #333;
}

.input-error {
  border: 1px solid #ff9598 !important;
  color:  #ff9598;
}

.input-error::placeholder {
  color:  #ff9598;
}
</style>

