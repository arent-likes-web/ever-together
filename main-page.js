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
const modalImageElement = document.getElementById('modalImage');
const modalActionsContainer = document.querySelector('.modal-actions-container');
const imageContainerGlobalRef = document.querySelector('.image-container'); // <-- Эта ссылка была добавлена, она полезна

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
      // Сортировка по timestamp для порядка (добавлена ранее)
      const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      imageArray.forEach((imgData) => {
        displayImage(imgData, imgData.id);
      });
    }
    updateBackgroundGradient();
  });
}

// Отображение изображения с плавным появлением
function displayImage(imageData, imageId) {
  const targetColumn = document.getElementById(`${imageData.column}Column`);
  if (!targetColumn) return;

  const imageWrapper = document.createElement('div');
  imageWrapper.classList.add('image-wrapper');
  imageWrapper.dataset.timestamp = imageData.timestamp;
  imageWrapper.dataset.views = imageData.views || 0;
  imageWrapper.dataset.id = imageId;
  imageWrapper.dataset.column = imageData.column;

  const img = document.createElement('img');
  img.src = imageData.url; // <-- Здесь мы просто используем исходный URL
  img.classList.add('thumbnail');
  img.alt = 'Gallery Image'; // Добавляем alt текст

  img.onload = () => { // <-- Этот onload остался
    img.classList.add('loaded');
  };

  imageWrapper.addEventListener('click', (event) => {
    // event.stopPropagation(); // <-- Этот stopPropagation закомментировал, но он не был причиной "ничего не грузит"
    openModal(img);
  });

  imageWrapper.appendChild(img);
  targetColumn.prepend(imageWrapper);
}

// Открытие модального окна
function openModal(imgElement) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const imageInfo = document.getElementById('imageInfo');
  const moreOptionsBtn = document.getElementById('moreOptionsButton');
  const dropdown = document.getElementById('optionsDropdown');

  modal.style.display = 'block';
  dropdown.style.display = 'none';
  modalImage.src = imgElement.src; // <-- Используем src прямо из миниатюры
  modalImage.dataset.id = imgElement.dataset.id;

  // --- Убираем информацию о просмотрах и загрузке ---
  imageInfo.innerHTML = ''; // Очищаем содержимое

  // Логика увеличения просмотров (оставляем, если нужна для статистики)
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
    const imageRefDB = dbRef(database, `images/${imageId}`);
    update(imageRefDB, { views: currentViews });
    const wrapperElement = document.querySelector(`.image-wrapper[data-id="${imageId}"]`);
    if (wrapperElement) {
        wrapperElement.dataset.views = currentViews;
    }
  }
  // --- Конец секции по удалению информации ---

  // Блокируем клики на элементах под модальным окном
  if (imageContainerGlobalRef) {
    imageContainerGlobalRef.style.pointerEvents = 'none';
  }

  moreOptionsBtn.onclick = function(event) {
    event.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  };

  dropdown.onclick = function(event) {
    event.preventDefault();
    event.stopPropagation();

    const targetActionElement = event.target.closest('a[data-action]');
    if (!targetActionElement) return;

    const action = targetActionElement.dataset.action;
    const currentImageId = modalImage.dataset.id;

    if (action === 'delete') {
      remove(dbRef(database, `images/${currentImageId}`))
        .then(() => {
          console.log("Изображение удалено:", currentImageId);
          closeModal();
        })
        .catch(error => console.error("Ошибка удаления:", error));
    } else if (action === 'move') {
      const newColumn = targetActionElement.dataset.column;
      update(dbRef(database, `images/${currentImageId}`), { column: newColumn })
        .then(() => {
          console.log(`Изображение ${currentImageId} перемещено в ${newColumn}`);
          closeModal();
        })
        .catch(error => console.error("Ошибка перемещения:", error));
    }

    dropdown.style.display = 'none';
  };

  // Останавливаем всплытие события клика от элементов внутри модального окна
  modalImageElement.onclick = (event) => event.stopPropagation();
  modalActionsContainer.onclick = (event) => event.stopPropagation();
  imageInfo.onclick = (event) => event.stopPropagation();
}

// Новая функция для закрытия модального окна и сброса pointer-events
function closeModal() {
  imageModalGlobalRef.style.display = 'none';
  if (optionsDropdownGlobalRef) {
    optionsDropdownGlobalRef.style.display = 'none';
  }
  document.getElementById('modalImage').src = '';
  document.getElementById('modalImage').dataset.id = '';
  document.getElementById('imageInfo').innerHTML = '';

  // Сбрасываем pointer-events, чтобы клики снова работали
  if (imageContainerGlobalRef) {
    imageContainerGlobalRef.style.pointerEvents = 'auto';
  }
}

// Обработчик закрытия модального окна при клике на фон (для мыши)
function handleCloseInteractions(event) {
  // Закрытие дропдауна, если клик вне его и кнопки
  if (optionsDropdownGlobalRef && optionsDropdownGlobalRef.style.display === 'block') {
    if (moreOptionsButtonGlobalRef &&
        !moreOptionsButtonGlobalRef.contains(event.target) &&
        !optionsDropdownGlobalRef.contains(event.target)) {
      optionsDropdownGlobalRef.style.display = 'none';
    }
  }

  // Закрытие модального окна при клике на подложку (пустое место)
  if (imageModalGlobalRef && imageModalGlobalRef.style.display === 'block' && event.target === imageModalGlobalRef) {
    closeModal();
  }
  // Дополнительная остановка всплытия (для мыши)
  if (imageModalGlobalRef && event.target === imageModalGlobalRef) {
    event.stopPropagation();
  }
}

// Добавляем обработчик для touchend на сам фон модального окна (для мобильных)
imageModalGlobalRef.addEventListener('touchend', (event) => {
  // Убеждаемся, что касание закончилось на самом фоне модального окна
  if (event.target === imageModalGlobalRef) {
    closeModal();
  }
  event.stopPropagation(); // Важно остановить всплытие и для touch-событий
});

window.addEventListener('click', handleCloseInteractions);
// Глобальный touchend обработчик убран, т.к. есть на imageModalGlobalRef

// ----- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ПАКЕТНОЙ ЗАГРУЗКИ -----
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true;
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const uploadButtons = document.querySelectorAll('.upload-buttons button');
uploadButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const column = button.id.replace('upload', '').toLowerCase();
    fileInput.dataset.column = column;
    fileInput.click();
  });
});

fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    const selectedColumn = fileInput.dataset.column;
    console.log(`Начало пакетной загрузки ${files.length} файлов в колонку ${selectedColumn}`);

    for (const file of files) {
      console.log(`Загрузка файла: ${file.name}`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "ever_together_upload");

        const cloudinaryResponse = await fetch("https://api.cloudinary.com/v1_1/dozbf3jis/image/upload", {
          method: "POST",
          body: formData
        });

        if (!cloudinaryResponse.ok) {
          let errorDetails = `HTTP ошибка ${cloudinaryResponse.status}: ${cloudinaryResponse.statusText}`;
          try {
            const errorData = await cloudinaryResponse.json();
            if (errorData.error && errorData.error.message) {
              errorDetails += ` - ${errorData.error.message}`;
            }
          } catch (e) {
            // Не удалось распарсить JSON ошибки
          }
          console.error(`Ошибка Cloudinary при загрузке ${file.name}: ${errorDetails}`);
          alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorDetails}. Смотрите консоль для деталей.`);
          continue;
        }

        const cloudinaryData = await cloudinaryResponse.json();

        if (cloudinaryData.secure_url) {
          const newImageRef = push(dbRef(database, 'images'));
          await set(newImageRef, {
            url: cloudinaryData.secure_url,
            timestamp: new Date().toISOString(),
            views: 0,
            column: selectedColumn
          });
          console.log(`Файл ${file.name} успешно загружен и сохранен.`);
        } else {
          const errorMsg = cloudinaryData.error && cloudinaryData.error.message ? cloudinaryData.error.message : "URL не получен от Cloudinary.";
          console.error(`Ошибка при загрузке ${file.name} в Cloudinary: ${errorMsg}`, cloudinaryData);
          alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorMsg}.`);
        }
      } catch (error) {
        console.error(`Критическая ошибка при загрузке файла ${file.name}:`, error);
        alert(`Произошла ошибка при загрузке файла ${file.name}: ${error.message}.`);
      }
    }
    event.target.value = null;
    console.log("Пакетная загрузка завершена (или предприняты все попытки).");
  }
});
// ----- КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ ПАКЕТНОЙ ЗАГРУЗКИ -----


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
  const images = document.querySelectorAll(`.image-column#${columnName}Column .image-wrapper`);
  return Array.from(images).reduce((acc, wrapper) => acc + (parseInt(wrapper.dataset.views) || 0), 0);
}
