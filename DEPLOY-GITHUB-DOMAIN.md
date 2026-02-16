# GitHub + Vercel + nova-forma.ru (пошагово)

## 1) Как назвать репозиторий

Рекомендованные варианты:
1. `nova-forma-mvp`
2. `aisha-nova-forma-mvp`
3. `nova-forma-app`

Лучший для старта: `nova-forma-mvp`.

## 2) Какие папки и файлы выгружать в GitHub

Выгружаем весь проект из `C:\Users\baris\web`, кроме того, что уже в `.gitignore`.

Ключевые папки:
1. `public/`
2. `src/`
3. `api/`
4. `scripts/`
5. `.github/workflows/`
6. `data/.gitkeep`

Ключевые файлы:
1. `package.json`
2. `server.js`
3. `app.js`
4. `vercel.json`
5. `.env.example`
6. `.gitignore`
7. `README.md`
8. `deep-research-report.md`

Не выгружаем:
1. `.env`, `.env.local`, любые реальные ключи
2. `.vercel/`
3. `data/db.json` (runtime файл)

## 3) Как создать и загрузить репозиторий

В терминале PowerShell:

```powershell
cd C:\Users\baris\web
git init
git add .
git commit -m "Initial MVP: core api + pwa + lemon gamification"
```

На GitHub:
1. Создайте пустой репозиторий с именем `nova-forma-mvp`.
2. Не добавляйте `README/.gitignore/license` в веб-интерфейсе (пустой репо).

Дальше в терминале:

```powershell
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/nova-forma-mvp.git
git push -u origin main
```

## 4) Подключение к Vercel

1. Зайдите в Vercel -> `Add New Project`.
2. Выберите репозиторий `nova-forma-mvp`.
3. Framework preset: `Other` (Node).
4. Build command: пусто.
5. Output directory: пусто.
6. Root directory: `/` (корень проекта).

Нужные Environment Variables (минимум):
1. `LLM_PROVIDER`
2. `DEEPSEEK_API_KEY`
3. `QWEN_API_KEY`
4. `JWT_SECRET`
5. `PAYMENT_SECRET_KEY`
6. `WEB_PUSH_PUBLIC_KEY`
7. `WEB_PUSH_PRIVATE_KEY`

Потом нажмите `Deploy`.

## 5) Подключение домена reg.ru: nova-forma.ru

### В Vercel
1. Project -> `Settings` -> `Domains`.
2. Добавьте:
   - `nova-forma.ru`
   - `www.nova-forma.ru`

### В REG.RU (DNS зона домена)
Добавьте записи:
1. `A` запись:
   - Host: `@`
   - Value: `76.76.21.21`
2. `CNAME` запись:
   - Host: `www`
   - Value: `cname.vercel-dns.com`

TTL: можно оставить стандартный (или `300` для более быстрого теста).

После применения подождите DNS propagation (обычно от 5 минут до 24 часов).

## 6) Проверка после деплоя

1. Откройте:
   - `https://nova-forma.ru`
   - `https://www.nova-forma.ru`
2. Проверьте health endpoint:
   - `https://nova-forma.ru/api/health`
3. В интерфейсе проверьте:
   - создание пользователя;
   - генерацию плана;
   - лог питания;
   - реакции "живого лимона".

## 7) Безопасность перед публикацией

1. Обязательно смените все тестовые ключи на боевые.
2. Убедитесь, что в GitHub нет секретов:

```powershell
npm run secret:scan
```

3. Включите GitHub branch protection для `main`.
4. Публикуйте изменения только через pull request.
