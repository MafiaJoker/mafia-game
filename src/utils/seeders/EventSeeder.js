import { faker } from '@faker-js/faker'
import { BaseSeeder } from './BaseSeeder.js'
import { SEED_CONFIG, getProfileConfig } from '@/config/seedConfig.js'

export class EventSeeder extends BaseSeeder {
    constructor(profile = 'minimal') {
        super()
        this.profile = getProfileConfig(profile)
        this.eventTypes = []
    }
    
    // Генерация случайного типа мероприятия
    generateEventType() {
        const categories = SEED_CONFIG.events.categories
        const sportNames = [
            'Мафия', 'Классическая Мафия', 'Турнирная Мафия',
            'Спортивная Мафия', 'Клубная Мафия'
        ]
        
        return {
            name: this.randomFromArray(sportNames),
            category: this.randomFromArray(categories),
            description: faker.lorem.paragraph(),
            rules: faker.lorem.paragraphs(2),
            maxPlayers: 10,
            minPlayers: 10,
            isActive: true
        }
    }
    
    // Генерация случайного мероприятия
    generateEvent(eventTypeId = null) {
        const categories = SEED_CONFIG.events.categories
        const languages = SEED_CONFIG.events.languages
        const statuses = SEED_CONFIG.events.statuses
        
        // Генерируем реалистичные названия турниров
        const eventPrefixes = [
            'Открытый турнир', 'Чемпионат', 'Кубок', 'Фестиваль', 
            'Первенство', 'Клубный турнир', 'Лига', 'Мастерская'
        ]
        
        const eventSuffixes = [
            'по спортивной мафии', 'среди любителей', 'памяти героев',
            'на кубок города', 'весенний', 'осенний', 'новогодний',
            'для начинающих', 'профессионалов', 'студентов'
        ]
        
        const prefix = this.randomFromArray(eventPrefixes)
        const suffix = this.randomFromArray(eventSuffixes)
        const eventName = `${prefix} ${suffix}`
        
        // Генерируем даты
        const startDate = this.randomDate(
            new Date(2024, 0, 1), 
            new Date(2024, 6, 31)
        )
        
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + this.randomInt(1, 7))
        
        return {
            name: eventName,
            description: faker.lorem.paragraph(2),
            category: this.randomFromArray(categories),
            language: this.randomFromArray(languages),
            status: this.randomFromArray(statuses),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            location: faker.address.city(),
            venue: faker.company.name() + ' ' + faker.helpers.arrayElement(['Клуб', 'Центр', 'Дом культуры', 'Кафе']),
            maxParticipants: this.randomInt(20, 200),
            registrationDeadline: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            entryFee: this.randomBoolean() ? this.randomInt(500, 5000) : 0,
            prizes: faker.lorem.sentence(),
            contactInfo: {
                email: faker.internet.email(),
                phone: faker.phone.number('+7 (9##) ###-##-##'),
                telegram: '@' + faker.internet.userName()
            },
            rules: faker.lorem.paragraphs(3),
            isPublic: this.randomBoolean(),
            eventTypeId: eventTypeId
        }
    }
    
    // Создание типов мероприятий
    async seedEventTypes() {
        this.log('📝 Создание типов мероприятий...')
        
        // Создаём несколько базовых типов
        const typesToCreate = 3
        
        for (let i = 0; i < typesToCreate; i++) {
            try {
                const eventTypeData = this.generateEventType()
                const createdEventType = await this.apiCall('post', '/event-types', eventTypeData)
                
                this.eventTypes.push(createdEventType)
                this.createdIds.add(`event-type-${createdEventType.id}`)
                this.log(`Создан тип мероприятия: "${eventTypeData.name}" (ID: ${createdEventType.id})`, 'success')
                
            } catch (error) {
                this.log(`Ошибка создания типа мероприятия: ${error.message}`, 'error')
            }
        }
    }
    
    // Создание мероприятий
    async seedEvents() {
        this.log(`📅 Создание ${this.profile.events} мероприятий...`)
        
        for (let i = 0; i < this.profile.events; i++) {
            try {
                // Выбираем случайный тип мероприятия, если есть
                const eventTypeId = this.eventTypes.length > 0 
                    ? this.randomFromArray(this.eventTypes).id 
                    : null
                
                const eventData = this.generateEvent(eventTypeId)
                const createdEvent = await this.apiCall('post', '/events', eventData)
                
                this.createdIds.add(`event-${createdEvent.id}`)
                this.log(`Создано мероприятие: "${eventData.name}" (ID: ${createdEvent.id})`, 'success')
                
                // Небольшая пауза между запросами
                await this.delay(200)
                
            } catch (error) {
                this.log(`Ошибка создания мероприятия: ${error.message}`, 'error')
            }
        }
    }
    
    // Главный метод для запуска seeding
    async seed() {
        await this.seedEventTypes()
        await this.seedEvents()
    }
    
    // Очистка созданных данных
    async clean() {
        this.log('🧹 Очистка созданных мероприятий...')
        
        try {
            // Получаем список всех мероприятий
            const events = await this.apiCall('get', '/events')
            
            if (events && events.length > 0) {
                for (const event of events) {
                    try {
                        await this.apiCall('delete', `/events/${event.id}`)
                        this.log(`Удалено мероприятие: "${event.name}" (ID: ${event.id})`, 'success')
                    } catch (error) {
                        this.log(`Ошибка удаления мероприятия ${event.id}: ${error.message}`, 'error')
                    }
                }
            }
            
            // Очистка типов мероприятий
            const eventTypes = await this.apiCall('get', '/event-types')
            
            if (eventTypes && eventTypes.length > 0) {
                for (const eventType of eventTypes) {
                    try {
                        await this.apiCall('delete', `/event-types/${eventType.id}`)
                        this.log(`Удалён тип мероприятия: "${eventType.name}" (ID: ${eventType.id})`, 'success')
                    } catch (error) {
                        this.log(`Ошибка удаления типа мероприятия ${eventType.id}: ${error.message}`, 'error')
                    }
                }
            }
            
        } catch (error) {
            this.log(`Ошибка при очистке: ${error.message}`, 'error')
        }
    }
    
    // Быстрое создание одного тестового мероприятия
    async createTestEvent() {
        this.log('🎯 Создание тестового мероприятия...')
        
        try {
            const eventData = this.generateEvent()
            const createdEvent = await this.apiCall('post', '/events', eventData)
            
            this.log(`Создано тестовое мероприятие: "${eventData.name}" (ID: ${createdEvent.id})`, 'success')
            
            return createdEvent
        } catch (error) {
            this.log(`Ошибка создания тестового мероприятия: ${error.message}`, 'error')
            throw error
        }
    }
}