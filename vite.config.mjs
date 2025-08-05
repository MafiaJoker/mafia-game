import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { execSync } from 'node:child_process'

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
      minify: 'esbuild', // Возвращаем esbuild минификацию
      // Для Electron нужно убедиться что все ассеты встроены правильно
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1000, // Увеличиваем лимит до 1MB
      rollupOptions: {
        output: {
          // Добавляем хеш к файлам для предотвращения кеширования
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // Более продвинутая логика разделения чанков
            if (id.includes('node_modules')) {
              if (id.includes('vue') && !id.includes('vue-router') && !id.includes('@vue/')) {
                return 'vue'
              }
              if (id.includes('@vue/')) {
                return 'vue-runtime'
              }
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }
              if (id.includes('element-plus')) {
                return 'element-plus'
              }
              if (id.includes('@element-plus/icons-vue')) {
                return 'element-icons'
              }
              if (id.includes('md-editor-v3')) {
                return 'md-editor'
              }
              if (id.includes('axios')) {
                return 'axios'
              }
              return 'vendor'
            }
            
            // Группируем наши модули
            if (id.includes('/stores/')) {
              return 'stores'
            }
            if (id.includes('/components/')) {
              return 'components'
            }
            if (id.includes('/views/')) {
              return 'views'
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
      target: 'es2020',
      format: 'esm',
      drop: isDev ? [] : ['console', 'debugger'],
      // Более консервативная обработка для предотвращения ошибок области видимости
      keepNames: true,
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: false, // Отключаем минификацию идентификаторов
      minifySyntax: true,
      minifyWhitespace: true
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        sourcemap: false,
        target: 'es2020'
      },
      include: [
        'vue',
        'vue-router',
        'pinia',
        'element-plus',
        '@element-plus/icons-vue',
        'axios'
      ],
      exclude: ['md-editor-v3']
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
