// Импорт необходимых функций из Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";
import { getDatabase, ref as dbRef, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

// Конфигурация Firebase
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
const storage = getStorage(app);
const database = getDatabase(app);

// Элементы интерфейса
const uploadLeft = document.getElementById('uploadLeft');
const uploadCenter = document.getElementById('uploadCenter');
const uploadRight = document.getElementById('uploadRight');
const fileInput = document.getElementById('fileInput');

const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const imageInfo = document.getElementById('imageInfo');
const closeModal = document.querySelector('.close');

// Загрузка изображений из Firebase при старте
loadImagesFromFirebase();

// Слушатели событий для загрузки
uploadLeft.addEventListener('click', () => triggerUpload('left'));
uploadCenter.addEventListener('click', () => triggerUpload('center'));
uploadRight.addEventListener('click', () => triggerUpload('right'));

// Открытие диалога выбора файла
function triggerUpload(column) {
  fileInput.dataset.column = column;
  fileInput.click();
}

// Обработка загрузки файла
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const column = fileInput.dataset.column;
    const timestamp = new Date().toISOString();

    const storageReference = storageRef(storage, `images/${Date.now()}-${file.name}`);

    uploadBytes(storageReference, file).then((snapshot) => {
      return getDownloadURL(snapshot.ref);
    }).then((downloadURL) => {
      const imageData = {
        url: downloadURL,
        timestamp: timestamp,
        views: 0,
        column: column
      };

      const newImageRef = push(dbRef(database, 'images'));
      set(newImageRef, imageData);

      displayImage(imageData, newImageRef.key);
    }).catch((error) => {
      console.error("Ошибка при загрузке изображения:", error);
    });
  }
  fileInput.value = ''; // Сброс выбора файла
});

// Загрузка изображений из Firebase
function loadImagesFromFirebase() {
  const imagesRef = dbRef(database, 'images');
  onValue(imagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      [leftColumn, centerColumn, rightColumn].forEach(col => col.innerHTML = '');
      Object.keys(data).forEach((key) => {
        displayImage(data[key], key);
      });
    }
  });
}

// Отображение изображения на странице
function displayImage(imageData, imageId) {
  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');
  img.dataset.timestamp = imageData.timestamp;
  img.dataset.views = imageData.views;
  img.dataset.id = imageId;

  img.addEventListener('click', () => openModal(img));

  const targetColumn = imageData.column === 'left' ? leftColumn :
                       imageData.column === 'center' ? centerColumn : rightColumn;

  targetColumn.prepend(img);
}

// Открытие модального окна
function openModal(imgElement) {
  modal.style.display = 'block';
  modalImage.src = imgElement.src;

  const imageId = imgElement.dataset.id;
  const newViews = parseInt(imgElement.dataset.views) + 1;
  imgElement.dataset.views = newViews;

  const imageRef = dbRef(database, `images/${imageId}`);
  update(imageRef, { views: newViews });

  imageInfo.innerHTML = `
    📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>
    👁️ Просмотров: ${newViews}
  `;
}

// Закрытие модального окна
closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});
