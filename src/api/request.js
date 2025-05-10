// axios 请求拦截器 + 实例集成
import axios from 'axios'
const baseUrl = import.meta.env.VITE_API_BASE_URL;
// axios.defaults.baseURL = '/api';
axios.defaults.baseURL = 'http://mk-api.cavalry.gx.cn';
console.log('apiBaseUrl', baseUrl);
// axios.defaults.baseURL = baseUrl;
axios.defaults.timeout = 100000;
axios.defaults.headers.post['Content-Type'] = 'application/json';
// 设定请求头TOKEN
axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;


export const instance = axios.create({});


// 请求拦截
instance.interceptors.request.use(
    config => {
        // console.log(config);
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 响应拦截
instance.interceptors.response.use(
    response => {
        // console.log(response);
        // console.log(response.request)
        if (response.request.responseURL.includes('/user/login') || response.request.responseURL.includes('/user/register')){
            console.log('token', response.data.data.token);
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('userInfo',JSON.stringify(response.data.data.userInfo));
            localStorage.setItem('userStatus',JSON.stringify(response.data.data.userStatus));
            localStorage.setItem('userGlobalVolume',JSON.stringify(response.data.data.userGlobalVolume));
        }
        else if (response.request.responseURL.includes('get-user-info-by-user-id')){
            localStorage.setItem('userInfo',JSON.stringify(response.data.data.userInfo));
        }
        else if (response.request.responseURL.includes('get-user-status-by-user-id')){
            localStorage.setItem('userStatus',JSON.stringify(response.data.data.userStatus));
        }
        // else if (response.request.responseURL.includes('/user/offline')){
        //     localStorage.removeItem('token');
        //     localStorage.removeItem('userInfo');
        //     localStorage.removeItem('userStatus');
        //     localStorage.removeItem('userGlobalVolume');
        // }
        return response;
    },
    error => {
        return Promise.reject(error);
    }
);


export default instance;