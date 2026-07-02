import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 拆 vendor chunk: 改业务代码不重下 vendor
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'battle-motion'
          if (id.includes('node_modules/@hero-legend/game-engine')
           || id.includes('node_modules/@hero-legend/game-data')
           || id.includes('node_modules/@hero-legend/ai-engine')) return 'battle-engine'
          if (id.includes('node_modules/react-router')
           || id.includes('node_modules/zustand')) return 'vendor-router'
          if (id.includes('node_modules/react')
           || id.includes('node_modules/react-dom')
           || id.includes('node_modules/scheduler')) return 'vendor-react'
        },
      },
    },
  },
})
