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
    window.currentUser = user.email;  // Сохраняем email для проверки
    loadImagesFromFirebase();
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

// Открытие модального окна с учётом условий для счётчиков
function openModal(imgElement) {
  modal.style.display = 'block';
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id;

  const imageId = imgElement.dataset.id;
  const column = imgElement.dataset.column; // Определяем столбец из данных изображения
  const newViews = parseInt(imgElement.dataset.views);

  // Проверка условий для увеличения счётчика
  const shouldIncrementView =
    (column === 'left' && window.currentUser === 'aretren@gmail.com') ||
    (column === 'right' && window.currentUser === 'choisalery@gmail.com') ||
    (column === 'center' && (window.currentUser === 'aretren@gmail.com' || window.currentUser === 'choisalery@gmail.com'));

  if (shouldIncrementView) {
    const updatedViews = newViews + 1;
    imgElement.dataset.views = updatedViews;

    const imageRef = dbRef(database, `images/${imageId}`);
    update(imageRef, { views: updatedViews });

    imageInfo.innerHTML = `
      📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>
      👁️ Просмотров: ${updatedViews}
    `;
  } else {
    imageInfo.innerHTML = `
      📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>
      👁️ Просмотров: ${newViews}
    `;
  }
}
