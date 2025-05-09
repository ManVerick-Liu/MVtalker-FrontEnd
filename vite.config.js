import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    base: './',
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    build: {
    outDir: 'MVtalker'
},
    server: {
        //开启宽泛ip
        host: '0.0.0.0',
        port: 5173,  // 默认启动端口
        open: true,    // 自动打开浏览器
        hmr: true,
        cors: true,
        proxy: {
            '/api': {
                target: 'http://mk-api.cavalry.gx.cn',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, '')
            }
        }
    }
});