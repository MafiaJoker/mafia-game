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
# Создаем новый SSH ключ
ssh-keygen -t rsa -b 4096 -C "aladdin@jokermafia.am"

# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa.pub aladdin@dev.jokermafia.am

# Копируем приватный ключ в GitHub Secrets (весь файл целиком)
cat ~/.ssh/id_rsa
```

**Важно**: При добавлении SSH_KEY в GitHub Secrets:
1. Копируйте весь файл включая заголовки (например `-----BEGIN OPENSSH PRIVATE KEY-----`)
2. Не добавляйте лишних пробелов или символов
3. Проверьте, что ключ скопирован полностью

### Проверка SSH ключа

```bash
# Проверяем что ключ существует и не пустой
ls -la ~/.ssh/id_rsa
wc -l ~/.ssh/id_rsa

# Проверяем первую строку ключа
head -n 1 ~/.ssh/id_rsa
# Должно быть что-то вроде: -----BEGIN OPENSSH PRIVATE KEY-----

# Проверяем подключение
ssh -i ~/.ssh/id_rsa aladdin@dev.jokermafia.am
```

### Структура директорий на сервере

```
/home/aladdin/frontend/          # Рабочая директория
/home/aladdin/backups/frontend/  # Бэкапы
```

### Настройка Nginx

#### Шаг 1: Создание конфигурационного файла

```bash
# Создаем конфигурацию для сайта
sudo nano /etc/nginx/sites-available/dev.jokermafia.am
```

#### Шаг 2: Конфигурация для SPA

```nginx
server {
    listen 80;
    server_name dev.jokermafia.am;
    
    root /home/aladdin/frontend;
    index index.html;
    
    # Логи
    access_log /var/log/nginx/dev.jokermafia.am.access.log;
    error_log /var/log/nginx/dev.jokermafia.am.error.log;
    
    # Для SPA - все роуты перенаправляем на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API проксирование (если нужно)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
    
    # Отключаем логирование для favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
```

#### Шаг 3: Активация конфигурации

```bash
# Создаем символическую ссылку для активации сайта
sudo ln -s /etc/nginx/sites-available/dev.jokermafia.am /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx

# Проверяем статус
sudo systemctl status nginx
```

#### Шаг 4: Настройка SSL (опционально)

```bash
# Устанавливаем Certbot для Let's Encrypt
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Получаем SSL сертификат
sudo certbot --nginx -d dev.jokermafia.am

# Автоматическое обновление сертификата
sudo crontab -e
# Добавляем строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```
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
1. Проверьте, что SSH ключ скопирован полностью в GitHub Secrets
2. Убедитесь, что включены заголовки (-----BEGIN ... PRIVATE KEY-----)
3. Не добавляйте лишних пробелов в GitHub Secrets  
4. Проверьте debug вывод в GitHub Actions для диагностики

**Ошибка 403/404**: Проверьте права доступа к файлам
```bash
chmod -R 755 /home/aladdin/frontend
```

**Ошибки API**: Убедитесь, что `VITE_API_BASE_URL` указывает на правильный адрес

**Проблемы с маршрутизацией**: Убедитесь, что Nginx настроен для SPA с `try_files`

**Ошибка 403 Forbidden**: Проблема с правами доступа к файлам:

```bash
# 1. Проверяем права доступа к файлам
ls -la /home/aladdin/frontend/

# 2. Проверяем права доступа к домашней папке
ls -la /home/aladdin/

# 3. Устанавливаем правильные права
sudo chmod 755 /home/aladdin
sudo chmod 755 /home/aladdin/frontend
sudo chmod -R 644 /home/aladdin/frontend/*
sudo chmod -R 755 /home/aladdin/frontend/*/

# 4. Проверяем под каким пользователем работает Nginx
ps aux | grep nginx

# 5. Если Nginx работает под www-data, даем доступ
sudo usermod -a -G aladdin www-data

# 6. Перезапускаем Nginx
sudo systemctl restart nginx
```

**Альтернативное решение - изменить владельца файлов**:
```bash
# Делаем www-data владельцем файлов
sudo chown -R www-data:www-data /home/aladdin/frontend/

# Или создаем общую группу
sudo groupadd webusers
sudo usermod -a -G webusers aladdin
sudo usermod -a -G webusers www-data
sudo chown -R aladdin:webusers /home/aladdin/frontend/
sudo chmod -R 755 /home/aladdin/frontend/
```

**Если проблемы с домашней папкой продолжаются**:
```bash
# Переместить файлы в стандартное место
sudo mkdir -p /var/www/dev.jokermafia.am
sudo chown -R www-data:www-data /var/www/dev.jokermafia.am

# Обновить конфигурацию Nginx
sudo nano /etc/nginx/sites-available/dev.jokermafia.am
# Изменить: root /var/www/dev.jokermafia.am;
```

**Ошибки в логах Nginx**: Смотрите логи для диагностики:
```bash
sudo tail -f /var/log/nginx/dev.jokermafia.am.error.log
sudo tail -f /var/log/nginx/dev.jokermafia.am.access.log

# Проверка конфигурации
sudo nginx -t

# Проверка статуса
sudo systemctl status nginx
```

**Альтернативный тип SSH ключа**: Если RSA не работает, попробуйте:
```bash
# Создаем ключ ed25519 (более современный)
ssh-keygen -t ed25519 -C "aladdin@jokermafia.am"

# Копируем на сервер
ssh-copy-id -i ~/.ssh/id_ed25519.pub aladdin@dev.jokermafia.am
```