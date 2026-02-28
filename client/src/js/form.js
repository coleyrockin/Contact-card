import { createContact } from './contacts.js';
import { renderContacts } from './render.js';

function toggleForm() {
  document.getElementById('formToggle').classList.toggle('form--hidden');
}

function resetForm() {
  document.getElementById('contact-form').reset();
}

function handleSubmit(event) {
  event.preventDefault();

  const nameInput = document.getElementById('name');
  const name  = nameInput.value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const avatarRadio = document.querySelector('input[name="avatarRadio"]:checked');
  const avatar = avatarRadio ? avatarRadio.value : 'Bear';

  if (!name) {
    nameInput.classList.add('is-invalid');
    return;
  }
  nameInput.classList.remove('is-invalid');

  createContact({ name, email, phone, avatar });
  renderContacts();
  resetForm();
  toggleForm();
}

/**
 * Attaches all form event listeners. Called once from index.js on load.
 */
export function initForm() {
  document.getElementById('new-contact').addEventListener('click', toggleForm);
  document.getElementById('contact-form').addEventListener('submit', handleSubmit);
  document.getElementById('name').addEventListener('input', () => {
    document.getElementById('name').classList.remove('is-invalid');
  });
}
