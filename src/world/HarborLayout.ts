/** Shared dimensions for visible architecture, collision and navigation. Metres, Y up. */
export const PUMP_X = -10;
export const CONTAINERS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-15, -7, 5, 2.6, 12],
  ...Array.from({ length: 7 }, (_, i) => [
    -23 + i % 3 * 5, 5 + Math.floor(i / 3) * 6, 3.4, 2.4, 4.2,
  ] as const),
];

export const HARBOR_FLOORS = [
  { name: 'port-quay', x: 0, z: 15.25, width: 70, depth: 65.5 },
  { name: 'west-pier-access', x: -43.5, z: 5, width: 17, depth: 7 },
  { name: 'west-pier', x: -50, z: -3, width: 8, depth: 23 },
  { name: 'ferry-pier-access', x: 42, z: 2, width: 14, depth: 8 },
  { name: 'ferry-pier', x: 47, z: -6, width: 8, depth: 24 },
] as const;
