const paths = {
  pause: '<path d="M8 5v14M16 5v14"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  jump: '<path d="M5 17v3h14v-3M12 17V4m-5 5 5-5 5 5"/>',
  signal: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4m11.4-11.4a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17m17-17a12 12 0 0 1 0 17"/>',
  rain: '<path d="M5 14a4 4 0 0 1 1-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 1 9M7 17l-1 3m6-3-1 3m6-3-1 3"/>',
  power: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  compass: '<path d="m16 8-3 5-5 3 3-5z"/><circle cx="12" cy="12" r="10"/>',
  save: '<path d="M5 3h12l3 3v15H4V3zM8 3v6h8V3M8 21v-8h8v8"/>',
} as const;

export function icon(name: keyof typeof paths): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
