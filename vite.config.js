import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia']
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    sourcemap: command === 'serve' ? false : false
  },
  css: {
    devSourcemap: false
  },
  esbuild: {
    sourcemap: false
  },
  optimizeDeps: {
    force: true
  },
  server: {
    hmr: {
      overlay: {
        warnings: false,
        errors: false
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true
  }
}))
