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
    document.getElementById('leftColumn').innerHTML = ''; // Очистка перед загрузкой
    document.getElementById('centerColumn').innerHTML = '';
    document.getElementById('rightColumn').innerHTML = '';
    if (data) {
      Object.keys(data).forEach((key) => {
        displayImage(data[key], key);
      });
    }
    updateBackgroundGradient(); // Обновляем градиент после загрузки/обновления всех изображений
  });
}

// Отображение изображения
function displayImage(imageData, imageId) {
  const img = document.createElement('img');
  img.src = imageData.url;
  img.classList.add('thumbnail');
  img.dataset.timestamp = imageData.timestamp;
  img.dataset.views = imageData.views || 0; // Убедимся, что views имеет значение по умолчанию
  img.dataset.id = imageId;
  img.dataset.column = imageData.column;
  img.addEventListener('click', () => openModal(img));
  const targetColumn = document.getElementById(`${imageData.column}Column`);
  if (targetColumn) {
    targetColumn.prepend(img); // Добавляем новые изображения в начало колонки
  }
}

// Открытие модального окна с обновлением счетчика просмотров
function openModal(imgElement) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const imageInfo = document.getElementById('imageInfo');
  const deleteButton = document.getElementById('deleteButton');

  modal.style.display = 'block';
  modalImage.src = imgElement.src;
  modalImage.dataset.id = imgElement.dataset.id; // Сохраняем id для удаления

  const imageId = imgElement.dataset.id;
  const column = imgElement.dataset.column;
  let currentViews = parseInt(imgElement.dataset.views) || 0;

  // Логика инкремента просмотров
  const userIsAretren = window.currentUser === 'aretren@gmail.com';
  const userIsChoisalery = window.currentUser === 'choisalery@gmail.com';
  let shouldIncrementView = false;

  if (column === 'left' && userIsAretren) { // HIM PEACH can be viewed by aretren
    shouldIncrementView = true;
  } else if (column === 'right' && userIsChoisalery) { // HER CAT can be viewed by choisalery
    shouldIncrementView = true;
  } else if (column === 'center' && (userIsAretren || userIsChoisalery)) { // OUR DREAM by both
    shouldIncrementView = true;
  }
  // Примечание: Эта логика означает, что просмотр засчитывается только если "свой" пользователь открывает фото
  // или если это общая колонка. Если это поведение нежелательно, логику нужно скорректировать.


  // Если текущий пользователь не тот, кто "должен" просматривать (для левой/правой колонки),
  // просмотр не увеличиваем. Для центральной - увеличиваем для обоих.
  // Эта проверка была немного запутанной, упростим:
  // Просмотр увеличивается если:
  // 1. Фото в левой колонке И текущий пользователь - 'aretren@gmail.com'
  // 2. Фото в правой колонке И текущий пользователь - 'choisalery@gmail.com'
  // 3. Фото в центральной колонке (любой из двух пользователей)

  // Чтобы избежать двойного увеличения при открытии своего же фото несколько раз подряд без перезагрузки данных из Firebase,
  // можно добавить проверку, не просматривал ли пользователь это фото в текущей сессии.
  // Но для простоты пока оставим так, как Firebase обновит счетчик.

  if (shouldIncrementView) {
    currentViews += 1;
    imgElement.dataset.views = currentViews; // Обновляем на клиенте для немедленного отображения
    const imageRef = dbRef(database, `images/${imageId}`);
    update(imageRef, { views: currentViews });
  }

  imageInfo.innerHTML = `📅 Загружено: ${new Date(imgElement.dataset.timestamp).toLocaleString()}<br>👁️ Просмотров: ${currentViews}`;

  deleteButton.onclick = () => {
    remove(dbRef(database, `images/${imageId}`)).then(() => {
      modal.style.display = 'none';
      // loadImagesFromFirebase(); // Это вызовет полную перезагрузку, что хорошо
    }).catch(error => {
        console.error("Ошибка при удалении изображения:", error);
    });
  };
}

// ----- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ЗАКРЫТИЯ МОДАЛЬНОГО ОКНА -----
// Получаем ссылку на модальное окно один раз
const imageModalElement = document.getElementById('imageModal');

// Функция для закрытия модального окна
function closeModalHandler(event) {
  // Проверяем, что модальное окно видимо и клик/тап был именно по фону модального окна
  if (imageModalElement && imageModalElement.style.display === 'block' && event.target === imageModalElement) {
    imageModalElement.style.display = 'none';
  }
}

// Добавляем обработчик для события 'click'
window.addEventListener('click', closeModalHandler);

// Добавляем обработчик для события 'touchend' для лучшей совместимости с iOS
window.addEventListener('touchend', closeModalHandler);
// ----- КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ ЗАКРЫТИЯ МОДАЛЬНОГО ОКНА -----


const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const uploadButtons = document.querySelectorAll('.upload-buttons button');
uploadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const column = button.id.replace('upload', '').toLowerCase();
    fileInput.dataset.column = column; // Сохраняем колонку для загрузчика
    fileInput.click();
  });
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ever_together_upload"); // Убедитесь, что этот preset существует в Cloudinary

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
          column: fileInput.dataset.column // Используем сохраненную колонку
        });
        // Не нужно вызывать loadImagesFromFirebase() здесь,
        // onValue автоматически обновит интерфейс при изменении данных в Firebase.
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
    // Баланс смещается в сторону того, у кого больше просмотров
    // Если leftViews > rightViews, balance будет > 0 (сдвиг вправо, цвет #121212 занимает больше места)
    // Если rightViews > leftViews, balance будет < 0 (сдвиг влево, цвет #2c3e50 занимает больше места)
    balance = (leftViews - rightViews) / totalViews;
  }
  
  // gradientPosition определяет, где заканчивается первый цвет (#121212)
  // 50% - это центр. balance * 50 смещает эту точку.
  // Максимальный сдвиг - 50% в одну или другую сторону (от 0% до 100%)
  const gradientPosition = 50 + (balance * 50); 

  document.body.style.background = `linear-gradient(to right, #121212 ${gradientPosition}%, #2c3e50)`;
}


function getColumnViews(columnName) {
  const images = document.querySelectorAll(`.image-column#${columnName}Column .thumbnail`);
  return Array.from(images).reduce((acc, img) => acc + (parseInt(img.dataset.views) || 0), 0);
}
