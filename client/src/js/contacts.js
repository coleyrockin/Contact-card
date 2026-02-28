const STORAGE_KEY = 'contacts';

/**
 * Returns all contacts from localStorage as an array.
 */
export function getContacts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

/**
 * Creates a new contact and persists it.
 * @param {{ name: string, email: string, phone: string, avatar: string }} data
 */
export function createContact(data) {
  const contacts = getContacts();
  const contact = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    avatar: data.avatar || 'Bear',
  };
  contacts.push(contact);
  saveContacts(contacts);
  return contact;
}

/**
 * Deletes a contact by id.
 * @param {string} id
 */
export function deleteContact(id) {
  const contacts = getContacts().filter(c => c.id !== id);
  saveContacts(contacts);
  return contacts;
}

/**
 * Updates a contact by id with the given fields.
 * @param {string} id
 * @param {{ name?: string, email?: string, phone?: string, avatar?: string }} updates
 */
export function updateContact(id, updates) {
  const contacts = getContacts();
  const index = contacts.findIndex(c => c.id === id);
  if (index === -1) return null;
  const trimmed = {};
  for (const [key, val] of Object.entries(updates)) {
    trimmed[key] = typeof val === 'string' ? val.trim() : val;
  }
  contacts[index] = { ...contacts[index], ...trimmed };
  saveContacts(contacts);
  return contacts[index];
}
