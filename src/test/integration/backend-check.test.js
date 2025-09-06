// Проверка подключения к бэкенду

import { describe, it, expect } from 'vitest'

describe('Backend Connection Check', () => {
  it('должен подключиться к API на IPv4 адресе', async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // Ожидаем либо 401 (неавторизован), либо 200 (данные), но НЕ network error
      expect([200, 401, 403]).toContain(response.status)
    } catch (error) {
      // Если это network error, то API недоступен
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend API is not running on 127.0.0.1:8000')
      }
      throw error
    }
  }, 5000)

  it('должен получить ответ от health endpoint', async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/', {
        method: 'GET'
      })
      
      // Любой HTTP ответ означает что сервер работает
      expect(response.status).toBeGreaterThan(0)
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running on 127.0.0.1:8000')
      }
      throw error
    }
  }, 5000)
})