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
/usr/share/nginx/html/           # Рабочая директория (стандартная для Nginx)
/var/backups/dev.jokermafia.am/  # Бэкапы
/tmp/frontend-deploy/            # Временная директория для деплоя
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
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Логи
    access_log /var/log/nginx/dev.jokermafia.am.access.log;
    error_log /var/log/nginx/dev.jokermafia.am.error.log;
    
    # Для SPA - все роуты перенаправляем на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API проксирование
    location /api/ {
        proxy_pass https://api.dev.jokermafia.am;
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

# Копируем на сервер через временную директорию
rsync -avz --delete dist/ aladdin@dev.jokermafia.am:/tmp/frontend-deploy/
ssh aladdin@dev.jokermafia.am "sudo cp -r /tmp/frontend-deploy/* /usr/share/nginx/html/ && sudo chown -R www-data:www-data /usr/share/nginx/html/ && rm -rf /tmp/frontend-deploy"
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

**Ошибка MIME type "text/html" для JS файлов**: Nginx возвращает HTML вместо JS файлов:
```bash
# 1. Проверяем существование файлов
ls -la /usr/share/nginx/html/
ls -la /usr/share/nginx/html/assets/

# 2. Проверяем логи Nginx
sudo tail -f /var/log/nginx/dev.jokermafia.am.access.log
sudo tail -f /var/log/nginx/dev.jokermafia.am.error.log

# 3. Проверяем что именно возвращает сервер
curl -I https://dev.jokermafia.am/assets/index-8zlEzrEL.js

# 4. Проверяем конфигурацию Nginx
sudo nginx -t
cat /etc/nginx/sites-enabled/dev.jokermafia.am

# 5. Проверяем права доступа
sudo -u www-data ls -la /usr/share/nginx/html/assets/
```

**Возможные причины:**
1. **Файлы не существуют** - проверьте содержимое `/usr/share/nginx/html/assets/`
2. **Нет прав доступа** - Nginx не может прочитать файлы
3. **Неправильная конфигурация** - статические файлы не обрабатываются правильно
4. **Файлы не скопированы** - деплой не завершился успешно

**Быстрое решение**:
```bash
# Убедиться что файлы скопированы правильно
sudo ls -la /usr/share/nginx/html/
sudo ls -la /usr/share/nginx/html/assets/

# Установить правильные права доступа
sudo chown -R www-data:www-data /usr/share/nginx/html/
sudo chmod -R 755 /usr/share/nginx/html/

# Перезапустить Nginx
sudo systemctl restart nginx
```

**Ошибка 403 Forbidden**: Проблема с правами доступа к файлам:

```bash
# 1. Проверяем права доступа к файлам
ls -la /usr/share/nginx/html/

# 2. Проверяем под каким пользователем работает Nginx
ps aux | grep nginx

# 3. Устанавливаем правильные права
sudo chown -R www-data:www-data /usr/share/nginx/html/
sudo chmod -R 755 /usr/share/nginx/html/

# 4. Перезапускаем Nginx
sudo systemctl restart nginx
```

**Настройка стандартного пути** (используется по умолчанию):
```bash
# Стандартная директория Nginx уже настроена
# Файлы деплоятся в /usr/share/nginx/html/
# Права доступа автоматически устанавливаются в workflow
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