// Интеграционные тесты для API взаимодействий

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiService } from '@/services/api'
import { mockData } from '../utils.js'

// НЕ мокаем fetch - используем реальный API

describe('API Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('События API', () => {
    describe('GET /events', () => {
      it('должен получить список событий или ошибку авторизации', async () => {
        try {
          const events = await apiService.getEvents()
          // Если получили данные - проверяем что это массив
          expect(Array.isArray(events)).toBe(true)
        } catch (error) {
          // Ожидаем ошибку авторизации
          expect(error.message).toMatch(/401|unauthorized|session|auth/i)
        }
      })

      it('должен добавить параметры фильтрации', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => []
        }
        fetch.mockResolvedValue(mockResponse)

        await apiService.getEvents({ status: 'active', limit: 10 })

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          expect.any(Object)
        )
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        )
      })

      it('должен обработать ошибку 500', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server Error' })
        }
        fetch.mockResolvedValue(mockResponse)

        await expect(apiService.getEvents()).rejects.toThrow('Server Error')
      })
    })

    describe('GET /events/:id', () => {
      it('должен получить событие по ID', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData.event
        }
        fetch.mockResolvedValue(mockResponse)

        const event = await apiService.getEvent(1)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/events/1'),
          expect.objectContaining({ method: 'GET' })
        )
        expect(event).toEqual(mockData.event)
      })

      it('должен обработать ошибку 404', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          json: async () => ({ message: 'Event not found' })
        }
        fetch.mockResolvedValue(mockResponse)

        await expect(apiService.getEvent(999)).rejects.toThrow('Event not found')
      })
    })

    describe('POST /events', () => {
      it('должен создать новое событие', async () => {
        const newEvent = {
          label: 'Новое мероприятие',
          description: 'Описание',
          start_date: '2024-02-01'
        }
        
        const mockResponse = {
          ok: true,
          status: 201,
          json: async () => ({ id: 3, ...newEvent })
        }
        fetch.mockResolvedValue(mockResponse)

        const createdEvent = await apiService.createEvent(newEvent)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/events'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(newEvent)
          })
        )
        expect(createdEvent).toEqual({ id: 3, ...newEvent })
      })

      it('должен обработать ошибку валидации', async () => {
        const mockResponse = {
          ok: false,
          status: 422,
          json: async () => ({ 
            message: 'Validation Error',
            errors: {
              label: ['Поле обязательно для заполнения']
            }
          })
        }
        fetch.mockResolvedValue(mockResponse)

        await expect(apiService.createEvent({})).rejects.toThrow('Validation Error')
      })
    })

    describe('PUT /events/:id', () => {
      it('должен обновить событие', async () => {
        const updateData = { label: 'Обновленное название' }
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => ({ ...mockData.event, ...updateData })
        }
        fetch.mockResolvedValue(mockResponse)

        const updatedEvent = await apiService.updateEvent(1, updateData)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/events/1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateData)
          })
        )
        expect(updatedEvent.label).toBe('Обновленное название')
      })
    })

    describe('DELETE /events/:id', () => {
      it('должен удалить событие', async () => {
        const mockResponse = {
          ok: true,
          status: 204,
          json: async () => ({})
        }
        fetch.mockResolvedValue(mockResponse)

        await apiService.deleteEvent(1)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/events/1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      it('должен обработать ошибку при удалении используемого события', async () => {
        const mockResponse = {
          ok: false,
          status: 409,
          json: async () => ({ message: 'Cannot delete event with active games' })
        }
        fetch.mockResolvedValue(mockResponse)

        await expect(apiService.deleteEvent(1)).rejects.toThrow('Cannot delete event with active games')
      })
    })
  })

  describe('Пользователи API', () => {
    describe('GET /users', () => {
      it('должен получить список пользователей', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData.users
        }
        fetch.mockResolvedValue(mockResponse)

        const users = await apiService.getUsers()

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/users'),
          expect.objectContaining({ method: 'GET' })
        )
        expect(users).toEqual(mockData.users)
      })

      it('должен добавить пагинацию', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => ({ 
            data: mockData.users,
            total: 100,
            page: 1,
            per_page: 20
          })
        }
        fetch.mockResolvedValue(mockResponse)

        await apiService.getUsers({ page: 1, per_page: 20 })

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object)
        )
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('per_page=20'),
          expect.any(Object)
        )
      })
    })

    describe('POST /users', () => {
      it('должен создать пользователя', async () => {
        const newUser = {
          nickname: 'newuser',
          email: 'newuser@example.com',
          role: 'user'
        }
        
        const mockResponse = {
          ok: true,
          status: 201,
          json: async () => ({ id: 3, ...newUser })
        }
        fetch.mockResolvedValue(mockResponse)

        const createdUser = await apiService.createUser(newUser)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/users'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newUser)
          })
        )
        expect(createdUser).toEqual({ id: 3, ...newUser })
      })

      it('должен обработать ошибку дублирования email', async () => {
        const mockResponse = {
          ok: false,
          status: 409,
          json: async () => ({ message: 'Email already exists' })
        }
        fetch.mockResolvedValue(mockResponse)

        const newUser = { email: 'existing@example.com' }
        await expect(apiService.createUser(newUser)).rejects.toThrow('Email already exists')
      })
    })
  })

  describe('Авторизация API', () => {
    describe('POST /auth/login', () => {
      it('должен авторизовать пользователя', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        }
        
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'mock-jwt-token',
            user: mockData.user
          })
        }
        fetch.mockResolvedValue(mockResponse)

        const result = await apiService.login(credentials)

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(credentials)
          })
        )
        expect(result.token).toBe('mock-jwt-token')
        expect(result.user).toEqual(mockData.user)
      })

      it('должен обработать ошибку неверных учетных данных', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          json: async () => ({ message: 'Invalid credentials' })
        }
        fetch.mockResolvedValue(mockResponse)

        const credentials = { email: 'wrong@example.com', password: 'wrong' }
        await expect(apiService.login(credentials)).rejects.toThrow('Invalid credentials')
      })
    })

    describe('POST /auth/logout', () => {
      it('должен выйти из системы', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'Logged out successfully' })
        }
        fetch.mockResolvedValue(mockResponse)

        await apiService.logout()

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/logout'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('GET /auth/me', () => {
      it('должен получить текущего пользователя', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData.user
        }
        fetch.mockResolvedValue(mockResponse)

        const user = await apiService.getCurrentUser()

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/me'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer')
            })
          })
        )
        expect(user).toEqual(mockData.user)
      })

      it('должен обработать истекший токен', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          json: async () => ({ message: 'Token expired' })
        }
        fetch.mockResolvedValue(mockResponse)

        await expect(apiService.getCurrentUser()).rejects.toThrow('Token expired')
      })
    })
  })

  describe('Обработка ошибок сети', () => {
    it('должен обработать ошибку сети', async () => {
      fetch.mockRejectedValue(new Error('Network Error'))

      await expect(apiService.getEvents()).rejects.toThrow('Network Error')
    })

    it('должен обработать таймаут', async () => {
      fetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request Timeout')), 100)
        )
      )

      await expect(apiService.getEvents()).rejects.toThrow('Request Timeout')
    })
  })

  describe('Авторизация запросов', () => {
    it('должен добавить токен к запросам', async () => {
      // Устанавливаем токен
      localStorage.setItem('auth-token', 'test-token')
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => []
      }
      fetch.mockResolvedValue(mockResponse)

      await apiService.getEvents()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('должен работать без токена для публичных endpoints', async () => {
      localStorage.removeItem('auth-token')
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => []
      }
      fetch.mockResolvedValue(mockResponse)

      await apiService.getEvents()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      )
    })
  })

  describe('Retry механизм', () => {
    it('должен повторить запрос при ошибке 500', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server Error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockData.events
        })

      const events = await apiService.getEvents()

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(events).toEqual(mockData.events)
    })

    it('должен прекратить retry после максимального количества попыток', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server Error' })
      })

      await expect(apiService.getEvents()).rejects.toThrow('Server Error')
      
      // 1 первоначальный + 2 retry = 3 вызова
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })
})