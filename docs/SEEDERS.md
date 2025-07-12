# Система создания тестовых данных (Seeders)

Эта документация описывает систему seeders для создания тестовых данных в Mafia Game Helper.

## 🚀 Быстрый старт

### Командная строка

```bash
# Быстрое создание минимального набора данных
npm run seed:quick

# Создание всех типов данных (минимальный профиль)
npm run seed:all

# Создание с полным профилем
npm run seed:all:full

# Очистка всех данных
npm run seed:clean
```

### Веб-интерфейс

В режиме разработки доступна панель разработчика (правый верхний угол), которая позволяет:
- Создавать данные одним кликом
- Выбирать профили создания
- Отслеживать статистику
- Просматривать логи операций

## 📁 Структура файлов

```
src/
├── config/
│   └── seedConfig.js          # Конфигурация профилей и настроек
├── utils/seeders/
│   ├── BaseSeeder.js          # Базовый класс для всех seeders
│   ├── EventSeeder.js         # Создание мероприятий
│   ├── GameSeeder.js          # Создание игр
│   ├── UserSeeder.js          # Создание пользователей
│   └── index.js               # Главный файл с экспортами
├── components/dev/
│   └── DevToolsPanel.vue      # Панель разработчика
└── scripts/
    └── seed.js                # CLI скрипт для запуска
```

## 🎛️ Профили создания

### Minimal (по умолчанию)
- 2 мероприятия
- 1 игра на мероприятие
- 5 пользователей

### Full
- 5 мероприятий
- 3 игры на мероприятие
- 20 пользователей

### Stress
- 20 мероприятий
- 10 игр на мероприятие
- 100 пользователей

## 📋 Доступные команды

### Полные наборы
```bash
npm run seed:all           # Все данные (minimal)
npm run seed:all:full      # Все данные (full)
npm run seed:all:stress    # Все данные (stress)
```

### Отдельные типы
```bash
npm run seed:events        # Только мероприятия
npm run seed:games         # Только игры
npm run seed:users         # Только пользователи
```

### Утилиты
```bash
npm run seed:quick         # Быстрое создание
npm run seed:clean         # Очистка всех данных
npm run seed               # Показать справку
```

## 🔧 Программное использование

### Импорт seeders

```javascript
import { 
  EventSeeder, 
  GameSeeder, 
  UserSeeder,
  seedAll,
  cleanAll,
  quickSeed
} from '@/utils/seeders/index.js'
```

### Создание отдельных типов данных

```javascript
// Создание мероприятий
const eventSeeder = new EventSeeder('full')
await eventSeeder.safeRun('seed')

// Создание одного тестового мероприятия
const event = await eventSeeder.createTestEvent()

// Очистка мероприятий
await eventSeeder.safeRun('clean')
```

### Полное создание/очистка

```javascript
// Создание всех данных
const result = await seedAll('full')
console.log(result.totalSuccess, result.totalErrors)

// Быстрое создание минимального набора
const quickResult = await quickSeed()

// Полная очистка
await cleanAll()
```

## 📊 Создаваемые данные

### Мероприятия (Events)
- Реалистичные названия турниров
- Различные категории (funky, minicap, tournament, charity_tournament)
- Случайные даты проведения
- Контактная информация и описания

### Игры (Games)
- Связаны с существующими мероприятиями
- Различные статусы (not_started, in_progress, finished)
- 10 игроков на игру с реалистичными никнеймами
- Состояния игр с ролями и прогрессом

### Пользователи (Users)
- Русские имена и фамилии
- Различные роли (player, judge, admin)
- Статистика игр и рейтинги
- Настройки профилей и достижения

## ⚙️ Конфигурация

Основные настройки находятся в `src/config/seedConfig.js`:

```javascript
export const SEED_PROFILES = {
  minimal: {
    events: 2,
    gamesPerEvent: 1,
    users: 5
  }
  // ... другие профили
}

export const SEED_CONFIG = {
  defaultProfile: 'minimal',
  // ... настройки данных
}
```

## 🛠️ Создание собственных seeders

### Базовый пример

```javascript
import { BaseSeeder } from './BaseSeeder.js'

export class MySeeder extends BaseSeeder {
  constructor(profile = 'minimal') {
    super()
    this.profile = getProfileConfig(profile)
  }

  async seed() {
    this.log('Начинаем создание...', 'info')
    
    try {
      const data = await this.apiCall('post', '/my-endpoint', myData)
      this.createdIds.add(`my-${data.id}`)
      this.log('Создано успешно', 'success')
    } catch (error) {
      this.log(`Ошибка: ${error.message}`, 'error')
    }
  }

  async clean() {
    // Логика очистки
  }
}
```

## 🔍 Отладка и логирование

Каждый seeder автоматически ведёт логи операций:
- ✅ Успешные операции
- ❌ Ошибки с деталями
- ⚠️ Предупреждения
- ℹ️ Информационные сообщения

Логи отображаются в консоли и в панели разработчика.

## 🚨 Важные замечания

1. **Проверка API**: Seeders автоматически проверяют доступность API перед выполнением
2. **Ретраи**: Встроенная система повторных попыток при сбоях
3. **Безопасность**: Системные пользователи защищены от удаления
4. **Производительность**: Паузы между запросами для предотвращения перегрузки API

## 🆘 Устранение проблем

### API недоступно
```bash
# Проверить статус API
curl https://dev.api.jokermafia.am/api/v1/healthz
```

### Ошибки аутентификации
Убедитесь, что API настроен на приём запросов без аутентификации в dev-режиме.

### Слишком много запросов
Увеличьте паузы в конфигурации или используйте профиль 'minimal'.

## 📈 Мониторинг

В панели разработчика доступна статистика:
- Количество созданных объектов каждого типа
- Статус API соединения
- История последних операций

Для обновления статистики используйте кнопку "Обновить" или перезагрузите страницу.