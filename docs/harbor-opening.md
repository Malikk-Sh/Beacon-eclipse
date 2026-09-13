# Harbor route and opening

The previous route had a 0.5 m gap between the pump room and warehouse, smaller than Lev's capsule. The bridge deck was 0.55 m high with no ramp. The old quay also extended underneath most of the bridge, then stopped abruptly. Autosaves wrote the current player position even while falling. School entry used a large sphere without requiring contact with the school floor.

## Traversal and saves

- Container placements are shared by rendering and physics. The pump room is now west of a clear central approach. A physical 3 m ramp reaches the bridge deck without jumping.
- The quay ends at the channel. Every accessible pier extension has a matching visible floor and collider. Bridge rails and perimeter rails have collision; the raised gate remains locked until deployment finishes.
- Space and the touch jump button trigger a grounded jump. Gravity, upward ceiling contact, landing pose and landing audio are handled explicitly. Held keys cannot create repeated air jumps. Motion and footstep audio use actual displacement and grounded contact.
- `TraversalSafety` checks five support rays and capsule clearance before recording a stable checkpoint. Story saves, autosaves, pause and page exit all use that checkpoint.
- Water/fall recovery teleports the player to the supported checkpoint and resets velocity, input and camera lag. A recovery action is also available in pause.
- Legacy saves with invalid coordinates, missing floor support or intersecting machinery recover at a story-appropriate checkpoint. Narrative choices, energy, response profile and school progress are preserved. This intentionally does not roll back a possibly legitimate school visit.
- School arrival requires the deployed bridge, grounded contact, a narrow height band around the real 0.45 m floor, and the entrance footprint. Other interactions and school echoes also require a grounded player at their surface height.

## First minutes and open harbor

The opening screen renders over the actual scene and starts dialogue timing only after entering the game. Existing saves can continue or deliberately start a new game. The lighthouse contains a warm workbench, readable watch log, service lockers, pipework and a ceiling. An exit sign introduces the port, and a short location cue plays on first reaching the quay.

Two connected, explorable piers extend the first zone beyond the former 70 m quay width: a western receiver/crane pier and an eastern ferry shelter/skiff pier. The yard has a workshop, cargo stacks, railings, route paint, mooring details and an optional pallet to practice jumping. The essential route remains walkable without a jump. Three optional discoveries persist in the pause journal. Soyka gives the bearing and distance to the current story destination.

Ambient rain and room reverb crossfade at the lighthouse door and school. Rain follows the player through the larger district and resets above the lighthouse, ferry shelter and school roofs. Metal and concrete footsteps differ. A distant spatial harbor horn, moving beacon light and wind-driven pennants support the port atmosphere. These are procedural assets and synthesized sounds, not photorealistic production assets or recorded voice acting.

## Verification

`npm test` passes 40 tests, including 11 new tests using the actual Rapier world and character controller:

- lighthouse → distributor approach → ramp → bridge → school → return, without jumps;
- gate collision while raised, including a jump attempt;
- jump height, no air jump, landing and optional pallet;
- both piers, ferry shelter, return and warehouse access;
- void recovery, save during a jump, legacy bad saves and physically invalid spawns;
- grounded school trigger and keyboard/touch input reset.

`npm run build` passes. The existing large bundle warning remains (Three.js and Rapier). Device FPS, final screen composition, touch ergonomics and subjective audio quality require a live browser check. Opera Connector reported that its browser was not connected; no browser visual verification is claimed.

The feature was rebased onto main `55d295a3f4658b670a7a88bbecb162539ae6405e`, including PR #43's mobile Playwright and manual BrowserStack coverage. Mobile smoke now enters the title screen before checking controls, verifies the jump button, and includes a browser regression for a legacy void save and the pause recovery action. Both Build and Mobile E2E workflows must finish successfully on push and PR before squash merge. BrowserStack real-device runs remain manual.

Visual boot, two-boot settings persistence, and orientation/trusted touch run in independent mobile contexts, with the original 240-second timeout unchanged. Step timings are written to CI logs. Review captures use CSS resolution and the title capture is not repeated on reload. This keeps software-WebGL capture/boot cost from consuming the settings or orientation budget while preserving every assertion from PR #43.
