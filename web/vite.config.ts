import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
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
    }
})
