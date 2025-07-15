# Deployment Guide

## GitHub Actions Deployment

Этот проект настроен для автоматического деплоя на `dev.jokermafia.am` через GitHub Actions.

### Настройка GitHub Secrets

В настройках репозитория GitHub добавьте следующий secret:

1. **SSH_KEY** - приватный SSH ключ для подключения к серверу

### Настройка Environment Variables

Основные настройки вынесены в environment variables в файле workflow:

- **DEPLOY_HOST**: `dev.jokermafia.am`
- **DEPLOY_USER**: `aladdin`
- **DEPLOY_PORT**: `22`

Эти значения можно изменить прямо в файле `.github/workflows/deploy.yml`

### Генерация SSH ключа

```bash
# Создаем новый SSH ключ в формате PEM (важно для GitHub Actions)
ssh-keygen -t rsa -b 4096 -m PEM -C "aladdin@jokermafia.am"

# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa.pub aladdin@dev.jokermafia.am

# Копируем приватный ключ в GitHub Secrets (весь файл целиком)
cat ~/.ssh/id_rsa
```

**Важно**: При добавлении SSH_KEY в GitHub Secrets:
1. Копируйте весь файл включая заголовки `-----BEGIN RSA PRIVATE KEY-----` и `-----END RSA PRIVATE KEY-----`
2. Не добавляйте лишних пробелов или символов
3. Убедитесь, что ключ создан в формате PEM (`-m PEM`)

### Проверка SSH ключа

```bash
# Проверяем что ключ в правильном формате
head -n 1 ~/.ssh/id_rsa
# Должно быть: -----BEGIN RSA PRIVATE KEY-----

# Проверяем подключение
ssh -i ~/.ssh/id_rsa aladdin@dev.jokermafia.am
```

### Структура директорий на сервере

```
/home/aladdin/frontend/          # Рабочая директория
/home/aladdin/backups/frontend/  # Бэкапы
```

### Настройка Nginx

Пример конфигурации Nginx для SPA:

```nginx
server {
    listen 80;
    server_name dev.jokermafia.am;
    
    root /home/aladdin/frontend;
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
rsync -avz --delete dist/ aladdin@dev.jokermafia.am:/home/aladdin/frontend/
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

**Ошибка "ssh: no key found"**: 
1. Убедитесь, что SSH ключ создан в формате PEM (`ssh-keygen -m PEM`)
2. Проверьте, что ключ начинается с `-----BEGIN RSA PRIVATE KEY-----`
3. Копируйте весь ключ включая заголовки
4. Не добавляйте лишних пробелов в GitHub Secrets

**Ошибка 403/404**: Проверьте права доступа к файлам
```bash
chmod -R 755 /home/aladdin/frontend
```

**Ошибки API**: Убедитесь, что `VITE_API_BASE_URL` указывает на правильный адрес

**Проблемы с маршрутизацией**: Убедитесь, что Nginx настроен для SPA с `try_files`

**Альтернативный формат SSH ключа**: Если PEM не работает, попробуйте:
```bash
# Создаем ключ в формате OpenSSH
ssh-keygen -t ed25519 -C "aladdin@jokermafia.am"

# Конвертируем в PEM если нужно
ssh-keygen -p -m PEM -f ~/.ssh/id_ed25519
```