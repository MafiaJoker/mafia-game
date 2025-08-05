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
      minify: false, // Временно отключаем минификацию для отладки
      // Для Electron нужно убедиться что все ассеты встроены правильно
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1000, // Увеличиваем лимит до 1MB
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          // Более безопасная обработка переменных
          unsafe: false,
          unsafe_comps: false,
          unsafe_Function: false,
          unsafe_math: false,
          unsafe_symbols: false,
          unsafe_methods: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          unsafe_undefined: false
        },
        mangle: {
          // Более консервативное изменение имен
          safari10: true,
          keep_fnames: true,
          reserved: ['$', 'exports', 'require']
        }
      },
      rollupOptions: {
        output: {
          // Добавляем хеш к файлам для предотвращения кеширования
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
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
      target: 'es2020',
      format: 'esm',
      drop: isDev ? [] : ['console', 'debugger'],
      // Улучшенная обработка областей видимости
      keepNames: true,
      legalComments: 'none'
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
