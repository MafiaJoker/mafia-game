// Утилиты для тестирования

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// Создание мок роутера для тестов
export function createMockRouter(routes = []) {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/events', component: { template: '<div>Events</div>' } },
      { path: '/events/:id', component: { template: '<div>Event</div>' } },
      { path: '/users', component: { template: '<div>Users</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
      { path: '/profile', component: { template: '<div>Profile</div>' } },
      { path: '/tariffs', component: { template: '<div>Tariffs</div>' } },
      ...routes
    ]
  })
}

// Обертка для монтирования компонентов с общими зависимостями
export function mountComponent(component, options = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  
  const router = createMockRouter(options.routes || [])
  
  const defaultGlobal = {
    plugins: [pinia, router],
    stubs: {
      'router-link': true,
      'router-view': true,
      'el-icon': true,
      ...options.stubs
    }
  }

  return mount(component, {
    global: {
      ...defaultGlobal,
      ...options.global
    },
    ...options
  })
}

// Мок для API сервиса
export function createMockApiService(overrides = {}) {
  return {
    // События
    getEvents: vi.fn().mockResolvedValue([]),
    getEvent: vi.fn().mockResolvedValue(null),
    createEvent: vi.fn().mockResolvedValue({ id: 1 }),
    updateEvent: vi.fn().mockResolvedValue({ id: 1 }),
    deleteEvent: vi.fn().mockResolvedValue({}),
    
    // Типы событий
    getEventTypes: vi.fn().mockResolvedValue([]),
    createEventType: vi.fn().mockResolvedValue({ id: 1 }),
    
    // Пользователи
    getUsers: vi.fn().mockResolvedValue([]),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    updateUser: vi.fn().mockResolvedValue({ id: 1 }),
    
    // Авторизация
    login: vi.fn().mockResolvedValue({ token: 'mock-token' }),
    logout: vi.fn().mockResolvedValue({}),
    
    // Тарифы
    getTariffs: vi.fn().mockResolvedValue([]),
    
    // Регистрации
    getEventRegistrations: vi.fn().mockResolvedValue([]),
    registerForEvent: vi.fn().mockResolvedValue({}),
    
    ...overrides
  }
}

// Мок данных для тестирования
export const mockData = {
  event: {
    id: 1,
    label: 'Тестовое мероприятие',
    description: 'Описание тестового мероприятия',
    start_date: '2024-01-15',
    language: 'rus',
    event_type: {
      id: 1,
      label: 'Турнир'
    },
    status: 'active'
  },
  
  events: [
    {
      id: 1,
      label: 'Мероприятие 1',
      start_date: '2024-01-15',
      status: 'active'
    },
    {
      id: 2,
      label: 'Мероприятие 2', 
      start_date: '2024-01-20',
      status: 'completed'
    }
  ],
  
  user: {
    id: 1,
    nickname: 'testuser',
    email: 'test@example.com',
    role: 'user'
  },
  
  users: [
    {
      id: 1,
      nickname: 'user1',
      email: 'user1@example.com',
      role: 'user'
    },
    {
      id: 2,
      nickname: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    }
  ],
  
  eventType: {
    id: 1,
    label: 'Турнир',
    description: 'Турнирный формат игры'
  },
  
  tariff: {
    id: 1,
    name: 'Базовый',
    price: 1000,
    features: ['Создание событий', 'До 10 столов']
  }
}

// Утилиты для асинхронного тестирования
export async function flushPromises() {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
}

// Ожидание загрузки компонента
export async function waitForComponentToLoad(wrapper) {
  await flushPromises()
  await wrapper.vm.$nextTick()
}

// Утилита для тестирования форм
export function fillForm(wrapper, formData) {
  Object.entries(formData).forEach(([field, value]) => {
    const input = wrapper.find(`[data-testid="${field}"], input[name="${field}"], textarea[name="${field}"]`)
    if (input.exists()) {
      input.setValue(value)
    }
  })
}

// Утилита для эмуляции клика по кнопке
export async function clickButton(wrapper, buttonText) {
  const button = wrapper.find(`button:contains("${buttonText}")`)
  if (button.exists()) {
    await button.trigger('click')
    await flushPromises()
  }
}

// Проверка наличия ошибок в консоли во время теста
export function expectNoConsoleErrors() {
  const originalError = console.error
  const errors = []
  
  console.error = (...args) => {
    errors.push(args)
    originalError.apply(console, args)
  }
  
  return {
    restore: () => {
      console.error = originalError
    },
    getErrors: () => errors
  }
}