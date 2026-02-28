import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/index.css';

import Logo from '../images/logo.png';
import Bear from '../images/bear.png';
import Dog from '../images/dog.png';

import { initForm } from './form.js';
import { renderContacts } from './render.js';

window.addEventListener('load', function () {
  document.getElementById('logo').src = Logo;
  document.getElementById('bearThumbnail').src = Bear;
  document.getElementById('dogThumbnail').src = Dog;

  initForm();
  renderContacts();
});
