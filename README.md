# Beacon Eclipse

Рабочий репозиторий сюжетной 3D-игры **«Пока город помнит»**.

## Концепция

Короткая атмосферная 3D-драма для мобильного браузера/PWA. Игрок исследует затопленный город, восстанавливает энергосистемы, общается с Марой и Никой и постепенно узнаёт правду о Льве Ардене и цифровых реконструкциях жителей.

## Текущий этап

В `main` находится играбельный vertical slice маршрута **маяк → порт → Склад 04 → мост → школа → архивный терминал**.

Сейчас реализованы:

- Three.js сцена и камера от третьего лица;
- Rapier-физика, коллизии и kinematic character controller;
- клавиатурное и мобильное управление с virtual joystick;
- пространственные interaction-зоны вместо постоянных HUD-действий;
- маяк, техническая стартовая зона и catwalk;
- дождливый порт, Склад 04, энергостанция и насосная инфраструктура;
- поднимающийся/опускающийся мост с физической блокировкой до завершения развёртывания;
- физическая школа и отдельный school art layer;
- диалоговая система, варианты ответа, таймаут и осмысленное молчание;
- первый контакт с Никой и response profile;
- сохранения сюжетного состояния и восстановление прогресса;
- Memory Reconstruction и пространственные echo-события;
- школьная реконструкция с тёплыми физическими следами, человеческими echo-силуэтами и редкими повреждениями данных;
- школьная кульминация с молодым Львом, повреждённой фигурой девочки, реакцией Ники и вмешательством Мары без прямого раскрытия центрального твиста;
- финальный bridge/archive hook vertical slice: `IDENTITY MATCH / LEV ARDEN`, архивная дата и unresolved `…пап?` blackout;
- hero-модель Сойки с runtime GLTF asset pipeline и процедурным fallback;
- более читаемый инженерный силуэт Льва с лёгкой procedural gait-анимацией;
- визуальная основа: ACES tone mapping, экспозиция, холодный свет, fog, wet-material language, ветер, дождь и молнии;
- environmental audio foundation без постоянной музыки: дождь, ветер, гром, металл, radio static, вода, электрический гул, моторы Сойки, шаги и school room ambience/reverb;
- pause/settings menu, fullscreen toggle, Low / Medium / High quality presets и live SFX volume;
- dependency-free PWA packaging: manifest, install icons, production-only service worker registration и offline app shell;
- GitHub Actions CI для feature-веток, PR и `main`.

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

Production preview:

```bash
npm run preview
```

Service worker регистрируется только в production-сборке. Для install/offline проверки нужен secure context (`https` или локальный `localhost`).

## Управление

- `WASD` / стрелки — движение;
- drag мышью/пальцем по сцене — камера;
- virtual joystick — мобильное движение;
- контекстная кнопка — взаимодействие с ближайшим игровым объектом;
- «Сойка» — сигнал дрону;
- `Esc` / кнопка паузы — пауза и настройки;
- `1`–`3` — выбор реплики, когда варианты доступны.

## Архитектура визуального слоя

Детализация мира постепенно вынесена из монолитного blockout-кода:

```text
src/world/
├─ AssetManager.ts
├─ LightingRig.ts
├─ MaterialLibrary.ts
├─ VisualFoundation.ts
├─ WeatherSystem.ts
├─ WorldDressing.ts
└─ areas/
   ├─ LighthouseArea.ts
   ├─ PortArea.ts
   ├─ BridgeArea.ts
   └─ SchoolArea.ts
```

Gameplay/physics остаются отделены от art-pass геометрии настолько, насколько это возможно без большого переписывания vertical slice.

## Аудио

`AudioSystem` использует Web Audio API и создаёт граф только после пользовательского жеста. Текущий слой включает weather ambience, spatial Warehouse radio, позиционный motor Сойки, power hum, footsteps, bridge creaks и короткий school reverb. Игра намеренно не опирается на постоянный музыкальный score.

## PWA

В production доступны:

- `manifest.webmanifest`;
- SVG + PNG install icons 192/512;
- production-only service worker;
- network-first navigation;
- stale-while-revalidate для same-origin static/game assets;
- offline fallback на последний сохранённый app shell.

Save/settings остаются отдельными `localStorage`-данными и не зависят от service worker cache.

## Ближайшие задачи

1. Провести полноценный visual/readability/performance pass в desktop и mid-range mobile runtime на ключевых состояниях: порт OFF/ON, Склад 04, насосы, мост, школа, реконструкция и archive hook.
2. Проверить PWA install/update/offline lifecycle в реальном production-origin, включая повторный запуск после обновления service worker.
3. Полировать hero props и окружение там, где blockout всё ещё заметен: energy distributor, Nika radio, bridge drive и отдельные school/port детали.
4. После стабилизации vertical slice переходить к следующим сюжетным зонам из narrative plan: House 18, tunnel, Central Archive и dam — без превращения проекта в open world/action game.
5. Продолжать держать mobile budget: ~30 FPS target на mid-range устройстве, ограниченные динамические lights/shadows, material reuse, instancing и отсутствие дорогих real-time reflections.

## Визуальное направление

**Настоящее:** холодный deep navy / steel blue / blue-gray, мокрый металл и бетон, cyan storm light, редкие amber/orange emergency lights и muted red indicators.

**Память:** amber, peach, warm cream и gold, но не «идеальный рай» — реконструкции должны сохранять пропуски данных, редкие сбои и ощущение неполной человеческой памяти.

## Workflow

Feature-код не пишется напрямую в `main`:

```text
feature/**
→ зелёный push CI
→ PR в main
→ зелёный PR CI
→ повторная проверка PR/head/base/mergeability
→ squash merge
```
