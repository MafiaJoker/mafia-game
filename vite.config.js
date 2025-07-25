import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { execSync } from 'child_process'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'
  const isElectron = process.env.ELECTRON === 'true'

  // Получаем информацию о коммите
  let commitHash = ''
  let buildTime = ''
  
  try {
    commitHash = execSync('git rev-parse HEAD').toString().trim()
    buildTime = new Date().toISOString()
  } catch (error) {
    console.warn('Could not retrieve git commit hash:', error.message)
  }

  return {
    base: isElectron && command === 'build' ? './' : '/',
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
      minify: isDev ? false : 'esbuild',
      // Для Electron нужно убедиться что все ассеты встроены правильно
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1000, // Увеличиваем лимит до 1MB
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Разделяем vendor чанки для лучшего кеширования
            if (id.includes('node_modules')) {
              if (id.includes('element-plus')) {
                return 'element-plus'
              }
              if (id.includes('vue') || id.includes('@vue')) {
                return 'vue'
              }
              return 'vendor'
            }
          }
        }
      }
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
      hmr: false
    },
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      'import.meta.env.VITE_APP_COMMIT_HASH': JSON.stringify(commitHash),
      'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(buildTime),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      '__ELECTRON_API_BASE_URL__': JSON.stringify(process.env.VITE_API_BASE_URL || null)
    },
    test: {
      environment: 'happy-dom',
      globals: true
    }
  }
})
