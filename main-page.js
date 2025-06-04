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

// --- Глобальные ссылки на элементы модального окна для обработчиков закрытия ---
const imageModalGlobalRef = document.getElementById('imageModal');
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');


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
    document.getElementById('leftColumn').innerHTML = '';
    document.getElementById('centerColumn').innerHTML = '';
    document.getElementById('rightColumn').innerHTML = '';
    if (data) {
      Object.keys(data).forEach((key) => {
        displayImage(data[key], key);
      });
    }
    updateBackgroundGradient();
  });
}

// Отображение изображения
function displayImage(imageData, imageId) {
  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');
  img.dataset.timestamp = imageData.timestamp;
  img.dataset.views = imageData.views || 0;
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
  const modal = document.getElementById('imageModal'); // imageModalGlobalRef
  const modalImage = document.getElementById('modalImage');
  const imageInfo = document.getElementById('imageInfo');
  const moreOptionsBtn = document.getElementById('moreOptionsButton'); // moreOptionsButtonGlobalRef
  const dropdown = document.getElementById('optionsDropdown'); // optionsDropdownGlobalRef

  modal.style.display = 'block';
  dropdown.style.display = 'none'; // Убедимся, что дропдаун скрыт при открытии модалки
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id; // Важно для действий

  const imageId = imgElement.dataset.id;
  const column = imgElement.dataset.column;
  let currentViews = parseInt(imgElement.dataset.views) || 0;

  const userIsAretren = window.currentUser === 'aretren@gmail.com';
  const userIsChoisalery = window.currentUser === 'choisalery@gmail.com';
  let shouldIncrementView = false;

  if (column === 'left' && userIsAretren) { 
    shouldIncrementView = true;
  } else if (column === 'right' && userIsChoisalery) { 
    shouldIncrementView = true;
  } else if (column === 'center' && (userIsAretren || userIsChoisalery)) { 
    shouldIncrementView = true;
  }

  if (shouldIncrementView) {
    currentViews += 1;
    imgElement.dataset.views = currentViews;
    const imageRefDB = dbRef(database, `images/${imageId}`);
    update(imageRefDB, { views: currentViews });
  }

  imageInfo.innerHTML = `📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>👁️ Просмотров: ${currentViews}`;

  // Обработчик для кнопки "..."
  moreOptionsBtn.onclick = function(event) {
    event.stopPropagation(); // Предотвращаем закрытие модалки или дропдауна из-за всплытия
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  };

  // Обработчик для действий в выпадающем списке (делегирование)
  dropdown.onclick = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const targetActionElement = event.target.closest('a[data-action]');
    if (!targetActionElement) return;

    const action = targetActionElement.dataset.action;
    const currentImageId = modalImage.dataset.id; // Берем ID из открытого в модалке изображения

    if (action === 'delete') {
      remove(dbRef(database, `images/${currentImageId}`))
        .then(() => console.log("Изображение удалено:", currentImageId))
        .catch(error => console.error("Ошибка удаления:", error));
    } else if (action === 'move') {
      const newColumn = targetActionElement.dataset.column;
      update(dbRef(database, `images/${currentImageId}`), { column: newColumn })
        .then(() => console.log(`Изображение ${currentImageId} перемещено в ${newColumn}`))
        .catch(error => console.error("Ошибка перемещения:", error));
    }

    dropdown.style.display = 'none';
    modal.style.display = 'none'; // Закрываем модальное окно после действия
  };
}


// --- Обновленный обработчик закрытия модального окна и выпадающего списка ---
function handleCloseInteractions(event) {
    // Закрыть выпадающий список, если клик вне его и кнопки "..."
    if (optionsDropdownGlobalRef && optionsDropdownGlobalRef.style.display === 'block') {
        if (moreOptionsButtonGlobalRef && 
            !moreOptionsButtonGlobalRef.contains(event.target) && 
            !optionsDropdownGlobalRef.contains(event.target)) {
            optionsDropdownGlobalRef.style.display = 'none';
        }
    }

    // Закрыть модальное окно, если клик по фону (backdrop)
    if (imageModalGlobalRef && imageModalGlobalRef.style.display === 'block' && event.target === imageModalGlobalRef) {
        imageModalGlobalRef.style.display = 'none';
        if (optionsDropdownGlobalRef) { // Также скрыть выпадающий список
            optionsDropdownGlobalRef.style.display = 'none';
        }
    }
}

window.addEventListener('click', handleCloseInteractions);
window.addEventListener('touchend', handleCloseInteractions); // Также для сенсорных устройств


// Логика загрузки файлов (остается без изменений)
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ever_together_upload");

    fetch("https://api.cloudinary.com/v1_1/dozbf3jis/image/upload", {
      method: "POST",
      body: formData
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.secure_url) {
        const newImageRef = push(dbRef(database, 'images'));
        set(newImageRef, {
          url: data.secure_url,
          timestamp: new Date().toISOString(),
          views: 0,
          column: fileInput.dataset.column
        });
      } else {
        console.error("Ошибка при загрузке изображения в Cloudinary:", data);
      }
    })
    .catch((error) => console.error("Ошибка при загрузке изображения:", error));
  }
});

function updateBackgroundGradient() {
  const leftViews = getColumnViews('left');
  const centerViews = getColumnViews('center');
  const rightViews = getColumnViews('right');
  const totalViews = leftViews + centerViews + rightViews;
  let balance = 0;
  if (totalViews > 0) {
    balance = (leftViews - rightViews) / totalViews;
  }
  const gradientPosition = 50 + (balance * 50);
  document.body.style.background = `linear-gradient(to right, #121212 ${gradientPosition}%, #2c3e50)`;
}

function getColumnViews(columnName) {
  const images = document.querySelectorAll(`.image-column#${columnName}Column .thumbnail`);
  return Array.from(images).reduce((acc, img) => acc + (parseInt(img.dataset.views) || 0), 0);
}
