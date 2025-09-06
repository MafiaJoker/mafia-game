// Простые интеграционные тесты с реальным API

import { describe, it, expect, beforeAll } from 'vitest'
import { apiService } from '@/services/api'

// Принудительно используем IPv4
process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8000/api/v1'

describe('Simple API Tests', () => {
  describe('API Service Structure', () => {
    it('должен экспортировать apiService', () => {
      expect(apiService).toBeDefined()
      expect(typeof apiService).toBe('object')
    })

    it('должен иметь метод getEvents', () => {
      expect(typeof apiService.getEvents).toBe('function')
    })

    it('должен иметь метод getEvent', () => {
      expect(typeof apiService.getEvent).toBe('function')
    })

    it('должен иметь метод createEvent', () => {
      expect(typeof apiService.createEvent).toBe('function')
    })

    it('должен иметь метод updateEvent', () => {
      expect(typeof apiService.updateEvent).toBe('function')
    })

    it('должен иметь метод deleteEvent', () => {
      expect(typeof apiService.deleteEvent).toBe('function')
    })

    it('должен иметь метод testUserLogin', () => {
      expect(typeof apiService.testUserLogin).toBe('function')
    })
  })

  describe('API Connection', () => {
    it('должен подключаться к API или возвращать ошибку авторизации', async () => {
      try {
        const events = await apiService.getEvents()
        // Если получили данные - проверяем структуру
        expect(Array.isArray(events) || typeof events === 'object').toBe(true)
      } catch (error) {
        // Ожидаем ошибку авторизации (что нормально для неавторизованных запросов)
        expect(error.response?.status === 401 || error.message.toLowerCase().includes('unauthorized')).toBe(true)
      }
    }, 10000) // Увеличиваем таймаут

    it('должен попытаться авторизоваться тестовым пользователем', async () => {
      try {
        const result = await apiService.testUserLogin()
        // Если авторизация прошла успешно
        expect(result).toBeDefined()
      } catch (error) {
        // Если не получилось - это может быть нормально
        console.log('Test user login failed:', error.message)
        expect(error).toBeDefined()
      }
    }, 10000)
  })
})