import './styles.css';
import { avatars, DEFAULT_AVATAR_ID, getInitials, getInitialsColor } from './modules/avatars.js';
import { createId, loadContacts, normalizeContact, persistContacts } from './modules/storage.js';
import { buildVCard, downloadVCard, parseVCards } from './modules/vcard.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+.-]{7,}$/;
const STATUS_CLEAR_DELAY = 4000;

const state = {
  contacts: loadContacts(),
  editingId: null,
  query: '',
  sort: 'name',
};

const elements = {};
let statusTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  renderAvatarOptions();
  bindEvents();
  resetForm();
  render();
  registerServiceWorker();
});

function cacheElements() {
  elements.form = document.querySelector('#contact-form');
  elements.formHeading = document.querySelector('#form-heading');
  elements.submitButton = document.querySelector('#submit-button');
  elements.cancelEditButton = document.querySelector('#cancel-edit-button');
  elements.newContactButton = document.querySelector('#new-contact-button');
  elements.emptyNewContactButton = document.querySelector('#empty-new-contact-button');
  elements.contactList = document.querySelector('#contact-list');
  elements.emptyState = document.querySelector('#empty-state');
  elements.emptyStateTitle = elements.emptyState.querySelector('h3');
  elements.emptyStateBody = elements.emptyState.querySelector('p');
  elements.searchInput = document.querySelector('#search-input');
  elements.sortSelect = document.querySelector('#sort-select');
  elements.contactSummary = document.querySelector('#contact-summary');
  elements.statusMessage = document.querySelector('#status-message');
  elements.avatarOptions = document.querySelector('#avatar-options');
  elements.importButton = document.querySelector('#import-button');
  elements.importInput = document.querySelector('#import-input');
}

function bindEvents() {
  elements.form.addEventListener('submit', handleSubmit);
  elements.form.addEventListener('input', () => {
    const { valid } = validateForm({ showErrors: true });
    elements.submitButton.disabled = !valid;
  });

  elements.form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.editingId) {
      resetForm();
      setStatus('Edit canceled.');
    }
  });

  elements.contactList.addEventListener('click', handleCardAction);
  elements.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.sortSelect.addEventListener('change', (event) => {
    state.sort = event.target.value;
    render();
  });

  elements.newContactButton.addEventListener('click', startNewContact);
  elements.emptyNewContactButton.addEventListener('click', startNewContact);
  elements.cancelEditButton.addEventListener('click', () => {
    resetForm();
    setStatus('Edit canceled.');
  });

  elements.importButton.addEventListener('click', () => elements.importInput.click());
  elements.importInput.addEventListener('change', handleImport);
}

function renderAvatarOptions() {
  clearChildren(elements.avatarOptions);

  Object.entries(avatars).forEach(([id, avatar], index) => {
    const label = document.createElement('label');
    label.className = 'avatar-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'avatar';
    input.value = id;
    input.checked = index === 0;

    const swatch = document.createElement('span');
    swatch.append(buildAvatarPreview(avatar, id));

    const caption = document.createElement('em');
    caption.textContent = avatar.label;
    swatch.append(caption);

    label.append(input, swatch);
    elements.avatarOptions.append(label);
  });
}

function buildAvatarPreview(avatar, id) {
  if (avatar.kind === 'initials') {
    const preview = document.createElement('span');
    preview.className = 'avatar-preview avatar-preview--initials';
    preview.style.background = getInitialsColor(id);
    preview.textContent = 'AB';
    preview.setAttribute('aria-hidden', 'true');
    return preview;
  }

  const img = document.createElement('img');
  img.src = avatar.src;
  img.alt = '';
  img.width = 56;
  img.height = 56;
  img.className = 'avatar-preview';
  return img;
}

function handleSubmit(event) {
  event.preventDefault();

  const { valid, data, errors } = validateForm({ showErrors: true });
  elements.submitButton.disabled = !valid;

  if (!valid) {
    focusFirstInvalidField(errors);
    return;
  }

  if (state.editingId) {
    state.contacts = state.contacts.map((contact) =>
      contact.id === state.editingId
        ? {
            ...contact,
            ...data,
            updatedAt: new Date().toISOString(),
          }
        : contact,
    );
    persist();
    render();
    resetForm();
    setStatus('Contact updated.');
    return;
  }

  state.contacts = [
    {
      id: createId(),
      ...data,
      createdAt: new Date().toISOString(),
    },
    ...state.contacts,
  ];
  persist();
  render();
  resetForm();
  setStatus('Contact saved.');
}

function handleCardAction(event) {
  const button = event.target.closest('button[data-action]');

  if (!button) {
    return;
  }

  const contact = state.contacts.find((item) => item.id === button.dataset.id);

  if (!contact) {
    return;
  }

  if (button.dataset.action === 'edit') {
    startEdit(contact);
    return;
  }

  if (button.dataset.action === 'delete') {
    deleteContact(contact);
    return;
  }

  if (button.dataset.action === 'export') {
    downloadVCard(contact);
    setStatus(`Exported ${contact.name}.vcf.`);
  }
}

function handleImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';

  if (files.length === 0) {
    return;
  }

  Promise.all(files.map((file) => file.text()))
    .then((texts) => {
      const parsed = texts.flatMap((text) => parseVCards(text));

      if (parsed.length === 0) {
        setStatus('No contacts found in the selected file.');
        return;
      }

      const imported = parsed
        .map((card) =>
          normalizeContact({
            ...card,
            id: createId(),
            avatar: DEFAULT_AVATAR_ID,
            createdAt: new Date().toISOString(),
          }),
        )
        .filter(Boolean);

      state.contacts = [...imported, ...state.contacts];
      persist();
      render();
      setStatus(`Imported ${imported.length} contact${imported.length === 1 ? '' : 's'}.`);
    })
    .catch(() => setStatus('Could not read that file. Make sure it is a valid .vcf export.'));
}

function startNewContact() {
  resetForm();
  elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  elements.form.elements.name.focus();
}

function startEdit(contact) {
  state.editingId = contact.id;
  elements.formHeading.textContent = 'Edit contact';
  elements.submitButton.textContent = 'Save changes';
  elements.cancelEditButton.hidden = false;

  elements.form.elements.name.value = contact.name;
  elements.form.elements.title.value = contact.title;
  elements.form.elements.email.value = contact.email;
  elements.form.elements.phone.value = contact.phone;
  elements.form.elements.notes.value = contact.notes;
  elements.form.elements.avatar.value = contact.avatar;

  const { valid } = validateForm({ showErrors: false });
  elements.submitButton.disabled = !valid;
  clearErrors();
  elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  elements.form.elements.name.focus();
}

function deleteContact(contact) {
  const confirmed = window.confirm(`Delete ${contact.name}?`);

  if (!confirmed) {
    return;
  }

  state.contacts = state.contacts.filter((item) => item.id !== contact.id);

  if (state.editingId === contact.id) {
    resetForm();
  }

  persist();
  render();
  setStatus('Contact deleted.');
}

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.formHeading.textContent = 'Add a contact';
  elements.submitButton.textContent = 'Save contact';
  elements.submitButton.disabled = true;
  elements.cancelEditButton.hidden = true;
  clearErrors();

  const firstAvatar = elements.form.querySelector('input[name="avatar"]');

  if (firstAvatar) {
    firstAvatar.checked = true;
  }
}

function render() {
  const contacts = getVisibleContacts();
  elements.contactSummary.textContent = getSummaryText(contacts.length);

  clearChildren(elements.contactList);
  contacts.forEach((contact) => elements.contactList.append(buildContactCard(contact)));

  const hasContacts = state.contacts.length > 0;
  const hasMatches = contacts.length > 0;
  elements.emptyState.hidden = hasContacts && hasMatches;

  if (!hasContacts) {
    elements.emptyStateTitle.textContent = 'No contacts yet';
    elements.emptyStateBody.textContent =
      'Add your first card to build a lightweight local directory.';
    return;
  }

  if (!hasMatches) {
    elements.emptyStateTitle.textContent = 'No matches found';
    elements.emptyStateBody.textContent =
      'Try a different name, email, title, or phone number.';
  }
}

function buildContactCard(contact) {
  const card = document.createElement('article');
  card.className = 'contact-card';

  const topline = document.createElement('div');
  topline.className = 'contact-card__topline';
  topline.append(buildCardAvatar(contact));

  const heading = document.createElement('div');
  heading.className = 'contact-card__heading';

  const name = document.createElement('h3');
  name.textContent = contact.name;

  const role = document.createElement('p');
  role.textContent = contact.title || 'Contact';

  heading.append(name, role);
  topline.append(heading);
  card.append(topline);

  const details = document.createElement('dl');
  details.className = 'contact-card__details';
  details.append(
    buildDetailRow('Email', contact.email, `mailto:${contact.email}`),
    buildDetailRow('Phone', contact.phone, `tel:${normalizePhone(contact.phone)}`),
  );
  card.append(details);

  const notes = document.createElement('p');
  notes.textContent = contact.notes || 'No notes added.';
  notes.className = contact.notes
    ? 'contact-card__notes'
    : 'contact-card__notes contact-card__notes--empty';
  card.append(notes);

  const actions = document.createElement('div');
  actions.className = 'contact-card__actions';
  actions.append(
    buildActionButton('edit', contact.id, 'Edit', `Edit ${contact.name}`),
    buildActionButton('export', contact.id, 'vCard', `Export ${contact.name} as vCard`),
    buildActionButton('delete', contact.id, 'Delete', `Delete ${contact.name}`, 'button--danger'),
  );
  card.append(actions);

  return card;
}

function buildCardAvatar(contact) {
  const avatar = avatars[contact.avatar] ?? avatars[DEFAULT_AVATAR_ID];

  if (avatar.kind === 'initials') {
    const preview = document.createElement('span');
    preview.className = 'contact-card__avatar contact-card__avatar--initials';
    preview.style.background = getInitialsColor(contact.id);
    preview.textContent = getInitials(contact.name);
    preview.setAttribute('aria-hidden', 'true');
    return preview;
  }

  const img = document.createElement('img');
  img.className = 'contact-card__avatar';
  img.src = avatar.src;
  img.alt = '';
  img.width = 64;
  img.height = 64;
  return img;
}

function buildDetailRow(label, value, href) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');

  if (value) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = value;
    dd.append(link);
  } else {
    dd.textContent = '—';
  }

  row.append(dt, dd);
  return row;
}

function buildActionButton(action, id, text, ariaLabel, extraClass) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button button--small button--secondary ${extraClass ?? ''}`.trim();
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = text;
  button.setAttribute('aria-label', ariaLabel);
  return button;
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function getVisibleContacts() {
  const filtered = getFilteredContacts();
  return sortContacts(filtered, state.sort);
}

function getFilteredContacts() {
  if (!state.query) {
    return state.contacts;
  }

  return state.contacts.filter((contact) => {
    const searchable = [contact.name, contact.title, contact.email, contact.phone, contact.notes]
      .join(' ')
      .toLowerCase();

    return searchable.includes(state.query);
  });
}

function sortContacts(contacts, sort) {
  const sorted = [...contacts];

  if (sort === 'newest') {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sorted;
}

function validateForm({ showErrors }) {
  const data = getFormData();
  const errors = {};

  if (data.name.length < 2) {
    errors.name = 'Enter at least 2 characters.';
  }

  if (!EMAIL_PATTERN.test(data.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!PHONE_PATTERN.test(data.phone)) {
    errors.phone = 'Use at least 7 digits and phone-safe characters.';
  }

  if (showErrors) {
    renderErrors(errors);
  }

  return {
    data,
    errors,
    valid: Object.keys(errors).length === 0,
  };
}

function getFormData() {
  const formData = new FormData(elements.form);

  return {
    name: String(formData.get('name') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    avatar: String(formData.get('avatar') ?? DEFAULT_AVATAR_ID),
    notes: String(formData.get('notes') ?? '').trim(),
  };
}

function renderErrors(errors) {
  ['name', 'email', 'phone'].forEach((fieldName) => {
    const input = elements.form.elements[fieldName];
    const errorElement = document.querySelector(`#${fieldName}-error`);
    const message = errors[fieldName] ?? '';

    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    input.setAttribute('aria-describedby', `${fieldName}-error`);
    errorElement.textContent = message;
  });
}

function clearErrors() {
  renderErrors({});
}

function focusFirstInvalidField(errors) {
  const [fieldName] = Object.keys(errors);
  elements.form.elements[fieldName]?.focus();
}

function getSummaryText(visibleCount) {
  const totalCount = state.contacts.length;
  const totalLabel = totalCount === 1 ? 'contact' : 'contacts';

  if (state.query) {
    return `${visibleCount} of ${totalCount} ${totalLabel} shown`;
  }

  return `${totalCount} saved ${totalLabel}`;
}

function persist() {
  const ok = persistContacts(state.contacts);

  if (!ok) {
    setStatus('Saved for this session only. Browser storage is unavailable.');
  }
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function setStatus(message) {
  elements.statusMessage.textContent = message;

  if (statusTimer) {
    clearTimeout(statusTimer);
  }

  statusTimer = setTimeout(() => {
    elements.statusMessage.textContent = '';
  }, STATUS_CLEAR_DELAY);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      setStatus('Offline mode could not be started.');
    });
  });
}

// Re-export for potential reuse/testing of vCard building without a DOM.
export { buildVCard };
