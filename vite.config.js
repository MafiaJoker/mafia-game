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
      rollupOptions: {
        output: {
          manualChunks: undefined
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
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0')
    },
    test: {
      environment: 'happy-dom',
      globals: true
    }
  }
})
