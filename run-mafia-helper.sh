#!/bin/bash
# Скрипт для запуска Mafia Game Helper AppImage

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APPIMAGE="$SCRIPT_DIR/dist-electron/Mafia Game Helper-1.0.0.AppImage"

if [ -f "$APPIMAGE" ]; then
    echo "Запуск Mafia Game Helper..."
    "$APPIMAGE" --no-sandbox "$@"
else
    echo "Ошибка: AppImage не найден!"
    echo "Сначала выполните: npm run electron:build:linux"
    exit 1
fi