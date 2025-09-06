// Настройка тестовой среды

import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import ElementPlus from 'element-plus'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

// Создаем i18n для тестов
const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    ru: {
      // Минимальные переводы для тестов
      common: {
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        add: 'Добавить',
        search: 'Поиск',
        loading: 'Загрузка...'
      }
    },
    en: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        loading: 'Loading...'
      }
    }
  }
})

// Глобальная конфигурация для всех тестов
config.global.plugins = [ElementPlus, i18n]

// Создаем новый Pinia store для каждого теста
config.global.plugins.push(() => createPinia())

// Глобальные моки
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Мок для window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Мок для localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Мок для console.warn и console.error в тестах
const originalWarn = console.warn
const originalError = console.error

console.warn = (...args) => {
  // Игнорируем предупреждения Vue о dev tools
  if (typeof args[0] === 'string' && args[0].includes('__VUE_PROD_DEVTOOLS__')) {
    return
  }
  originalWarn.apply(console, args)
}

console.error = (...args) => {
  // Логируем ошибки для отладки тестов
  originalError.apply(console, args)
}

// Мок для fetch API чтобы избежать реальных сетевых запросов
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Мок для IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

