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
const imageContainerGlobalRef = document.querySelector('.image-container');

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

// Инициализация Intersection Observer для ленивой загрузки
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      // Восстанавливаем src из data-src для начала загрузки
      // Проверяем, что img.dataset.src существует перед присвоением
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      img.classList.add('loaded'); // Добавляем класс loaded после начала загрузки
      observer.unobserve(img); // Перестаем наблюдать за изображением после его загрузки
    }
  });
}, {
  rootMargin: '100px 0px' // Загружаем изображения, когда они находятся в 100px от видимой области
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
      // Преобразуем объект в массив и сортируем по timestamp для вывода в правильном порядке
      const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Сортируем по убыванию даты

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
  img.classList.add('thumbnail');
  img.alt = 'Gallery Image'; // Добавляем alt текст для доступности

  // --- ЛЕНИВАЯ ЗАГРУЗКА И ОПТИМИЗАЦИЯ CLOUDINARY ---
  // Используем data-src для ленивой загрузки и src для placeholder'а
  // Применяем трансформации Cloudinary для оптимизации:
  // f_auto: автоматический формат (webp, avif и т.д.)
  // q_auto: автоматическое качество
  // w_auto: автоматическая ширина (лучше использовать конкретные ширины, но для примера можно auto)
  // dpr_auto: автоматическое определение плотности пикселей устройства
  const optimizedUrl = imageData.url.replace('/upload/', '/upload/f_auto,q_auto,w_400,dpr_auto,c_fill/'); // w_400 как пример для миниатюр
  img.dataset.src = optimizedUrl; // Основной URL для загрузки
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E'; // Прозрачный placeholder
  // img.src = 'path/to/small-placeholder.png'; // Можно использовать маленький реальный placeholder

  // img.onload теперь не нужен, так как Intersection Observer управляет загрузкой
  // img.onload = () => { img.classList.add('loaded'); };

  imageWrapper.addEventListener('click', (event) => {
    openModal(img);
  });

  imageWrapper.appendChild(img);
  targetColumn.prepend(imageWrapper);

  // Начинаем наблюдать за изображением для ленивой загрузки
  imageObserver.observe(img);
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
  // Для модального окна используем более крупное или оригинальное изображение
  // Убираем c_fill, чтобы не обрезать, если это полноразмерное изображение
  // Можно также указать w_auto,h_auto или max-width/height, если оригинал очень большой.
  const modalOptimizedUrl = imgElement.dataset.src.replace(',c_fill', ''); // Убираем c_fill
  modalImage.src = modalOptimizedUrl;
  modalImage.dataset.id = imgElement.dataset.id;

  // --- Убираем информацию о просмотрах и загрузке ---
  imageInfo.innerHTML = ''; // Очищаем содержимое

  // Логика увеличения просмотров (если нужна для статистики, даже если не отображается)
  const imageId = imgElement.dataset.id;
  const column = imgElement.dataset.column;
  let currentViews = parseInt(imgElement.dataset.views) || 0; // Получаем текущее значение из DOM

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
    // Обновляем dataset.views в DOM, чтобы последующие открытия использовали актуальное значение
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

  // Останавливаем всплытие события клика от элементов внутри модального окна,
  // чтобы они не передавали клик на фон модального окна
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
  // Очищаем src и data-id для безопасности, чтобы не хранить ссылку на предыдущее изображение
  document.getElementById('modalImage').src = '';
  document.getElementById('modalImage').dataset.id = '';
  document.getElementById('imageInfo').innerHTML = '';

  // Сбрасываем pointer-events, чтобы клики снова работали
  if (imageContainerGlobalRef) {
    imageContainerGlobalRef.style.pointerEvents = 'auto';
  }
}

// Обработчик закрытия модального окна при клике на фон
function handleCloseInteractions(event) {
  // Закрытие дропдауна, если клик вне его и кнопки
  if (optionsDropdownGlobalRef && optionsDropdownGlobalRef.style.display === 'block') {
    if (moreOptionsButtonGlobalRef &&
        !moreOptionsButtonGlobalRef.contains(event.target) &&
        !optionsDropdownGlobalRef.contains(event.target)) {
      optionsDropdownGlobalRef.style.display = 'none';
    }
  }

  // --- ИСПРАВЛЕНИЕ ДЛЯ МОБИЛЬНОГО ЗАКРЫТИЯ ---
  // Проверяем, что клик был по самому модальному окну, а не по его содержимому
  if (imageModalGlobalRef && imageModalGlobalRef.style.display === 'block' && event.target === imageModalGlobalRef) {
    closeModal(); // Закрываем модальное окно
  }
  // Дополнительная остановка всплытия, чтобы клик по модальному окну (даже если оно уже закрылось)
  // не обрабатывался элементами под ним.
  if (imageModalGlobalRef && event.target === imageModalGlobalRef) {
    event.stopPropagation();
  }
}

// Добавляем обработчик для touchend на сам фон модального окна
// Это может быть более надежно для мобильных устройств
imageModalGlobalRef.addEventListener('touchend', (event) => {
  if (event.target === imageModalGlobalRef) {
    closeModal();
  }
  event.stopPropagation(); // Важно остановить всплытие и для touch-событий
});


window.addEventListener('click', handleCloseInteractions);
// Удаляем глобальный touchend обработчик, чтобы избежать дублирования или конфликтов
// window.addEventListener('touchend', handleCloseInteractions);


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
