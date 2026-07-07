# Кицунэ

## Запуск локально
Service worker требует http(s), не файл открыть напрямую. Проще всего:

```bash
cd countdown-pwa
python3 -m http.server 8080
```

Открыть `http://localhost:8080` на телефоне (в одной Wi-Fi сети — заменить localhost на IP компьютера) или на компьютере через Chrome DevTools → эмуляция Samsung A52.

## Установка на телефон
Chrome/Samsung Internet → меню → «Добавить на главный экран». После первого захода офлайн работает благодаря service worker (`sw.js`).

## Деплой
Залить папку как есть на любой статический хостинг с HTTPS (GitHub Pages, Netlify, Vercel, Cloudflare Pages) — работает без сборки, чистый HTML/CSS/JS.

## Файлы
- `index.html` — два экрана (отсчёт / настройки) + нижняя навигация
- `styles.css` — тёмная/светлая тема, портрет/ландшафт
- `app.js` — вся логика, хранение в localStorage
- `manifest.json`, `sw.js`, `icons/` — PWA-обвязка


Цвета приложения
#CCCCDB
#EDEDFF
#424247
#5F5F66
#B9B9C7
