# Как выложить сайт в интернет (для доступа друзей)

Сайт можно разместить на **Render.com** (бесплатный тариф). Данные хранятся в **GitHub** — полностью бесплатно, без карты. После деплоя всё работает по одному адресу: интерфейс, API, портреты.

---

## 1. Репозиторий на GitHub

- По желанию: в `public/` положите `img2.jpg` для фона на странице входа (если нет — тёмный фон).
1. Создайте репозиторий на [github.com](https://github.com).
2. В корне проекта `dnd-site` выполните:

```bash
cd dnd-site
git init
git add .
git commit -m "DnD site"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

(Подставьте свой логин и имя репозитория.)

---

## 2. GitHub: токен и хранилище базы

Чтобы данные не пропадали при пересборке, база хранится в репозитории через GitHub API.

1. **Personal Access Token (PAT):** [github.com](https://github.com) → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Право **`repo`**. Сохраните токен — он показывается один раз.
2. Запомните формат репозитория: `логин/имя-репо` (например `ivanov/dnd-campaign`). Эти значения понадобятся в Render.

Файл `data/db.json` создаётся в репозитории при первой записи. Портреты хранятся в нём в base64.

**Ограничения:** при большом числе портретов файл растёт; для десятка персонажей — нормально. Лимит файла в GitHub — 100 МБ.

---

## 3. Деплой на Render

1. [render.com](https://render.com) → войдите через GitHub.
2. **Dashboard** → **New** → **Web Service**.
3. Подключите репозиторий → **Connect**.
4. Настройки:

| Поле | Значение |
|------|----------|
| **Name** | например `dnd-campaign` |
| **Region** | ближайший (например Frankfurt) |
| **Root Directory** | пусто |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build && cd server && npm install` |
| **Start Command** | `cd server && node index.js` |

5. **Environment** — добавьте:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | длинная случайная строка (например: `openssl rand -hex 32`) |
| `GITHUB_TOKEN` | ваш PAT из раздела 2 |
| `GITHUB_REPO` | `логин/имя-репозитория` (тот же репо или любой с правом `repo` у токена) |

6. **Create Web Service**.

После сборки появится URL вида `https://dnd-campaign-xxxx.onrender.com`.

---

## 4. Как заново развернуть проект

Если нужно развернуть с нуля (новый сервис на Render, другой репо, переустановка):

### 4.1. Репозиторий

- Код должен быть в GitHub. Если репо уже есть — просто делайте `git push` при изменениях.
- Для **нового** репо: создайте репозиторий, в папке `dnd-site` выполните `git remote set-url origin https://github.com/НОВЫЙ_ЛОГИН/НОВЫЙ_РЕПО.git`, затем `git push -u origin main`.

### 4.2. Render: новый Web Service

1. **Dashboard** → **New** → **Web Service**.
2. Подключите нужный репозиторий.
3. Настройки — как в разделе 3 (Build Command, Start Command, Root Directory пусто).
4. **Environment:** обязательно `JWT_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`. Без `GITHUB_TOKEN` и `GITHUB_REPO` данные будут в файлах и при пересборке пропадут.
5. **Create Web Service**.

### 4.3. Render: обновление существующего сервиса

- **Деплой из кода:** после `git push` в подключённый репо Render сам пересобирает и перезапускает сервис. Данные в `data/db.json` в GitHub сохраняются.
- **Ручной пересборка:** в карточке сервиса → **Manual Deploy** → **Deploy latest commit**.
- **Смена переменных:** **Environment** → измените `GITHUB_TOKEN` или `GITHUB_REPO` → **Save Changes**. Сервис перезапустится; если `GITHUB_REPO` указывает на тот же репо с `data/db.json`, данные подхватятся.

### 4.4. Важно при смене репо

Если `GITHUB_REPO` меняете на **другой** репозиторий, в нём изначально нет `data/db.json`. При первом логине создастся пустая база. Чтобы перенести старые данные, нужно вручную добавить в новый репо файл `data/db.json` с содержимым из старого (скопировать через веб-интерфейс GitHub или `git`).

---

## 5. Что сказать друзьям

- Адрес: `https://ВАШ-СЕРВИС.onrender.com`
- Логин и пароль — создаёте в админке. Первый вход: `admin` / `6852` (пароль лучше сменить).

---

## 6. Ограничения бесплатного тарифа Render

- **«Засыпание»:** после ~15 минут без обращений следующий запрос может идти 30–60 секунд.
- **Данные:** при заданных `GITHUB_TOKEN` и `GITHUB_REPO` база и портреты в GitHub и **не пропадают** при пересборке. Без них — только файлы на диске Render, при перезапуске обнуляются.
- **Трафик:** лимиты есть; для небольшой компании обычно хватает.

---

## 7. Смена пароля admin и безопасность

1. Войти как `admin` / `6852`.
2. В админке создать нового пользователя с надёжным паролем.
3. При желании завести отдельного админа и удалить `admin` вручную в `data/db.json` (в GitHub) или не использовать.

В production обязательно задать `JWT_SECRET` в Environment.

---

## 8. Как это устроено

- **Build:** `npm run build` (Vite → `dist/`), `cd server && npm install`.
- **Start:** `node server/index.js`. При `GITHUB_TOKEN` и `GITHUB_REPO` — чтение/запись в `data/db.json` в репо; иначе — `server/data/db.json` и `server/uploads/` (на Render при пересборке теряются).
- Фронт отдаётся из `dist/`; SPA-маршруты — `index.html`; `/api` и `/uploads` — backend.

Локально: `npm run dev` (фронт) и `node server/index.js` (бэк). С GitHub — нужен доступ к api.github.com.
