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
      minify: false, // Полностью отключаем минификацию
      // Для Electron нужно убедиться что все ассеты встроены правильно
      assetsDir: 'assets',
      chunkSizeWarningLimit: 2000, // Увеличиваем лимит до 2MB
      rollupOptions: {
        output: {
          // Добавляем хеш к файлам для предотвращения кеширования
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Упрощаем разделение чанков - оставляем Vue как единый блок
          manualChunks: {
            'vue-ecosystem': ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared', 'vue-router', 'pinia'],
            'ui-library': ['element-plus', '@element-plus/icons-vue'],
            'markdown': ['md-editor-v3'],
            'http': ['axios']
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
      drop: isDev ? [] : [], // Не удаляем ничего в production для безопасности
      // Максимально консервативная обработка
      keepNames: true,
      legalComments: 'none',
      treeShaking: false, // Отключаем tree shaking
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: false
    },
    optimizeDeps: {
      force: false, // Не форсируем пересборку зависимостей
      esbuildOptions: {
        sourcemap: false,
        target: 'es2020',
        keepNames: true
      },
      include: [
        'vue',
        'vue-router', 
        'pinia',
        'element-plus',
        '@element-plus/icons-vue',
        'axios',
        'md-editor-v3' // Включаем md-editor-v3 в оптимизацию
      ]
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
    }
  }
})
