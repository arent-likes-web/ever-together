// main-page.js

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebase/auth"; // Обновленный импорт для signOut, иногда может требовать другого пути

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

// Ссылки на колонки для очистки и добавления
const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

// Заглушка для кнопки выхода (она должна быть удалена из HTML основной страницы)
// Этот код не будет выполняться, если элемента с id="signOutButton" нет на странице
const signOutButton = document.getElementById('signOutButton');
if (signOutButton) {
    signOutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Пользователь вышел.");
            window.location.href = "entry.html"; // Перенаправление на страницу входа
        } catch (error) {
            console.error("Ошибка при выходе:", error);
            alert("Ошибка при выходе: " + error.message);
        }
    });
}


// Проверка авторизации при загрузке страницы
console.log("[main-page.js] Запуск onAuthStateChanged...");
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(`[main-page.js] Пользователь авторизован: ${user.email}`);
    window.currentUser = user.email; // Устанавливаем текущего пользователя
    loadImagesFromFirebase(); // Загружаем изображения
    updateBackgroundGradient();
  } else {
    console.log("[main-page.js] Пользователь не авторизован. Перенаправление на страницу входа.");
    window.location.href = "entry.html"; // Перенаправляем, если нет авторизации
  }
});

// Загрузка изображений из Firebase
function loadImagesFromFirebase() {
  console.log("[main-page.js] Вызов loadImagesFromFirebase...");
  const imagesRef = dbRef(database, 'images');

  // onValue будет срабатывать каждый раз, когда данные в 'images' меняются
  onValue(imagesRef, (snapshot) => {
    console.log("[main-page.js] Получены новые данные из Firebase.");
    const data = snapshot.val();
    
    // Очищаем колонки перед добавлением новых/обновленных изображений
    if (leftColumn) leftColumn.innerHTML = '';
    if (centerColumn) centerColumn.innerHTML = '';
    if (rightColumn) rightColumn.innerHTML = '';

    if (data) {
      console.log("[main-page.js] Данные изображений Firebase:", data);
      const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      
      // Сортируем по времени создания (новые сверху)
      imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      imageArray.forEach((imgData) => {
        displayImage(imgData, imgData.id);
      });
    } else {
      console.log("[main-page.js] Нет изображений в базе данных Firebase.");
    }
    updateBackgroundGradient();
  }, (error) => { // Обработчик ошибок для onValue
    console.error("[main-page.js] Ошибка при получении данных из Firebase Realtime Database:", error);
    alert("Ошибка загрузки данных из базы данных. Проверьте консоль.");
  });
}

// Отображение изображения с плавным появлением
function displayImage(imageData, imageId) {
  const targetColumn = document.getElementById(`${imageData.column}Column`);
  if (!targetColumn) {
      console.warn(`[main-page.js] Целевая колонка для изображения ${imageId} (${imageData.column}Column) не найдена.`);
      return;
  }
  
  // Проверяем, есть ли уже такое изображение, чтобы избежать дублирования
  // Это важно, если onValue срабатывает несколько раз (например, при изменениях в БД)
  if (targetColumn.querySelector(`.image-wrapper[data-id="${imageId}"]`)) {
      // console.log(`[main-page.js] Изображение ${imageId} уже существует в колонке ${imageData.column}. Пропускаем добавление.`);
      return; 
  }

  const imageWrapper = document.createElement('div');
  imageWrapper.classList.add('image-wrapper');
  imageWrapper.dataset.timestamp = imageData.timestamp;
  imageWrapper.dataset.views = imageData.views || 0;
  imageWrapper.dataset.id = imageId;
  imageWrapper.dataset.column = imageData.column;

  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');
  img.alt = 'Gallery Image'; // Alt-текст для доступности
  img.loading = 'lazy'; // Оптимизация загрузки изображений
  img.setAttribute('crossorigin', 'anonymous'); // Важно для CORS, если Cloudinary и домен разные

  // Обработчики загрузки и ошибки изображения
  img.onload = () => {
    img.classList.add('loaded');
    // console.log(`[main-page.js] Изображение ${imageData.url} успешно загружено.`);
  };

  img.onerror = (e) => {
      console.error(`[main-page.js] Ошибка загрузки изображения из Cloudinary: ${img.src}`, e);
      imageWrapper.classList.add('image-load-error'); // Добавляем класс для визуальной индикации ошибки
      // Можно также добавить замещающий текст или иконку ошибки
      const errorText = document.createElement('p');
      errorText.textContent = 'Ошибка загрузки фото';
      errorText.style.color = 'red';
      errorText.style.position = 'absolute';
      errorText.style.top = '50%';
      errorText.style.left = '50%';
      errorText.style.transform = 'translate(-50%, -50%)';
      errorText.style.textAlign = 'center';
      imageWrapper.appendChild(errorText);
  };

  imageWrapper.addEventListener('click', (event) => {
    openModal(img);
  });

  imageWrapper.appendChild(img);
  targetColumn.prepend(imageWrapper); // Добавляем в начало колонки (новые сверху)
}

// Открытие модального окна
function openModal(imgElement) {
  console.log("[main-page.js] Открытие модального окна для изображения:", imgElement.src);
  if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo) {
      console.error("[main-page.js] Не найдены элементы модального окна. Проверьте HTML ID.");
      return;
  }

  imageModalGlobalRef.classList.add('show-modal'); // Показываем модальное окно через класс CSS
  optionsDropdownGlobalRef.style.display = 'none'; // Убедимся, что дропдаун скрыт при открытии

  modalImageElement.src = imgElement.src;
  modalImageElement.dataset.id = imgElement.dataset.id;
  modalImageElement.setAttribute('crossorigin', 'anonymous');

  document.getElementById('imageInfo').innerHTML = ''; // Очищаем инфо

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
    update(imageRefDB, { views: currentViews })
      .then(() => {
        console.log(`[main-page.js] Просмотр для ${imageId} обновлен до ${currentViews}.`);
      })
      .catch(error => {
        console.error(`[main-page.js] Ошибка обновления просмотров для ${imageId}:`, error);
      });
    const wrapperElement = document.querySelector(`.image-wrapper[data-id="${imageId}"]`);
    if (wrapperElement) {
        wrapperElement.dataset.views = currentViews;
    }
  }

  // Блокируем взаимодействие с фоном
  if (imageContainerGlobalRef) {
    imageContainerGlobalRef.style.pointerEvents = 'none';
  }

  moreOptionsButtonGlobalRef.onclick = function(event) {
    event.stopPropagation(); // Предотвращаем закрытие модального окна при клике на кнопку ...
    optionsDropdownGlobalRef.style.display = optionsDropdownGlobalRef.style.display === 'block' ? 'none' : 'block';
    console.log(`[main-page.js] Дропдаун опций: ${optionsDropdownGlobalRef.style.display}`);
  };

  optionsDropdownGlobalRef.onclick = function(event) {
    event.preventDefault(); // Предотвращаем переход по ссылке
    event.stopPropagation(); // Предотвращаем закрытие дропдауна/модального окна

    const targetActionElement = event.target.closest('a[data-action]');
    if (!targetActionElement) return;

    const action = targetActionElement.dataset.action;
    const currentImageId = modalImageElement.dataset.id; // Используем глобальную ссылку

    console.log(`[main-page.js] Действие: ${action} для изображения ${currentImageId}`);

    if (action === 'delete') {
      if (confirm('Вы уверены, что хотите удалить это изображение?')) {
        remove(dbRef(database, `images/${currentImageId}`))
          .then(() => {
            console.log("[main-page.js] Изображение удалено:", currentImageId);
            closeModal();
          })
          .catch(error => console.error("[main-page.js] Ошибка удаления:", error));
      }
    } else if (action === 'move') {
      const newColumn = targetActionElement.dataset.column;
      update(dbRef(database, `images/${currentImageId}`), { column: newColumn })
        .then(() => {
          console.log(`[main-page.js] Изображение ${currentImageId} перемещено в ${newColumn}`);
          closeModal();
        })
        .catch(error => console.error("[main-page.js] Ошибка перемещения:", error));
    }

    optionsDropdownGlobalRef.style.display = 'none';
  };

  // Предотвращаем закрытие модального окна при клике внутри его контента
  modalImageElement.onclick = (event) => event.stopPropagation();
  modalActionsContainer.onclick = (event) => event.stopPropagation();
  imageInfo.onclick = (event) => event.stopPropagation(); // Если imageInfo может быть кликабельным
}

// Функция закрытия модального окна
function closeModal() {
  console.log("[main-page.js] Закрытие модального окна.");
  imageModalGlobalRef.classList.remove('show-modal');
  if (optionsDropdownGlobalRef) {
    optionsDropdownGlobalRef.style.display = 'none';
  }
  modalImageElement.src = '';
  modalImageElement.dataset.id = '';
  document.getElementById('imageInfo').innerHTML = '';

  if (imageContainerGlobalRef) {
    imageContainerGlobalRef.style.pointerEvents = 'auto'; // Разблокируем взаимодействие с фоном
  }
}

// Обработчик для закрытия модального окна по клику вне контента
function handleCloseInteractions(event) {
    // Если дропдаун открыт и клик был вне кнопки и самого дропдауна, закрываем дропдаун
    if (optionsDropdownGlobalRef && optionsDropdownGlobalRef.style.display === 'block') {
        if (moreOptionsButtonGlobalRef &&
            !moreOptionsButtonGlobalRef.contains(event.target) &&
            !optionsDropdownGlobalRef.contains(event.target)) {
            console.log("[main-page.js] Клик вне дропдауна/кнопки, закрываем дропдаун.");
            optionsDropdownGlobalRef.style.display = 'none';
        }
    }

    // Если модальное окно открыто и клик был по его фону (но не по контенту внутри)
    if (imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal') && event.target === imageModalGlobalRef) {
        console.log("[main-page.js] Клик по фону модального окна, закрываем модальное окно.");
        closeModal();
    }
}

// Event listener для закрытия модального окна по клику вне контента
window.addEventListener('click', handleCloseInteractions);

// Обработчик для закрытия модального окна по нажатию ESC
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && imageModalGlobalRef.classList.contains('show-modal')) {
        console.log("[main-page.js] Нажата ESC, закрываем модальное окно.");
        closeModal();
    }
});


// Инициализация файлового ввода для загрузки
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true;
fileInput.style.display = 'none'; // Скрываем элемент input, так как будем вызывать его через кнопку
document.body.appendChild(fileInput);

const uploadButtons = document.querySelectorAll('.upload-buttons button');
uploadButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const column = button.id.replace('upload', '').toLowerCase();
    fileInput.dataset.column = column; // Сохраняем целевую колонку
    fileInput.click(); // Открываем диалог выбора файла
  });
});

fileInput.addEventListener('change', async (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    const selectedColumn = fileInput.dataset.column;
    console.log(`[main-page.js] Начало пакетной загрузки ${files.length} файлов в колонку ${selectedColumn}`);

    for (const file of files) {
      console.log(`[main-page.js] Загрузка файла: ${file.name} (${file.type}, ${file.size} байт)...`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "ever_together_upload"); // Важно: убедитесь, что этот preset существует в Cloudinary

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
            console.warn("[main-page.js] Не удалось распарсить JSON ошибки Cloudinary.", e);
          }
          console.error(`[main-page.js] Ошибка Cloudinary при загрузке ${file.name}: ${errorDetails}`);
          alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorDetails}. Проверьте консоль.`);
          continue; // Продолжаем загрузку других файлов
        }

        const cloudinaryData = await cloudinaryResponse.json();

        if (cloudinaryData.secure_url) {
          const newImageRef = push(dbRef(database, 'images')); // Генерируем уникальный ключ
          await set(newImageRef, {
            url: cloudinaryData.secure_url,
            timestamp: new Date().toISOString(),
            views: 0, // Начальное количество просмотров
            column: selectedColumn
          });
          console.log(`[main-page.js] Файл ${file.name} успешно загружен в Cloudinary и сохранен в Firebase.`);
        } else {
          const errorMsg = cloudinaryData.error && cloudinaryData.error.message ? cloudinaryData.error.message : "URL не получен от Cloudinary.";
          console.error(`[main-page.js] Ошибка: URL не получен от Cloudinary для ${file.name}:`, cloudinaryData);
          alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorMsg}.`);
        }
      } catch (error) {
        console.error(`[main-page.js] Критическая ошибка при загрузке файла ${file.name}:`, error);
        alert(`Произошла ошибка при загрузке файла ${file.name}: ${error.message}. Проверьте консоль.`);
      }
    }
    event.target.value = null; // Сбрасываем выбранные файлы для возможности повторной загрузки тех же файлов
    console.log("[main-page.js] Пакетная загрузка завершена.");
  }
});

// Функции для обновления градиента и подсчета просмотров (без изменений)
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
