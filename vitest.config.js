// Конфигурация Vitest для тестирования CRM функциональности

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia', 'vitest']
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    
    // Покрытие кода
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        'src/main.js',
        'src/router/',
        'src/config/',
        'src/utils/generateTestData.js'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // Настройки для различных типов тестов
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Таймауты
    testTimeout: 10000,
    hookTimeout: 10000,

    // Паттерны для поиска тестов
    include: [
      'src/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'src/test/setup.js',
      'src/test/utils.js'
    ],

    // Репортеры
    reporter: ['verbose'],

    // Оптимизация зависимостей
    server: {
      deps: {
        inline: ['element-plus', '@element-plus/icons-vue']
      }
    }
  },

  // Определяем переменные окружения для тестов
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },

  // Настройки для тестовой среды
  server: {
    host: '127.0.0.1' // Принудительно используем IPv4
  },

  esbuild: {
    target: 'node14'
  }
})