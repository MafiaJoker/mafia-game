#!/usr/bin/env node

// Скрипт для создания 10 тестовых пользователей
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'

const testUsers = [
    { nickname: 'Игрок1' },
    { nickname: 'Игрок2' },
    { nickname: 'Игрок3' },
    { nickname: 'Игрок4' },
    { nickname: 'Игрок5' },
    { nickname: 'Игрок6' },
    { nickname: 'Игрок7' },
    { nickname: 'Игрок8' },
    { nickname: 'Игрок9' },
    { nickname: 'Игрок10' }
]

async function createTestUsers() {
    console.log('Создание 10 тестовых пользователей...')
    
    const api = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json'
        }
    })

    // Создаем interceptor для сохранения cookies
    let sessionCookie = null
    api.interceptors.response.use((response) => {
        const cookies = response.headers['set-cookie']
        if (cookies) {
            sessionCookie = cookies.find(cookie => cookie.startsWith('session='))
        }
        return response
    })

    api.interceptors.request.use((config) => {
        if (sessionCookie) {
            config.headers.Cookie = sessionCookie
        }
        return config
    })

    // Сначала авторизуемся
    try {
        console.log('Авторизация...')
        await api.put('/auth/token', 
            {"id": "e6ad1ca2-4a84-4845-ad8d-7f5617d0af5a", "role": "cashier"},
            {headers: {'Authorization': 'Basic e37bd08d'}}
        )
        console.log('✅ Авторизация успешна')
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error.response?.data || error.message)
        return
    }

    const createdUsers = []

    for (let i = 0; i < testUsers.length; i++) {
        try {
            console.log(`Создание пользователя: ${testUsers[i].nickname}`)
            const response = await api.post('/users', testUsers[i])
            console.log(`✅ Создан пользователь: ${testUsers[i].nickname}, ID: ${response.data.id}`)
            createdUsers.push({
                nickname: testUsers[i].nickname,
                id: response.data.id
            })
        } catch (error) {
            console.error(`❌ Ошибка создания пользователя ${testUsers[i].nickname}:`, error.response?.data || error.message)
        }
    }

    console.log('\n📋 Созданные пользователи:')
    createdUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname} - ${user.id}`)
    })

    console.log(`\n✨ Создано ${createdUsers.length} из ${testUsers.length} пользователей`)
}

createTestUsers().catch(console.error)