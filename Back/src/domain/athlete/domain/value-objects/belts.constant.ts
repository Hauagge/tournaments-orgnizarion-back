export const BELTS = [
  'BRANCA',
  'CINZA',
  'AMARELA',
  'LARANJA',
  'VERDE',
  'AZUL',
  'ROXA',
  'MARROM',
  'PRETA',
] as const;

export type Belt = (typeof BELTS)[number];
