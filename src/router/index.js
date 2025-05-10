import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import {getUserStatus} from "@/api/UserService";

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginAndRegister.vue')
  },
  // {
  //   path: '/test',
  //   name: 'test',
  //   component: () => import('../views/Test.vue')
  // }
]

const router = createRouter({
  history: createWebHistory(),
  routes
});


router.beforeEach(async (to, from, next) => {
  // 不需要拦截的路由
  const whiteList = ['/login'];
  const token = localStorage.getItem('token');
  // 如果是白名单页面，直接放行
  if (whiteList.includes(to.path)) {
    return next();
  }

  try {
   if (!token?.trim()){
     next('/login');
   }
   // else {
   //   const res = await getUserStatus();
   //   const status = res?.data?.data?.userStatus.onlineStatus;
   //   console.log('status', status);
   //   if (status === 'ONLINE') {
   //     console.log('用户在线')
   //     next();
   //   } else {
   //     console.log('用户不在线')
   //     next('/login');
   //   }
   // }
  } catch (err) {
    console.error('获取用户状态失败:', err);
    next('/login');
  }
  next();
});


export default router