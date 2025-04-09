import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    base: './',
    plugins: [vue()],
    server: {
        port: 5173,  // 默认启动端口
        open: true,    // 自动打开浏览器
        hmr: true,
        proxy: {
            '/api': {
                target: 'http://mk-api.cavalry.gx.cn',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, '')
            }
        }
    }
})