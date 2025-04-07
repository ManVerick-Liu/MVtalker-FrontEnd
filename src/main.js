import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 确保已创建router目录

const app = createApp(App)
app.use(router) // 关键！启用路由
app.mount('#app')