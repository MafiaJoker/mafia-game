#!/bin/bash

# Скрипт для создания 10 тестовых пользователей через curl
API_BASE="http://localhost:3000/api/v1"

echo "Создание 10 тестовых пользователей..."

# Массив никнеймов
nicknames=("Игрок1" "Игрок2" "Игрок3" "Игрок4" "Игрок5" "Игрок6" "Игрок7" "Игрок8" "Игрок9" "Игрок10")

# Создание пользователей
for nickname in "${nicknames[@]}"
do
    echo "Создание пользователя: $nickname"
    curl -X POST "$API_BASE/users" \
         -H "Content-Type: application/json" \
         -H "Authorization: Basic e37bd08d" \
         -d "{\"nickname\": \"$nickname\"}" \
         -w "\nСтатус: %{http_code}\n\n"
done

echo "✅ Скрипт завершен"