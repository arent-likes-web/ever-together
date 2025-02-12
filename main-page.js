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
    updateWidget(); // Инициализация виджета при старте
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

      updateWidget(); // Обновление виджета после загрузки изображений
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

// Обработчики событий для кнопок загрузки
const uploadLeftButton = document.getElementById('uploadLeft');
const uploadCenterButton = document.getElementById('uploadCenter');
const uploadRightButton = document.getElementById('uploadRight');

uploadLeftButton.addEventListener('click', () => handleImageUpload('left'));
uploadCenterButton.addEventListener('click', () => handleImageUpload('center'));
uploadRightButton.addEventListener('click', () => handleImageUpload('right'));

function handleImageUpload(column) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

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
          column: column
        });
      };
      reader.readAsDataURL(file);
    }
  });

  fileInput.click();
}

// Закрытие модального окна
const closeModal = document.querySelector('.close');
closeModal.addEventListener('click', () => {
  document.getElementById('imageModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === document.getElementById('imageModal')) {
    document.getElementById('imageModal').style.display = 'none';
  }
});

// Инициализация и обновление виджета с бегунком в виде сердечка
function updateWidget() {
  const leftViews = getColumnViews('left');
  const centerViews = getColumnViews('center');
  const rightViews = getColumnViews('right');

  const totalViews = leftViews + centerViews + rightViews;
  const balance = totalViews ? ((rightViews - leftViews) / totalViews) * 50 + 50 : 50;

  const slider = document.getElementById('balanceSlider');
  if (!slider) {
    createSlider(balance);
  } else {
    slider.value = balance;
  }
}

function createSlider(initialValue) {
  const widgetContainer = document.createElement('div');
  widgetContainer.classList.add('balance-widget');

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'balanceSlider';
  slider.min = 0;
  slider.max = 100;
  slider.value = initialValue;
  slider.disabled = true;

  widgetContainer.appendChild(slider);
  document.body.insertBefore(widgetContainer, document.querySelector('.image-container'));
}

function getColumnViews(column) {
  const images = document.querySelectorAll(`[data-column='${column}']`);
  return Array.from(images).reduce((acc, img) => acc + parseInt(img.dataset.views), 0);
} 
