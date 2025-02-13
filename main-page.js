// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDIMvnTxfnpDr72fIIexWcO2Jl0_fqM7tw",
  authDomain: "ever-together.firebaseapp.com",
  databaseURL: "https://ever-together-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ever-together",
  storageBucket: "ever-together.appspot.com",
  messagingSenderId: "333503123875",
  appId: "1:333503123875:web:313a63c0d9f0093f05ca16"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth();

// Проверка авторизации при загрузке страницы
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Пользователь авторизован:", user.email);
    window.currentUser = user.email;
    loadImagesFromFirebase();
    updateBackgroundGradient();
  } else {
    console.log("Пользователь не авторизован. Перенаправление на страницу входа.");
    window.location.href = "entry.html";
  }
});

// Загрузка изображений из Firebase
function loadImagesFromFirebase() {
  const imagesRef = dbRef(database, 'images');
  onValue(imagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      document.getElementById('leftColumn').innerHTML = '';
      document.getElementById('centerColumn').innerHTML = '';
      document.getElementById('rightColumn').innerHTML = '';

      Object.keys(data).forEach((key) => {
        displayImage(data[key], key);
      });

      updateBackgroundGradient();
    }
  });
}

// Отображение изображения
function displayImage(imageData, imageId) {
  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');
  img.dataset.timestamp = imageData.timestamp;
  img.dataset.views = imageData.views;
  img.dataset.id = imageId;
  img.dataset.column = imageData.column;

  img.addEventListener('click', () => openModal(img));

  const targetColumn = document.getElementById(`${imageData.column}Column`);
  if (targetColumn) {
    targetColumn.prepend(img);
  }
}

// Открытие модального окна с обновлением счетчика просмотров
function openModal(imgElement) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const imageInfo = document.getElementById('imageInfo');
  const deleteButton = document.getElementById('deleteButton');

  modal.style.display = 'block';
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id;

  const imageId = imgElement.dataset.id;
  const column = imgElement.dataset.column;
  let newViews = parseInt(imgElement.dataset.views);

  const shouldIncrementView =
    (column === 'left' && window.currentUser === 'aretren@gmail.com') ||
    (column === 'right' && window.currentUser === 'choisalery@gmail.com') ||
    (column === 'center' && (window.currentUser === 'aretren@gmail.com' || window.currentUser === 'choisalery@gmail.com'));

  if (shouldIncrementView) {
    newViews += 1;
    imgElement.dataset.views = newViews;

    const imageRef = dbRef(database, `images/${imageId}`);
    update(imageRef, { views: newViews });
  }

  imageInfo.innerHTML = `📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>👁️ Просмотров: ${newViews}`;

  // Кнопка удаления изображения
  deleteButton.onclick = () => {
    remove(dbRef(database, `images/${imageId}`)).then(() => {
      modal.style.display = 'none';
      loadImagesFromFirebase();
    });
  };
}

// Закрытие модального окна при клике вне изображения
window.onclick = (event) => {
  const modal = document.getElementById('imageModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

// Глобальный input для загрузки файлов
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// Восстановление функциональности кнопки загрузки изображений
const uploadButtons = document.querySelectorAll('.upload-buttons button');

uploadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const column = button.id.replace('upload', '').toLowerCase();
    fileInput.dataset.column = column;
    fileInput.click();
  });
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      const timestamp = new Date().toISOString();

      const newImageRef = push(dbRef(database, 'images'));
      set(newImageRef, {
        url: imageUrl,
        timestamp: timestamp,
        views: 0,
        column: fileInput.dataset.column
      });
    };
    reader.readAsDataURL(file);
  }
});

// Перетекание цвета для градиента
function updateBackgroundGradient() {
  const leftViews = getColumnViews('left');
  const centerViews = getColumnViews('center');
  const rightViews = getColumnViews('right');

  const totalViews = leftViews + centerViews + rightViews;
  const balance = totalViews ? (leftViews - rightViews) / totalViews : 0;
  const gradientPosition = 50 + (balance * 50);

  document.body.style.background = `linear-gradient(to right, #1E3A8A ${gradientPosition}%, #11182)`;
}

function getColumnViews(column) {
  const images = document.querySelectorAll(`[data-column='${column}']`);
  return Array.from(images).reduce((acc, img) => acc + parseInt(img.dataset.views), 0);
} 
