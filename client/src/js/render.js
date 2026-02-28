import { getContacts, deleteContact, updateContact } from './contacts.js';
import Bear from '../images/bear.png';
import Dog from '../images/dog.png';

const AVATAR_MAP = { Bear, Dog };

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createCardHTML(contact) {
  const avatarSrc = AVATAR_MAP[contact.avatar] || AVATAR_MAP['Bear'];
  const safeName  = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safePhone = escapeHtml(contact.phone);

  return `
    <div class="card contact-card shadow mb-5 bg-body rounded" data-id="${contact.id}">
      <div class="card-avatar-wrapper">
        <img class="contact-avatar" src="${avatarSrc}" alt="${safeName} avatar">
      </div>
      <div class="card-header">
        <h5 class="card-name">${safeName}</h5>
      </div>
      <div class="card-body">
        <p class="card-text"><strong>Email:</strong> ${safeEmail || '<em class="text-muted">None</em>'}</p>
        <p class="card-text"><strong>Phone:</strong> ${safePhone || '<em class="text-muted">None</em>'}</p>
        <button type="button" class="btn btn-dark btn-sm btn-edit" data-id="${contact.id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm btn-delete" data-id="${contact.id}">Delete</button>
      </div>
    </div>
  `;
}

function createEditCardHTML(contact) {
  const avatarBearSelected = contact.avatar === 'Bear' ? 'checked' : '';
  const avatarDogSelected  = contact.avatar === 'Dog'  ? 'checked' : '';
  const bearSrc = AVATAR_MAP['Bear'];
  const dogSrc  = AVATAR_MAP['Dog'];

  return `
    <div class="card contact-card contact-card--editing shadow mb-5 bg-body rounded" data-id="${contact.id}">
      <div class="card-avatar-wrapper">
        <img class="contact-avatar" src="${contact.avatar === 'Dog' ? dogSrc : bearSrc}" alt="avatar" id="editAvatarPreview_${contact.id}">
      </div>
      <div class="card-body">
        <div class="mb-2">
          <label class="form-label fw-bold">Name</label>
          <input type="text" class="form-control form-control-sm edit-name" value="${escapeHtml(contact.name)}" placeholder="Name">
          <div class="invalid-feedback">Name is required.</div>
        </div>
        <div class="mb-2">
          <label class="form-label fw-bold">Email</label>
          <input type="email" class="form-control form-control-sm edit-email" value="${escapeHtml(contact.email)}" placeholder="Email">
        </div>
        <div class="mb-2">
          <label class="form-label fw-bold">Phone</label>
          <input type="tel" class="form-control form-control-sm edit-phone" value="${escapeHtml(contact.phone)}" placeholder="Phone">
        </div>
        <div class="mb-2 d-flex gap-3">
          <div class="form-check">
            <input class="form-check-input edit-avatar-radio" type="radio" name="editAvatar_${contact.id}" value="Bear" id="editBear_${contact.id}" ${avatarBearSelected}>
            <label class="form-check-label" for="editBear_${contact.id}">
              <img src="${bearSrc}" alt="Bear" width="40" height="40">
            </label>
          </div>
          <div class="form-check">
            <input class="form-check-input edit-avatar-radio" type="radio" name="editAvatar_${contact.id}" value="Dog" id="editDog_${contact.id}" ${avatarDogSelected}>
            <label class="form-check-label" for="editDog_${contact.id}">
              <img src="${dogSrc}" alt="Dog" width="40" height="40">
            </label>
          </div>
        </div>
        <button type="button" class="btn btn-dark btn-sm btn-save" data-id="${contact.id}">Save</button>
        <button type="button" class="btn btn-secondary btn-sm btn-cancel" data-id="${contact.id}">Cancel</button>
      </div>
    </div>
  `;
}

/**
 * Renders all contacts into #card-gallery.
 */
export function renderContacts() {
  const gallery = document.getElementById('card-gallery');
  if (!gallery) return;

  const contacts = getContacts();

  if (contacts.length === 0) {
    gallery.innerHTML = '<p class="no-contacts-message">No contacts yet. Click "CREATE NEW CONTACT" to add one.</p>';
    return;
  }

  gallery.innerHTML = contacts.map(createCardHTML).join('');

  gallery.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });

  gallery.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', handleEdit);
  });
}

function handleDelete(event) {
  const { id } = event.currentTarget.dataset;
  deleteContact(id);
  renderContacts();
}

function handleEdit(event) {
  const { id } = event.currentTarget.dataset;
  const contacts = getContacts();
  const contact = contacts.find(c => c.id === id);
  if (!contact) return;

  const cardEl = document.querySelector(`[data-id="${id}"]`);
  if (!cardEl) return;

  cardEl.outerHTML = createEditCardHTML(contact);

  // Re-query since outerHTML replacement removes the element from the DOM
  const editCard = document.querySelector(`.contact-card--editing[data-id="${id}"]`);

  // Live avatar preview when radio changes
  editCard.querySelectorAll('.edit-avatar-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      const preview = editCard.querySelector(`#editAvatarPreview_${id}`);
      if (preview) preview.src = AVATAR_MAP[radio.value] || AVATAR_MAP['Bear'];
    });
  });

  editCard.querySelector('.btn-save').addEventListener('click', () => handleSave(id, editCard));
  editCard.querySelector('.btn-cancel').addEventListener('click', renderContacts);
}

function handleSave(id, editCard) {
  const nameInput = editCard.querySelector('.edit-name');
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.classList.add('is-invalid');
    return;
  }
  nameInput.classList.remove('is-invalid');

  const email  = editCard.querySelector('.edit-email').value.trim();
  const phone  = editCard.querySelector('.edit-phone').value.trim();
  const avatarRadio = editCard.querySelector('.edit-avatar-radio:checked');
  const avatar = avatarRadio ? avatarRadio.value : 'Bear';

  updateContact(id, { name, email, phone, avatar });
  renderContacts();
}
