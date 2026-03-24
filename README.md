# Nutriciolog Platform

Telegram-бот и веб-кабинет для питания, прогресса и AI-разбора еды на одной общей базе данных.

## Что внутри

- Telegram-бот для фото еды, текстовых приемов пищи, вопросов по питанию, веса и замеров
- Веб-кабинет с общим профилем, дневником, прогрессом и журналами
- Общий слой данных через `app/database.js`
- Общий AI-слой через `app/services/nutrition.js`
- Единая SQLite-база, которую используют и бот, и сайт

## Архитектура

```text
Telegram Bot ----\
                  -> shared services -> SQLite / Railway Volume
Web Cabinet -----/
```

- `app/index.js` поднимает сразу два интерфейса: Telegram-бота и веб-сервер
- `app/webServer.js` отдает API и статические файлы кабинета
- `web/` содержит фронтенд личного кабинета
- `app/database.js` хранит профиль, еду, вес, замеры и прогресс
- `app/services/nutrition.js` инкапсулирует OpenAI-интеграцию

## Локальный запуск

```bash
npm install
npm start
```

После старта:

- бот работает в Telegram
- веб-кабинет доступен на `http://localhost:3000`

## Следующий шаг продукта

- вход через Telegram Login вместо ручного ID
- вынос API в отдельный backend
- миграция с SQLite на Postgres при росте нагрузки
