# Aisha Cross-Platform MVP (Test Launch)

Тестовый проект для запуска MVP по заданию: единое backend-ядро + Web/PWA + геймификация + базовая монетизация.

## Что уже реализовано

1. Core API:
- онбординг пользователя;
- генерация плана питания (через `LLM Gateway` с провайдерами `deepseek|qwen`);
- лог приема пищи и расчет streak/points/achievements;
- смена подписки (`free|trial|premium`);
- получение текущего прогресса и событий.
2. Web/PWA:
- интерфейс онбординга, генерации плана и логирования;
- блок "живой лимон" (статичный аватар, реплики по streak, milestone-видео);
- service worker и manifest.
3. Безопасность:
- `.env.example`;
- `.gitignore` для `.env*` и `.vercel`;
- `secret-scan` скрипт.
4. Проверки:
- smoke-test (`scripts/smoke-test.js`);
- CI workflow (`.github/workflows/ci.yml`).
5. Vercel:
- `vercel.json` + `api/index.js`.

## Быстрый старт (локально)

1. Убедитесь, что установлен Node.js 22+.
2. Запуск:

```bash
npm run start
```

3. Откройте:

```text
http://localhost:3000
```

## Проверка проекта

```bash
npm run secret:scan
npm run test
npm run check
```

## Настройка переменных окружения

Используйте значения из `.env.example`.

Ключевые переменные:
- `LLM_PROVIDER` (`deepseek` или `qwen`)
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `JWT_SECRET`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `PAYMENT_SECRET_KEY`

## Деплой в Vercel

1. Подключите репозиторий к Vercel.
2. Добавьте env-переменные в `Preview` и `Production`.
3. Выполните deploy.

Подробный пошаговый гайд по GitHub + Vercel + домену `web-alchemy.ru`:
- `DEPLOY-GITHUB-DOMAIN.md`

## API (кратко)

1. `GET /api/health`
2. `GET /api/config`
3. `GET /api/events?limit=20`
4. `POST /api/users/onboard`
5. `POST /api/plans/generate`
6. `POST /api/meals/log`
7. `POST /api/subscriptions/set`
8. `GET /api/progress/:userId`
