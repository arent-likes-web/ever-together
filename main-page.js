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
// const closeModalButton = document.querySelector('.close-modal'); // Эту строку удаляем, т.к. крестика нет

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

// Отображение изображения с плавным появлением
function displayImage(imageData, imageId) {
  const targetColumn = document.getElementById(`${imageData.column}Column`);
  if (!targetColumn) return;

  // Создаем обертку для изображения (скелетный лоадер)
  const imageWrapper = document.createElement('div');
  imageWrapper.classList.add('image-wrapper');
  imageWrapper.dataset.timestamp = imageData.timestamp;
  imageWrapper.dataset.views = imageData.views || 0;
  imageWrapper.dataset.id = imageId;
  imageWrapper.dataset.column = imageData.column;

  // Создаем само изображение
  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');

  // Добавляем обработчик события 'load' для img
  img.onload = () => {
    img.classList.add('loaded'); // Добавляем класс 'loaded' после загрузки изображения
  };

  // Перехватываем клик на imageWrapper, а не на img,
  // чтобы событие открытия модального окна срабатывало только при клике на обертку
  // и не конфликтовало с логикой закрытия модального окна.
  imageWrapper.addEventListener('click', () => openModal(img));

  imageWrapper.appendChild(img); // Добавляем изображение внутрь обертки
  targetColumn.prepend(imageWrapper); // Добавляем обертку в колонку
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
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id;

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
    // Обновляем dataset на элементе обертки, чтобы не терять данные при перерисовке
    // Изображение внутри модального окна не является тем же элементом, что в колонке.
    // Поэтому нужно обновить views на оригинальном элементе в колонке, если есть доступ,
    // но Firebase сама обновит данные и перерисует. Здесь главное - отправить в базу.
    const imageRefDB = dbRef(database, `images/${imageId}`);
    update(imageRefDB, { views: currentViews });
  }

  imageInfo.innerHTML = `📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>👁️️ Просмотров: ${currentViews}`;

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
          modal.style.display = 'none'; // Закрываем модальное окно после удаления
          // Очищаем данные из модального окна
          modalImage.src = '';
          modalImage.dataset.id = '';
          imageInfo.innerHTML = '';
        })
        .catch(error => console.error("Ошибка удаления:", error));
    } else if (action === 'move') {
      const newColumn = targetActionElement.dataset.column;
      update(dbRef(database, `images/${currentImageId}`), { column: newColumn })
        .then(() => {
          console.log(`Изображение ${currentImageId} перемещено в ${newColumn}`);
          modal.style.display = 'none'; // Закрываем модальное окно после перемещения
          // Очищаем данные из модального окна
          modalImage.src = '';
          modalImage.dataset.id = '';
          imageInfo.innerHTML = '';
        })
        .catch(error => console.error("Ошибка перемещения:", error));
    }

    dropdown.style.display = 'none';
  };
}

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
    imageModalGlobalRef.style.display = 'none';
    if (optionsDropdownGlobalRef) {
      optionsDropdownGlobalRef.style.display = 'none';
    }
    // Очищаем данные из модального окна при закрытии
    document.getElementById('modalImage').src = '';
    document.getElementById('modalImage').dataset.id = '';
    document.getElementById('imageInfo').innerHTML = '';
  }
}

window.addEventListener('click', handleCloseInteractions);
window.addEventListener('touchend', handleCloseInteractions);


// ----- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ПАКЕТНОЙ ЗАГРУЗКИ -----
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true; // Разрешаем выбор нескольких файлов
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

fileInput.addEventListener('change', async (event) => { // Делаем обработчик асинхронным
  const files = event.target.files; // Получаем список всех выбранных файлов
  if (files.length > 0) {
    const selectedColumn = fileInput.dataset.column; // Колонка для всей пачки файлов
    console.log(`Начало пакетной загрузки ${files.length} файлов в колонку ${selectedColumn}`);
    // Можно добавить какой-то индикатор загрузки для пользователя здесь

    for (const file of files) { // Последовательно обрабатываем каждый файл
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
            // Пытаемся получить детали ошибки от Cloudinary
            const errorData = await cloudinaryResponse.json();
            if (errorData.error && errorData.error.message) {
              errorDetails += ` - ${errorData.error.message}`;
            }
          } catch (e) {
            // Не удалось распарсить JSON ошибки
          }
          console.error(`Ошибка Cloudinary при загрузке ${file.name}: ${errorDetails}`);
          alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorDetails}. Смотрите консоль для деталей.`);
          continue; // Переходим к следующему файлу
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
      } catch (error) { // Ловим сетевые ошибки или другие сбои в процессе
        console.error(`Критическая ошибка при загрузке файла ${file.name}:`, error);
        alert(`Произошла ошибка при загрузке файла ${file.name}: ${error.message}.`);
      }
    }
    // Очищаем значение инпута, чтобы можно было выбрать те же файлы снова
    event.target.value = null;
    console.log("Пакетная загрузка завершена (или предприняты все попытки).");
    // Можно убрать индикатор загрузки для пользователя здесь
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
  // Теперь ищем изображения внутри оберток
  const images = document.querySelectorAll(`.image-column#${columnName}Column .image-wrapper`);
  return Array.from(images).reduce((acc, wrapper) => acc + (parseInt(wrapper.dataset.views) || 0), 0);
}
