# Deployment Guide

## GitHub Actions Deployment

Этот проект настроен для автоматического деплоя на `dev.jokermafia.am` через GitHub Actions.

### Настройка GitHub Secrets

В настройках репозитория GitHub добавьте следующие secrets:

1. **HOST** - IP адрес или домен сервера (например: `dev.jokermafia.am`)
2. **USERNAME** - имя пользователя для SSH (например: `deploy`)
3. **SSH_KEY** - приватный SSH ключ для подключения к серверу
4. **PORT** - порт SSH (по умолчанию 22, можно не указывать)

### Генерация SSH ключа

```bash
# Создаем новый SSH ключ
ssh-keygen -t rsa -b 4096 -C "deploy@jokermafia.am"

# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@dev.jokermafia.am

# Копируем приватный ключ в GitHub Secrets
cat ~/.ssh/id_rsa
```

### Структура директорий на сервере

```
/var/www/html/mafia-frontend/    # Рабочая директория
/var/backups/mafia-frontend/     # Бэкапы
```

### Настройка Nginx

Пример конфигурации Nginx для SPA:

```nginx
server {
    listen 80;
    server_name dev.jokermafia.am;
    
    root /var/www/html/mafia-frontend;
    index index.html;
    
    # Для SPA - все роуты перенаправляем на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
    
    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Деплой

Деплой происходит автоматически при:
- Push в ветку `master`
- Ручном запуске через GitHub Actions

### Ручной деплой

```bash
# Клонируем репозиторий
git clone https://github.com/MafiaJoker/mafia-game.git
cd mafia-game

# Устанавливаем зависимости
npm install

# Собираем для production
npm run build

# Копируем на сервер
rsync -avz --delete dist/ deploy@dev.jokermafia.am:/var/www/html/mafia-frontend/
```

### Environment Variables

- **Development**: `.env.development`
- **Production**: `.env.production`

Основные переменные:
- `VITE_API_BASE_URL` - URL API сервера
- `VITE_TELEGRAM_BOT_USERNAME` - имя Telegram бота
- `VITE_SHOW_TEST_LOGIN` - показывать ли кнопку тестового входа

### Проверка деплоя

После деплоя проверьте:
1. Открывается ли сайт: https://dev.jokermafia.am
2. Работает ли авторизация через Telegram
3. Не отображается ли кнопка тестового пользователя
4. Корректно ли работают API запросы

### Troubleshooting

**Ошибка 403/404**: Проверьте права доступа к файлам
```bash
sudo chown -R www-data:www-data /var/www/html/mafia-frontend
sudo chmod -R 755 /var/www/html/mafia-frontend
```

**Ошибки API**: Убедитесь, что `VITE_API_BASE_URL` указывает на правильный адрес

**Проблемы с маршрутизацией**: Убедитесь, что Nginx настроен для SPA с `try_files`