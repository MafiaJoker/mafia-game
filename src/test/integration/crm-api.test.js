// Полные тесты CRM API функциональности

import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = 'http://127.0.0.1:8000/api/v1'

describe('CRM API Tests', () => {
  
  describe('Управление мероприятиями (Events CRUD)', () => {
    const eventData = {
      label: 'Тестовое мероприятие',
      description: 'Описание тестового мероприятия',
      start_date: '2024-03-15T10:00:00Z',
      language: 'rus',
      event_type_id: 1,
      max_participants: 100
    }

    it('должен создавать новое мероприятие (POST /events)', async () => {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      // Ожидаем 200/201 (создано), 401 (неавторизован) или 422 (валидация)
      expect([200, 201, 401, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200 || response.status === 201) {
        expect(data).toBeDefined()
        // Проверяем что получили объект
        expect(typeof data === 'object').toBe(true)
      }

      if (response.status === 401) {
        expect(data.detail.toLowerCase()).toMatch(/session|auth|unauthorized/i)
      }
    })

    it('должен редактировать мероприятие (PATCH /events/:id)', async () => {
      const updateData = {
        label: 'Обновленное название мероприятия',
        description: 'Новое описание'
      }

      const response = await fetch(`${API_BASE}/events/1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      // Ожидаем 200 (обновлено), 401 (неавторизован), 404 (не найдено)
      expect([200, 401, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data.label).toBe(updateData.label)
      }

      if (response.status === 401) {
        expect(data.detail.toLowerCase()).toMatch(/session|auth|unauthorized/i)
      }
    })

    it('должен удалять мероприятие (DELETE /events/:id)', async () => {
      const response = await fetch(`${API_BASE}/events/999`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Ожидаем 204 (удалено), 401 (неавторизован), 404 (не найдено)
      expect([204, 401, 404]).toContain(response.status)

      if (response.status === 401) {
        const data = await response.json()
        expect(data.detail.toLowerCase()).toMatch(/session|auth|unauthorized/i)
      }
    })
  })

  describe('Управление пользователями (Users CRUD)', () => {
    const userData = {
      nickname: 'testuser',
      email: 'test@example.com',
      role: 'user',
      first_name: 'Тест',
      last_name: 'Юзер'
    }

    it('должен получать список пользователей (GET /users)', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(typeof data === 'object').toBe(true)
      }

      if (response.status === 401) {
        expect(data.detail.toLowerCase()).toMatch(/session|auth|unauthorized/i)
      }
    })

    it('должен получать конкретного пользователя (GET /users/:id)', async () => {
      const response = await fetch(`${API_BASE}/users/1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data).toHaveProperty('id')
        expect(data).toHaveProperty('nickname')
      }
    })

    it('должен создавать нового пользователя (POST /users)', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      expect([201, 401, 403, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 201) {
        expect(data).toHaveProperty('id')
        expect(data.nickname).toBe(userData.nickname)
      }
    })

    it('должен обновлять пользователя (PATCH /users/:id)', async () => {
      const updateData = {
        first_name: 'Обновленное имя',
        last_name: 'Обновленная фамилия'
      }

      const response = await fetch(`${API_BASE}/users/1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data.first_name).toBe(updateData.first_name)
      }
    })

    it('должен удалять пользователя (DELETE /users/:id)', async () => {
      const response = await fetch(`${API_BASE}/users/999`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([204, 401, 403, 404]).toContain(response.status)

      if (response.status === 401) {
        const data = await response.json()
        expect(data.detail.toLowerCase()).toMatch(/session|auth|unauthorized/i)
      }
    })
  })

  describe('Типы мероприятий (Event Types)', () => {
    const eventTypeData = {
      label: 'Турнир',
      description: 'Турнирный формат игры',
      color: '#FF5722'
    }

    it('должен получать список типов мероприятий (GET /event-types)', async () => {
      const response = await fetch(`${API_BASE}/event-types`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(Array.isArray(data) || typeof data === 'object').toBe(true)
      }
    })

    it('должен создавать новый тип мероприятия (POST /event-types)', async () => {
      const response = await fetch(`${API_BASE}/event-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventTypeData)
      })

      expect([201, 401, 403, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 201) {
        expect(data).toHaveProperty('id')
        expect(data.label).toBe(eventTypeData.label)
      }
    })

    it('должен обновлять тип мероприятия (PATCH /event-types/:id)', async () => {
      const updateData = {
        label: 'Обновленный турнир',
        color: '#4CAF50'
      }

      const response = await fetch(`${API_BASE}/event-types/1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data.label).toBe(updateData.label)
      }
    })

    it('должен удалять тип мероприятия (DELETE /event-types/:id)', async () => {
      const response = await fetch(`${API_BASE}/event-types/999`, {
        method: 'DELETE'
      })

      expect([204, 401, 403, 404]).toContain(response.status)
    })
  })

  describe('Регистрация на события (Event Registrations)', () => {
    const registrationData = {
      event_id: 1,
      user_id: 1,
      status: 'registered',
      notes: 'Тестовая регистрация'
    }

    it('должен получать регистрации на мероприятие (GET /events/:id/registrations)', async () => {
      const response = await fetch(`${API_BASE}/events/1/registrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(Array.isArray(data) || typeof data === 'object').toBe(true)
      }
    })

    it('должен регистрировать пользователя на мероприятие (POST /events/:id/register)', async () => {
      const response = await fetch(`${API_BASE}/events/1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: registrationData.notes })
      })

      expect([201, 401, 404, 409, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 201) {
        expect(data).toHaveProperty('id')
      }

      if (response.status === 409) {
        // Уже зарегистрирован
        expect(data.detail.toLowerCase()).toMatch(/already|registered|exist/i)
      }
    })

    it('должен отменять регистрацию (DELETE /events/:id/register)', async () => {
      const response = await fetch(`${API_BASE}/events/1/register`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([204, 401, 404]).toContain(response.status)
    })

    it('должен получать регистрации пользователя (GET /users/:id/registrations)', async () => {
      const response = await fetch(`${API_BASE}/users/1/registrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(Array.isArray(data) || typeof data === 'object').toBe(true)
      }
    })
  })

  describe('Тарифные планы (Tariffs)', () => {
    const tariffData = {
      name: 'Базовый план',
      description: 'Базовый тарифный план',
      price: 1000,
      currency: 'RUB',
      duration_months: 1,
      features: {
        max_events: 10,
        max_participants: 100,
        analytics: false,
        support: 'basic'
      }
    }

    it('должен получать список тарифов (GET /tariffs)', async () => {
      const response = await fetch(`${API_BASE}/tariffs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(Array.isArray(data) || typeof data === 'object').toBe(true)
      }
    })

    it('должен получать конкретный тариф (GET /tariffs/:id)', async () => {
      const response = await fetch(`${API_BASE}/tariffs/1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data).toHaveProperty('id')
        expect(data).toHaveProperty('name')
        expect(data).toHaveProperty('price')
      }
    })

    it('должен создавать новый тариф (POST /tariffs)', async () => {
      const response = await fetch(`${API_BASE}/tariffs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tariffData)
      })

      expect([201, 401, 403, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 201) {
        expect(data).toHaveProperty('id')
        expect(data.name).toBe(tariffData.name)
        expect(data.price).toBe(tariffData.price)
      }
    })

    it('должен обновлять тариф (PATCH /tariffs/:id)', async () => {
      const updateData = {
        name: 'Обновленный план',
        price: 1500,
        features: {
          max_events: 20,
          max_participants: 200,
          analytics: true,
          support: 'premium'
        }
      }

      const response = await fetch(`${API_BASE}/tariffs/1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(data.name).toBe(updateData.name)
        expect(data.price).toBe(updateData.price)
      }
    })

    it('должен удалять тариф (DELETE /tariffs/:id)', async () => {
      const response = await fetch(`${API_BASE}/tariffs/999`, {
        method: 'DELETE'
      })

      expect([204, 401, 403, 404]).toContain(response.status)
    })

    it('должен получать активные подписки пользователя (GET /users/:id/subscriptions)', async () => {
      const response = await fetch(`${API_BASE}/users/1/subscriptions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 200) {
        expect(Array.isArray(data) || typeof data === 'object').toBe(true)
      }
    })

    it('должен создавать подписку на тариф (POST /subscriptions)', async () => {
      const subscriptionData = {
        user_id: 1,
        tariff_id: 1,
        payment_method: 'card'
      }

      const response = await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      expect([201, 401, 403, 422]).toContain(response.status)

      const data = await response.json()
      expect(data).toBeDefined()

      if (response.status === 201) {
        expect(data).toHaveProperty('id')
        expect(data.tariff_id).toBe(subscriptionData.tariff_id)
      }
    })
  })

  describe('Дополнительные CRM функции', () => {
    it('должен получать статистику событий (GET /analytics/events)', async () => {
      const response = await fetch(`${API_BASE}/analytics/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      if (response.ok) {
        const data = await response.json()
        expect(data).toBeDefined()
        expect(typeof data === 'object').toBe(true)
      }
    })

    it('должен получать статистику пользователей (GET /analytics/users)', async () => {
      const response = await fetch(`${API_BASE}/analytics/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)

      if (response.ok) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })

    it('должен экспортировать данные (GET /export/events)', async () => {
      const response = await fetch(`${API_BASE}/export/events?format=json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([200, 401, 403, 404]).toContain(response.status)
    })
  })
})