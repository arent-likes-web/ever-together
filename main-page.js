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
    loadImagesFromFirebase();
  } else {
    console.log("Пользователь не авторизован. Перенаправление на страницу входа.");
    window.location.href = "entry.html";
  }
});

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
const deleteButton = document.getElementById('deleteButton');

// Слушатели событий для загрузки
uploadLeft.addEventListener('click', () => triggerUpload('left'));
uploadCenter.addEventListener('click', () => triggerUpload('center'));
uploadRight.addEventListener('click', () => triggerUpload('right'));

// Открытие диалога выбора файла
function triggerUpload(column) {
  fileInput.dataset.column = column;
  fileInput.click();
}

// Загрузка файла в Cloudinary
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const column = fileInput.dataset.column;
    const timestamp = new Date().toISOString();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ever_together_upload");

    fetch(`https://api.cloudinary.com/v1_1/dozbf3jis/image/upload`, {
      method: "POST",
      body: formData
    })
      .then((response) => response.json())
      .then((data) => {
        const imageData = {
          url: data.secure_url,
          timestamp: timestamp,
          views: 0,
          column: column
        };

        const newImageRef = push(dbRef(database, 'images'));
        return set(newImageRef, imageData);
      })
      .then(() => {
        loadImagesFromFirebase();
      })
      .catch((error) => {
        console.error("Ошибка при загрузке изображения:", error);
      });
  }
  fileInput.value = '';
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

// Отображение изображения
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
  modalImage.dataset.id = imgElement.dataset.id;

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

// Удаление изображения
deleteButton.addEventListener('click', () => {
  const imageId = modalImage.dataset.id;
  const imageRef = dbRef(database, `images/${imageId}`);

  remove(imageRef)
    .then(() => {
      console.log("Изображение успешно удалено.");
      modal.style.display = 'none';
      loadImagesFromFirebase();
    })
    .catch((error) => {
      console.error("Ошибка при удалении изображения:", error);
    });
});
