import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  return {
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
      sourcemap: false,
      minify: isDev ? false : 'esbuild'
    },
    css: {
      devSourcemap: false
    },
    esbuild: {
      sourcemap: false,
      drop: isDev ? [] : ['console', 'debugger']
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        sourcemap: false,
        target: 'es2020'
      },
      exclude: []
    },
    server: {
        allowedHosts: [
            'dev.jokermafia.am',
        'localhost',
        '.ngrok.io',
        '.ngrok-free.app'
      ],
      hmr: {
        overlay: {
          warnings: false,
          errors: false
        }
      }
    },
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    },
    test: {
      environment: 'happy-dom',
      globals: true
    }
  }
})
