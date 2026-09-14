# Immersion and close-range visual pass

Historical PR #45 notes. The current first-person body visibility, FOV, movement, story and CI are described in [mystery-tide.md](mystery-tide.md) and [mobile-e2e.md](mobile-e2e.md).

Built on main `acc0740`, including PR #43's mobile CI and PR #44's traversal/save recovery.

## Camera and companion

V, the camera button and the pause selector switch between third and first person. First-person uses a 1.68 m eye, an enclosed near plane and no follow lag. Lev's head and backpack are hidden locally; his body and boots remain visible below. Grounded head motion is small and can be disabled. Mouse pointer lock starts only from a scene click; touch and drag work without pointer lock. Unlock pauses the game. Perspective and head motion persist in the existing settings store.

Soyka now uses a detailed procedural industrial model. A 0.48 m swept sphere encloses the shell, ducts, tools and aerial. Every movement checks Rapier geometry and the same overhead envelopes used by the third-person camera. A bounded local 3D search finds routes around corners; acceleration and banking replace direct positional interpolation. Closed paths make her stop. Repositioning is reserved for load and explicit player recovery; ordinary following never teleports. This is local companion navigation, not a citywide navmesh.

Lev has an articulated, metre-scale rig with separate knees, feet and elbows; a layered jacket, harness, backpack, radio, synthetic forearm and facial detail. Static parts are merged by material within each animated joint. These remain authored procedural meshes, not scanned characters or motion-capture animation.

## World and interface

The lighthouse gains plaster panels, floor joints, pressure gauges, drawers, papers, a mug, pipe bends and task fixtures. Warehouse/maintenance facades gain masonry bases, window frames, gutters, vents and signage. The school gains a roof, clerestory glazing, exterior masonry, notice boards and radiator details; locker bodies now have collision. Offshore rock breakwaters and submerged quay foundations ground the harbor in a coastline. Bounded CPU swells add shape to the existing water normal maps.

An enterable coastal survey post on the western yard contains another optional journal discovery. Its wide doorway, walls, furniture and roof have matching physical volumes. Rain suppression and interior audio include this room. Essential lighthouse → bridge → school routes and the two existing piers remain accessible.

The HUD uses restrained amber/steel colors, SVG instruments, fine borders, a compass bearing and smaller companion controls. Portrait layouts keep the five main controls separate and at least 44 px. Dialogue and pause styles match the opening screen. Reduced-motion preferences stop the voice-meter animation.

## Dialogue sound

Web Audio produces vowel formants, voiced pitch and filtered consonant breath. Lev, Mara, Nika and Soyka have distinct pitch ranges, punctuation creates rests, and scheduling follows game time. Choice screens, replacement lines and ending stop the carrier; pause mutes it. A line queued before audio unlock is retained for the first user gesture. Voice volume is independent of effects. This imitates conversation; it does not pronounce the written dialogue. Subtitles remain the source of intelligible speech.

## Verification and limits

`npm test` covers 50 cases, including the unchanged save, jump and full bridge route regressions with the new world detail layer present. New tests exercise drone wall/door/roof clearance, smooth motion at 30/60 Hz, first-person eye placement, head-motion bounds, animated model geometry and allocation budgets, the survey-post entrance, dialogue lifecycle and V/touch input.

The mobile suite verifies saved first-person settings across reload and adds a separate trusted-touch camera toggle, portrait control bounds/non-overlap, shader-error check and voice setting check. The visual journey retains a default medium-quality boot. The separate persistence journey starts at low quality, changes to medium then low through the UI, and reloads the saved perspective/quality/head-motion settings. The original 240-second timeout remains. Push and PR Build/Mobile E2E must both complete successfully before merge. BrowserStack device runs remain manual.

Shared source PBR maps stay below 6 MiB; static detail is grouped for batching and frustum culling. No new full-scene transmission/reflection or post-processing passes are added. The large Three/Rapier bundle warning remains. Software-browser CI is functional evidence, not a mobile-device FPS measurement or an art review. Opera reported “Browser not connected”; final composition and subjective audio have not been inspected there.

Paused scenes redraw only after a settings change or resize, keeping menus responsive and avoiding repeated shadow passes for an unchanged scene. The runtime audit excludes paused/title frames from its FPS samples.
