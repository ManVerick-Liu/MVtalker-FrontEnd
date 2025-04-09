import instance from "../request";

export const login = (data = {
    mobile: '', // string E.164格式明文手机号码
    password: '' // string 明文密码
}) => {
    return new Promise((resolve, reject) => {
        instance({
            url: '/user/login',
            method: 'post',
            data
        }).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    });
};

export const register = (data = {
    mobile: '', // string E.164格式明文手机号码
    password: '', // string 明文密码
    nickname: '' // string 昵称
}) => {
    return new Promise((resolve, reject) => {
        instance({
            url: '/user/register',
            method: 'post',
            data
        }).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    });
};

export const userOffline = () => {
    return new Promise((resolve, reject) => {
        instance({
            url: '/user/offline',
            method: 'patch'
        }).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    });
};