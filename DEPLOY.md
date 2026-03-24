# Deploy Bot 24/7

## Что рекомендую

Для этого проекта самый простой и надежный вариант сейчас: Railway.

Почему:
- бот работает в polling-режиме и не требует домена
- SQLite можно хранить на постоянном Volume
- не нужно вручную поднимать nginx и webhook

## Публикация на Railway пошагово

1. Создай репозиторий на GitHub и загрузи туда проект.
2. Зайди в Railway и нажми `New Project`.
3. Выбери `Deploy from GitHub repo`.
4. Подключи нужный репозиторий.
5. После импорта открой сервис и зайди в `Variables`.
6. Добавь переменные:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-4.1-mini`
   - `SUBSCRIPTION_PRICE_XTR=300`
   - `SUBSCRIPTION_PERIOD_SECONDS=2592000`
   - `SUBSCRIPTION_TITLE`
   - `SUBSCRIPTION_DESCRIPTION`
   - `PAY_SUPPORT_TEXT`
   - `TERMS_TEXT`
7. Открой `Settings` и проверь, что команда запуска `npm start`.
8. Добавь `Volume` и примонтируй его к сервису.
9. Railway автоматически передаст `RAILWAY_VOLUME_MOUNT_PATH`, а бот сам сохранит базу туда.
10. Нажми `Deploy`.
11. После успешного деплоя открой логи и убедись, что есть строка `Bot is running in polling mode`.
12. Проверь бота в Telegram командой `/start`.

## Что важно не забыть

- Без Volume история еды, веса и замеров может пропасть после redeploy.
- Одновременно должен работать только один экземпляр бота, иначе Telegram polling начнет конфликтовать.
- Если позже захочешь обновить код, достаточно сделать `git push`, Railway сам пересоберет сервис.

## Альтернатива: VPS + Docker

Если нужен полный контроль, можно запустить бота на VPS.

1. Арендуй Ubuntu VPS.
2. Установи Docker.
3. Склонируй проект на сервер.
4. Создай `.env` с токенами.
5. Запусти контейнер с постоянной папкой для базы.

Пример:

```bash
docker build -t nutrition-bot .
docker run -d \
  --name nutrition-bot \
  --restart always \
  --env-file .env \
  -e DATABASE_PATH=/data/nutrition-bot.sqlite \
  -v /opt/nutrition-bot-data:/data \
  nutrition-bot
```

## Полезные ссылки

- [Railway services](https://docs.railway.com/services)
- [Railway volumes](https://docs.railway.com/volumes/reference)
- [Render background workers](https://render.com/docs/background-workers)
- [Render persistent disks](https://render.com/docs/disks)
