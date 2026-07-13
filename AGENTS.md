# Кицунэ — техническая информация

## Запуск локально

Service worker требует http(s), открытие файла напрямую не работает.

```bash
cd countdown-pwa
python3 -m http.server 8080
```

Открыть `http://localhost:8080` и эмулировать мобильное устройство (Chrome DevTools → Samsung A52) либо открыть на телефоне в одной Wi-Fi сети.

## Сборка и деплой

Залить папку на статический хостинг с HTTPS (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Сборка не требуется — чистый HTML/CSS/JS.

### GitHub Actions

Деплой на GitHub Pages через `.github/workflows/deploy.yml`. При каждом пуше:

1. Инжектится `__CACHE_VERSION__` (git hash) в `sw.js` и `app.js`
2. Инжектится `__APP_VERSION__` (формат `1.<количество коммитов>`) в `index.html`

## Файлы

| Файл | Назначение |
|---|---|
| `index.html` | Три экрана (о приложении / отсчёт / настройки) + нижняя навигация |
| `styles.css` | Тёмная тема, портрет/ландшафт, десктоп |
| `app.js` | Вся логика: таймер, навигация, свайпы, Firebase, localStorage |
| `sw.js` | Service worker: кэширование + фоновые уведомления |
| `manifest.json` | PWA-манифест |
| `icons/` | Иконки 192/512 |

## Цвета

- `#424247` — фон (--bg)
- `#5F5F66` — поверхность (--surface)
- `#B9B9C7` — трек, приглушённый текст (--track, --text-dim)
- `#CCCCDB` — акцент
- `#EDEDFF` — основной текст (--text)
