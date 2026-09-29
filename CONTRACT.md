# CONTRACT — архитектурный контракт PlainFile

Это единственный документ, который нужно прочитать агенту для разработки
нового инструмента. Он описывает: что такое «платформа», куда кладётся код
инструмента, как инструмент регистрируется и какие правила неизменны.

## 1. Платформа (ЗАМОРОЖЕНА, read-only)

Следующие файлы — платформа. Не изменять, не перемещать, не импортировать
из них что-либо кроме задокументированного API. Любое изменение платформы —
только по явному запросу владельца в текущей задаче.

| Путь | Что это | API для инструментов |
|---|---|---|
| `src/components/Layout.tsx` | Шапка, футер, cookie-баннер | `<Layout>{children}</Layout>` |
| `src/components/SEO.tsx` | title/description/canonical/OG/JSON-LD | `<SEO title description path noSuffix? jsonLd? />` |
| `src/components/LogoMark.tsx` | Логотип | — |
| `src/components/CookieConsent.tsx` | Баннер согласия | — (монтируется в Layout) |
| `src/components/ui/` | shadcn/ui: Button, Input, Label, Checkbox, Dialog, Badge, Progress, ... | импорт `@/components/ui/<name>` |
| `src/lib/utils.ts` | `cn()` | `import { cn } from "@/lib/utils"` |
| `src/lib/faq.ts` | Тип `FAQItem`, общие FAQ | `import type { FAQItem } from "@/lib/faq"` |
| `src/lib/analytics.ts`, `analytics2.ts` | GA с consent | не трогать |
| `src/App.tsx`, `src/main.tsx`, `src/index.css` | Оболочка, роутинг, стили | — |
| `src/routes-manifest.ts` | Единый манифест страниц | см. §3 |
| `scripts/generate-sitemap.mjs`, `scripts/prerender.js` | SEO-генерация из манифеста | — |
| `src/pages/` | Только статические страницы: `Home`, `Tools`, `Privacy`, `guides/` | — |

Из манифеста инструменты получают роутинг, каталог на `/tools`, навигацию,
sitemap и prerender автоматически. **Эти файлы не существуют для задачи
«сделай инструмент» — их не нужно читать и править.**

## 2. Анатомия инструмента

Каждый инструмент — самодостаточная папка `src/tools/<id>/`. Правило:
всё, что использует только этот инструмент, живёт в его папке. Примеры
существующих инструментов: `src/tools/redact/`, `src/tools/fill/`,
`src/tools/heic/`.

Типовой состав (файлы создавать по необходимости):

```
src/tools/<id>/
├── <PascalCase>.tsx   # страница инструмента: <Layout> + <SEO> + инструмент
├── <Tool>.tsx         # основной React-компонент инструмента
├── engine.ts          # типы и чистая логика (без React)
├── worker.ts          # Web Worker для тяжёлой обработки (см. §4)
├── scenarios.ts       # данные SEO-сценариев (контент, не компоненты)
├── pages/             # тонкие обёртки сценариев, по одной на URL
│   └── <Scenario>.tsx
└── (прочее, нужное только этому инструменту)
```

Зависимости между инструментами допустимы, но должны быть явными и
зафиксированными здесь. На сегодня:

- `tools/fill` → `tools/redact/engine` (типы MuPDF) и `tools/redact/worker`
  (санитизация/флэттен PDF перед заполнением).

Новую межинструментную зависимость сначала добавьте в этот список.

## 3. Регистрация: одна строка в манифесте

Инструмент регистрируется **только** записью в `src/routes-manifest.ts`:
lazy-импорт в шапке файла + один объект в `ROUTES` с `kind: 'tool'`.
Каталог (`/tools`), навигация, футер, sitemap и prerender обновляются сами.

```ts
const MyTool = lazy(() => import('./tools/my/MyToolPage'));
// ...
{
  path: '/my', label: 'My Tool', kind: 'tool',
  priority: 0.9, changefreq: 'weekly', element: MyTool,
  description: 'One-line pitch for the catalog card.',
  icon: MyIcon,                    // из lucide-react
  status: 'ready',                 // 'ready' | 'beta' | 'planned'
  navLabel: 'My Tool',             // опционально: пункт в шапке
  footerLabel: 'My Tool',          // опционально: пункт в футере
}
```

Ограничения манифеста (он исполняется в Node через tsx): **без JSX,
без алиасов `@/` — только относительные импорты, без vite-плагинов**.

SEO-сценарии (`kind: 'scenario'`) и гайды (`kind: 'guide'`) добавляются
так же; сценарии инструмента описываются данными в его `scenarios.ts`
и рендерятся его общим компонентом сценария (паттерн `tools/redact/RedactScenario.tsx`).

**Бэклинки проставляются вручную** в контенте страниц — в манифесте они
не регистрируются.

## 4. Обязательные правила инструмента

Это неприкосновенные правила проекта (core-УТП):

1. **Ноль сетевых вызовов с содержимым файлов.** Никаких fetch/XHR/Beacon/
   WebSocket, отправляющих байты файлов. Индикатор «0 bytes uploaded»
   должен соответствовать реальности.
2. **Вся тяжёлая обработка — в Web Worker**, созданном так:
   `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`.
   UI не фризится; прогресс и отмена обязательны.
3. **Честные лимиты** (по образцу 50 МБ / ~200 страниц) с понятным
   сообщением, без мёртвых состояний.
4. **WASM/тяжёлые библиотеки — lazy**: страница импортируется через
   `lazy()` в манифесте, тяжёлые зависимости грузятся в воркере.
5. Обработка файлов с потенциально чувствительными данными (PDF, изображения)
   после `Apply`/экспорта проходит **санитизацию**: очистка метаданных,
   удаление аннотаций/embedded files/JS/outline, полная пересборка
   (`garbage=4`), не инкрементальный save (образец — `tools/redact/worker.ts`).
6. Минимальный tap-target на мобильных — 44×44 px. Иконки — `lucide-react`.
7. Код на английском (идентификаторы, комментарии); пользовательский UI и
   SEO-контент — на английском.

## 5. Проверка перед сдачей

```bash
cd app
npm run lint
npm run build
# инструменты с verify-гейтом:
npm run verify          # redact
npm run verify:forms    # fill
npm run verify:heic     # heic
```

Новый инструмент, работающий с файлами, должен получить свой
`verify-<id>.mjs` по образцу существующих.

## 6. Скрифолдер

```bash
node scripts/new-tool.mjs <id> --title "My Tool" --path /my \
  --description "One-line pitch." --icon FileText [--nav "My Tool"] [--footer "My Tool"]
```

Создаёт `src/tools/<id>/` со страницей-заглушкой и вставляет запись
в манифест. Дальше наполняйте папку по §2.
