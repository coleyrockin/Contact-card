// LocalStorage persistence for the contact list.

import { DEFAULT_AVATAR_ID, isValidAvatarId } from './avatars.js';

const STORAGE_KEY = 'contact-card.contacts.v1';

const sampleContacts = [
  {
    id: 'sample-avery-stone',
    name: 'Avery Stone',
    title: 'Event Producer',
    email: 'avery@example.com',
    phone: '(555) 014-2384',
    avatar: 'bear',
    notes: 'Prefers quick follow-ups after planning calls.',
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'sample-riley-parker',
    name: 'Riley Parker',
    title: 'Frontend Engineer',
    email: 'riley@example.com',
    phone: '(555) 019-7442',
    avatar: 'dog',
    notes: 'Ask about the design system migration.',
    createdAt: '2026-01-02T12:00:00.000Z',
  },
  {
    id: 'sample-jordan-lee',
    name: 'Jordan Lee',
    title: 'Product Designer',
    email: 'jordan@example.com',
    phone: '(555) 088-6120',
    avatar: 'initials',
    notes: '',
    createdAt: '2026-01-03T12:00:00.000Z',
  },
];

export function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadContacts() {
  try {
    const storedContacts = localStorage.getItem(STORAGE_KEY);

    if (!storedContacts) {
      return sampleContacts;
    }

    const parsedContacts = JSON.parse(storedContacts);

    if (!Array.isArray(parsedContacts)) {
      return sampleContacts;
    }

    return parsedContacts.map(normalizeContact).filter(Boolean);
  } catch {
    return sampleContacts;
  }
}

export function persistContacts(contacts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    return true;
  } catch {
    return false;
  }
}

export function normalizeContact(contact) {
  if (!contact || typeof contact !== 'object') {
    return null;
  }

  const name = String(contact.name || '').trim();

  if (!name) {
    return null;
  }

  return {
    id: String(contact.id || createId()),
    name,
    title: String(contact.title || '').trim(),
    email: String(contact.email || '').trim(),
    phone: String(contact.phone || '').trim(),
    avatar: isValidAvatarId(contact.avatar) ? contact.avatar : DEFAULT_AVATAR_ID,
    notes: String(contact.notes || '').trim(),
    createdAt: String(contact.createdAt || new Date().toISOString()),
    updatedAt: contact.updatedAt ? String(contact.updatedAt) : undefined,
  };
}
