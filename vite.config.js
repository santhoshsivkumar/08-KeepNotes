import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
          'vendor-quill': ['react-quill-new'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
