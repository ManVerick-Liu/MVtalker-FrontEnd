

export const intervalRequestReactive = (reqFn, time) => {
    const data = ref(null);
    const timer = setInterval(() => {
        reqFn().then(res => {
            data.value = res.data;
        });
    }, time);
    return { timer, data };
};
