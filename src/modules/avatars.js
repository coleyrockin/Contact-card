// Avatar catalog and initials-avatar helpers.

export const avatars = {
  bear: {
    label: 'Bear',
    kind: 'image',
    src: '/images/bear.png',
  },
  dog: {
    label: 'Dog',
    kind: 'image',
    src: '/images/dog.png',
  },
  initials: {
    label: 'Initials',
    kind: 'initials',
  },
};

export const DEFAULT_AVATAR_ID = 'bear';

const INITIAL_PALETTE = [
  '#24453f',
  '#d56b4d',
  '#5b6ee1',
  '#2f9e77',
  '#a3492f',
  '#7a5cc7',
];

export function isValidAvatarId(id) {
  return Boolean(avatars[id]);
}

export function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getInitialsColor(seed) {
  let hash = 0;

  for (const char of String(seed)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return INITIAL_PALETTE[hash % INITIAL_PALETTE.length];
}
