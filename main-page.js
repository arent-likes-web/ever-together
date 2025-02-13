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

// Открытие модального окна
function openModal(imgElement) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const imageInfo = document.getElementById('imageInfo');

  modal.style.display = 'block';
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id;
  imageInfo.innerHTML = `📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>👁️ Просмотров: ${imgElement.dataset.views}`;
}

// Закрытие модального окна
const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', () => {
  document.getElementById('imageModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === document.getElementById('imageModal')) {
    document.getElementById('imageModal').style.display = 'none';
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

  document.body.style.background = `linear-gradient(to right, #c084fc ${gradientPosition}%, #2c2c2c)`;
}

function getColumnViews(column) {
  const images = document.querySelectorAll(`[data-column='${column}']`);
  return Array.from(images).reduce((acc, img) => acc + parseInt(img.dataset.views), 0);
} 
