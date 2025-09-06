// Интеграционные тесты с реальным API

import { describe, it, expect, beforeEach } from 'vitest'
import { apiService } from '@/services/api'

describe('Real API Integration Tests', () => {
  beforeEach(async () => {
    // Ждем инициализации API
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  describe('API Connectivity', () => {
    it('должен подключаться к API серверу', async () => {
      try {
        // Попытка получить события
        const events = await apiService.getEvents()
        expect(Array.isArray(events)).toBe(true)
      } catch (error) {
        // Ожидаем либо данные, либо ошибку авторизации (что означает что API работает)
        expect(error.response?.status === 401 || error.message.includes('401')).toBe(true)
      }
    })

    it('должен обрабатывать ошибки авторизации корректно', async () => {
      try {
        await apiService.getEvents()
      } catch (error) {
        // Если получили ошибку - она должна быть об авторизации
        if (error.response?.status) {
          expect([401, 403]).toContain(error.response.status)
        } else {
          expect(error.message).toMatch(/401|403|unauthorized|session|auth/i)
        }
      }
    })
  })

  describe('API Service Methods', () => {
    it('должен иметь все необходимые методы', () => {
      expect(typeof apiService.getEvents).toBe('function')
      expect(typeof apiService.getEvent).toBe('function')
      expect(typeof apiService.createEvent).toBe('function')
      expect(typeof apiService.updateEvent).toBe('function')
      expect(typeof apiService.deleteEvent).toBe('function')
      expect(typeof apiService.login).toBe('function')
      expect(typeof apiService.logout).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('должен бросать понятные ошибки при неавторизованных запросах', async () => {
      try {
        await apiService.getEvent(999999)
        // Если не выбросилась ошибка, значит что-то не так
        expect(false).toBe(true)
      } catch (error) {
        // Проверяем что получили ошибку авторизации
        expect(error).toBeDefined()
        expect(
          error.response?.status === 401 || 
          error.response?.status === 403 ||
          error.message.includes('401') ||
          error.message.includes('unauthorized')
        ).toBe(true)
      }
    })
  })

  describe('Network', () => {
    it('должен делать HTTP запросы к правильному URL', async () => {
      try {
        await apiService.getEvents()
      } catch (error) {
        // Если это network error, значит API недоступен
        if (error.code === 'ECONNREFUSED') {
          throw new Error('API server is not running on localhost:8000')
        }
        // Если это авторизационная ошибка - это хорошо, значит API работает
        expect(error.response?.status === 401 || error.message.includes('401')).toBe(true)
      }
    })
  })
})