export interface Palette {
  name: string;
  background: string;
  fog: string;
  skyTop: string;
  skyBottom: string;
  core: string;
  coreHot: string;
  field: string;
  accent: string;
  ground: string;
  uiAccent: string;
}

export const PALETTES: Palette[] = [
  {
    name: 'Ember Garden',
    background: '#06100e',
    fog: '#06100e',
    skyTop: '#020706',
    skyBottom: '#0a1d19',
    core: '#e39a72',
    coreHot: '#ffd2a8',
    field: '#8fe3cf',
    accent: '#9fbe8b',
    ground: '#2b6b5c',
    uiAccent: '#e39a72',
  },
  {
    name: 'Deep Kelp',
    background: '#05100f',
    fog: '#05100f',
    skyTop: '#020807',
    skyBottom: '#0a201c',
    core: '#d8b46a',
    coreHot: '#ffe3a1',
    field: '#7fd1b9',
    accent: '#7a9e8a',
    ground: '#245c50',
    uiAccent: '#d8b46a',
  },
  {
    name: 'Night Orchard',
    background: '#0a0d10',
    fog: '#0a0d10',
    skyTop: '#050608',
    skyBottom: '#15151d',
    core: '#e7a58b',
    coreHot: '#ffd0bb',
    field: '#b7d8a0',
    accent: '#c9a7d8',
    ground: '#4a3b5e',
    uiAccent: '#c9a7d8',
  },
  {
    name: 'Copper Bloom',
    background: '#100b08',
    fog: '#100b08',
    skyTop: '#070403',
    skyBottom: '#1d120c',
    core: '#e08a5f',
    coreHot: '#ffc08f',
    field: '#e3c78f',
    accent: '#a8c98a',
    ground: '#5e3b2a',
    uiAccent: '#e08a5f',
  },
  {
    name: 'Tide Memory',
    background: '#061012',
    fog: '#061012',
    skyTop: '#020708',
    skyBottom: '#0a2024',
    core: '#d99a8a',
    coreHot: '#ffd0c2',
    field: '#86c7d8',
    accent: '#b5a7d8',
    ground: '#2a5a68',
    uiAccent: '#86c7d8',
  },
  {
    name: 'Ash & Moss',
    background: '#0b0f0c',
    fog: '#0b0f0c',
    skyTop: '#040605',
    skyBottom: '#141a15',
    core: '#cfa27a',
    coreHot: '#f4d7b0',
    field: '#a9c99a',
    accent: '#d8c8a8',
    ground: '#3c4b36',
    uiAccent: '#a9c99a',
  },
];

export function paletteFor(index: number): Palette {
  return PALETTES[((index % PALETTES.length) + PALETTES.length) % PALETTES.length];
}
