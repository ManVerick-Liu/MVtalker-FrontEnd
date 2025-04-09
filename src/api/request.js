// axios 请求拦截器 + 实例集成

import axios from 'axios'

axios.defaults.baseURL = '/api';
axios.defaults.timeout = 5000;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.defaults.headers.post['Content-Type'] = 'application/json';
// axios.defaults.withCredentials = true;
// 设定请求头TOKEN
axios.defaults.headers.common['Authorization'] = localStorage.getItem('token');


export const instance = axios.create({});


// 请求拦截
instance.interceptors.request.use(
    config => {
        console.log(config);
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 响应拦截
instance.interceptors.response.use(
    response => {
        console.log(response);
        if (response.data.data.token !== null || response.data.data.token !== '' || response.data.data.token !== undefined) {
            console.log('token', response.data.data.token);
            localStorage.setItem('token',`Bearer ${response.data.data.token}`);
        }
        return response;
    },
    error => {
        return Promise.reject(error);
    }
);


export default instance;