import axios from 'axios'
import { faker } from '@faker-js/faker'
import { SEED_CONFIG } from '@/config/seedConfig.js'

export class BaseSeeder {
    constructor() {
        this.api = axios.create({
            baseURL: 'https://dev.api.jokermafia.am/api/v1',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: SEED_CONFIG.api.timeout
        })
        
        // Настраиваем faker для русской локализации
        faker.setLocale('ru')
        
        this.createdIds = new Set()
        this.errors = []
        this.success = []
    }
    
    // Базовые методы для логирования
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString()
        const prefix = `[${timestamp}] ${this.constructor.name}:`
        
        switch (type) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`)
                this.errors.push(message)
                break
            case 'success':
                console.log(`${prefix} ✅ ${message}`)
                this.success.push(message)
                break
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`)
                break
            default:
                console.log(`${prefix} ℹ️ ${message}`)
        }
    }
    
    // Метод для выполнения API запросов с ретраями
    async apiCall(method, url, data = null, retries = SEED_CONFIG.api.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                let response
                switch (method.toLowerCase()) {
                    case 'get':
                        response = await this.api.get(url)
                        break
                    case 'post':
                        response = await this.api.post(url, data)
                        break
                    case 'put':
                        response = await this.api.put(url, data)
                        break
                    case 'patch':
                        response = await this.api.patch(url, data)
                        break
                    case 'delete':
                        response = await this.api.delete(url)
                        break
                    default:
                        throw new Error(`Неподдерживаемый HTTP метод: ${method}`)
                }
                
                return response.data
            } catch (error) {
                this.log(`Попытка ${attempt}/${retries} неудачна: ${error.message}`, 'warn')
                
                if (attempt === retries) {
                    throw error
                }
                
                // Пауза перед повторной попыткой
                await this.delay(1000 * attempt)
            }
        }
    }
    
    // Вспомогательные методы
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
    
    // Генерация случайной даты
    randomDate(start = new Date(2024, 0, 1), end = new Date(2024, 11, 31)) {
        return faker.date.between(start, end)
    }
    
    // Генерация случайного элемента из массива
    randomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)]
    }
    
    // Генерация случайного числа
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }
    
    // Генерация случайного булева
    randomBoolean() {
        return Math.random() < 0.5
    }
    
    // Отчёт о выполнении
    printReport() {
        this.log(`\\n📊 Отчёт о выполнении:`)
        this.log(`✅ Успешно: ${this.success.length}`)
        this.log(`❌ Ошибок: ${this.errors.length}`)
        
        if (this.errors.length > 0) {
            this.log(`\\nПодробности ошибок:`)
            this.errors.forEach(error => this.log(`  • ${error}`, 'error'))
        }
        
        if (this.createdIds.size > 0) {
            this.log(`\\n🆔 Созданные ID: ${Array.from(this.createdIds).join(', ')}`)
        }
    }
    
    // Абстрактные методы, которые должны быть реализованы в наследниках
    async seed() {
        throw new Error('Метод seed() должен быть реализован в наследнике')
    }
    
    async clean() {
        throw new Error('Метод clean() должен быть реализован в наследнике')
    }
    
    // Метод для проверки состояния API
    async checkApiHealth() {
        try {
            await this.apiCall('get', '/healthz')
            this.log('API доступно', 'success')
            return true
        } catch (error) {
            this.log(`API недоступно: ${error.message}`, 'error')
            return false
        }
    }
    
    // Безопасное выполнение с проверкой API
    async safeRun(operation) {
        this.log(`🚀 Запуск ${operation}...`)
        
        const isHealthy = await this.checkApiHealth()
        if (!isHealthy) {
            this.log('Прерывание выполнения из-за недоступности API', 'error')
            return false
        }
        
        try {
            const startTime = Date.now()
            await this[operation]()
            const duration = Date.now() - startTime
            
            this.log(`🏁 ${operation} завершён за ${duration}ms`, 'success')
            this.printReport()
            
            return true
        } catch (error) {
            this.log(`Критическая ошибка в ${operation}: ${error.message}`, 'error')
            this.printReport()
            return false
        }
    }
}