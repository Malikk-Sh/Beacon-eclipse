# Beacon Eclipse

Рабочий репозиторий сюжетной 3D-игры **«Пока город помнит»**.

## Концепция

Короткая атмосферная 3D-драма для мобильного браузера/PWA. Игрок исследует затопленный город, восстанавливает энергосистемы, общается с Марой и Никой и постепенно узнаёт правду о Льве Ардене и цифровых реконструкциях жителей.

## Текущий этап

В `main` находится играбельный vertical slice маршрута **маяк → порт → Склад 04 → мост → школа → архивный терминал**.

Сейчас реализованы:

- Three.js сцена, камера от третьего и первого лица; переключение V или кнопкой камеры, сохранение режима и отключаемое покачивание;
- объёмная проверка препятствий камеры, плавное возвращение после стены и одинаковое время сглаживания при разной частоте кадров;
- Rapier-физика, коллизии и kinematic character controller;
- клавиатурное и мобильное управление с virtual joystick, прыжком и контекстным действием по E;
- пространственные interaction-зоны вместо постоянных HUD-действий;
- стартовый экран на живой сцене, комната маяка с рабочим столом, журналом смены, шкафчиками и catwalk;
- открытая портовая зона: грузовой двор, западный причал с краном, паромный причал с навесом, мастерская, Склад 04 и энергостанция;
- четыре необязательные записи с сохранением в журнале паузы и подсказки направления от Сойки; открытый береговой пост с картой пеленга;
- поднимающийся/опускающийся мост с физической блокировкой до завершения развёртывания;
- физическая школа и отдельный school art layer;
- диалоговая система, варианты ответа, таймаут и осмысленное молчание;
- первый контакт с Никой и response profile;
- прощание со Складом 04 до потери питания: ответ или молчание, затем отдельное удержание выключателя; отмена сохраняет связь, Сойка оглядывается после отключения;
- сохранения на устойчивой поверхности, восстановление старых сохранений из пустоты и возврат на безопасное место при падении в воду;
- Memory Reconstruction и пространственные echo-события;
- школьная реконструкция с тёплыми физическими следами, человеческими echo-силуэтами и редкими повреждениями данных;
- школьная кульминация с молодым Львом, повреждённой фигурой девочки, реакцией Ники и вмешательством Мары без прямого раскрытия центрального твиста;
- финальный bridge/archive hook vertical slice: `IDENTITY MATCH / LEV ARDEN`, архивная дата и unresolved `…пап?` blackout;
- процедурная модель Сойки с сегментированной бронёй, оптическим блоком, роторами и манипуляторами; ограниченный поиск пути и объёмная проверка каждого перемещения через Rapier, включая визуальные перекрытия;
- модель Льва в человеческом масштабе: лицо, многослойная одежда, ремни, снаряжение, синтетическое предплечье и походка с отдельными коленями и стопами; тело видно при взгляде вниз от первого лица;
- кирпич, штукатурка и древесина с общими PBR-картами, приборы и вещи в маяке, портовые фасады, школьное остекление, береговые скалы и объёмная зыбь;
- интерфейс с тонкими инструментальными шкалами, SVG-иконками, адаптацией к портретному экрану и отдельными настройками камеры и голоса;
- имитация речи через Web Audio: разные высоты голоса, форманты, слоговый ритм и паузы. Это звуковое сопровождение субтитров, не полноценная озвучка;
- визуальная основа: PBR-фактуры бетона, металла и ткани, ACES, небо и отражения PMREM, вода с движущейся рябью, мягкие лужи, fog, ветер, дождь и молнии;
- скатная крыша склада, промышленные окна, вентиляция, рёбра контейнеров, причал и многоплановый городской горизонт с instancing;
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

Проверки сюжетных переходов, сохранений и управления:

```bash
npm test
```

Сценарий отключения склада и оставшиеся проверки на устройствах описаны в [docs/warehouse-farewell.md](docs/warehouse-farewell.md).
Текущий графический проход и ограничения проверки описаны в [docs/graphics-foundation.md](docs/graphics-foundation.md).
Изменения маршрута, начала игры и физические проверки описаны в [docs/harbor-opening.md](docs/harbor-opening.md).
Поведение камеры и границы её проверки описаны в [docs/camera-obstruction.md](docs/camera-obstruction.md).
Режим от первого лица, новые модели, Сойка и голосовые звуки описаны в [docs/immersion-pass.md](docs/immersion-pass.md).

Service worker регистрируется только в production-сборке. Для install/offline проверки нужен secure context (`https` или локальный `localhost`).

## Runtime performance audit

Для evidence-driven desktop/mobile проверки к URL игры можно добавить `?perf=1`. Overlay выключен по умолчанию и не меняет StoryState или settings.

Он показывает rolling window до 180 кадров:

- средний FPS и средний frame time;
- p95 и worst frame time;
- количество кадров длиннее 50 ms;
- viewport и device pixel ratio;
- CSS-размер и render-buffer размер canvas;
- фактический effective pixel ratio.

Для PWA/performance smoke test использовать production preview, а не `npm run dev`. Снимать показатели нужно отдельно на ключевых состояниях vertical slice, а не считать один экран доказательством производительности всего маршрута.

## Управление

- `WASD` / стрелки — движение;
- drag мышью/пальцем по сцене — камера;
- `V` / кнопка камеры — сменить вид; от первого лица клик по сцене включает осмотр мышью, `Esc` освобождает курсор и открывает паузу;
- virtual joystick — мобильное движение;
- `Пробел` / экранная кнопка «ПРЫЖОК» — прыжок с земли;
- `E` / контекстная кнопка — взаимодействие с ближайшим игровым объектом;
- «Сойка» — направление и расстояние до текущей цели;
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
