// 测试接口
import instance from "@/api/request";

// /user/test/get-online-user-views
export const testGetOnlineUserViews = () => {
    return new Promise((resolve, reject) => {
        instance({
            url: '/user/test/get-online-user-views',
            method: 'get'
        }).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    });
};