import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    // experimental: {
    //     enableNativePlugin: true,
    // },
    server: {
        port: 5177,
    },
    plugins: [react()],
    build: {
        // rollupOptions: {
        //     output: {
        //         manualChunks: {
        //             vendor: ['react-ace', 'ace-builds'],
        //             // ui: ['@mui/material', '@mui/icons-material']
        //         }
        //     }
        // }
    },
    legacy: {
        /* react-ace requires this */
        inconsistentCjsInterop: true,
    },
})
