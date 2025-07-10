// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
// Firebase Storage больше не нужен для загрузки фото
// import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";


const firebaseConfig = {
    apiKey: "AIzaSyDIMvnTxfnpDr72fIIexWcO2Jl0_fqM7tw",
    authDomain: "ever-together.firebaseapp.com",
    databaseURL: "https://ever-together-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ever-together",
    storageBucket: "ever-together.appspot.com",
    messagingSenderId: "333503123875",
    appId: "1:333503123875:web:313a63c0d9f0093f05ca16"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth();
// Firebase

let imageList = [];
let currentIndex = 0; // Текущий индекс изображения в модальном окне

const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

// Загрузка кнопок
const uploadLeftButton = document.getElementById('uploadLeft');
const uploadCenterButton = document.getElementById('uploadCenter');
const uploadRightButton = document.getElementById('uploadRight');

// Модальное окно и его элементы
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const imageInfo = document.getElementById('imageInfo');
const closeModalButton = document.getElementById('closeModal');

// Новые элементы карусели
const modalImageCarousel = document.getElementById('modal-image-carousel');
const prevImageBtn = document.getElementById('prevImageBtn');
const nextImageBtn = document.getElementById('nextImageBtn');

// Элементы для комментариев и действий
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');

// Глобальные ссылки для обработчиков событий
const imageModalGlobalRef = document.getElementById('imageModal');
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');


// Функция для открытия модального окна
function openModal() {
    imageModal.classList.add('show-modal');
    document.body.style.overflow = 'hidden'; // Предотвращаем прокрутку фона
}

// Функция для закрытия модального окна
function closeModal() {
    imageModal.classList.remove('show-modal');
    document.body.style.overflow = ''; // Восстанавливаем прокрутку фона
}


// Обработчик кнопки закрытия модального окна
closeModalButton.addEventListener('click', closeModal);

// Обработчик клика вне модального окна для его закрытия
imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) {
        closeModal();
    }
});


// Обработчик событий клавиатуры (Escape для закрытия, стрелки для навигации)
document.addEventListener('keydown', (event) => {
    if (imageModal.classList.contains('show-modal')) {
        if (event.key === 'Escape') {
            closeModal();
        } else if (event.key === 'ArrowLeft') {
            navigateCarousel(-1);
        } else if (event.key === 'ArrowRight') {
            navigateCarousel(1);
        }
    }
});

// Добавляем обработчик для кнопки "..."
if (moreOptionsButtonGlobalRef && optionsDropdownGlobalRef) {
    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation(); // Остановить всплытие, чтобы не закрывать сразу
        optionsDropdownGlobalRef.classList.toggle('show');
    });

    // Закрываем выпадающий список при клике вне его
    document.addEventListener('click', (event) => {
        if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
            optionsDropdownGlobalRef.classList.remove('show');
        }
    });
}

// --- Функции для работы с Firebase ---
// Функция для получения данных пользователя
function getUserData(uid, callback) {
    const userRef = dbRef(database, `users/${uid}`);
    onValue(userRef, (snapshot) => {
        callback(snapshot.val());
    });
}

// Функция для загрузки изображений из Firebase
function loadImages() {
    const imagesRef = dbRef(database, 'images');
    onValue(imagesRef, (snapshot) => {
        const imagesData = snapshot.val();
        imageList = [];
        if (imagesData) {
            for (const key in imagesData) {
                imageList.push({ id: key, ...imagesData[key] });
            }
        }
        renderImages(imageList);
    });
}

// Функция для рендеринга изображений по колонкам
function renderImages(images) {
    leftColumn.innerHTML = '';
    centerColumn.innerHTML = '';
    rightColumn.innerHTML = '';

    images.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Сортируем по дате, новые сверху

    images.forEach((image) => {
        const imgElement = document.createElement('img');
        imgElement.src = image.url;
        imgElement.alt = image.description || 'Изображение';

        const imgInfoDiv = document.createElement('div');
        imgInfoDiv.classList.add('image-info');
        imgInfoDiv.innerHTML = `
            <span class="description">${image.description || 'Нет описания'}</span>
            <span class="date">${new Date(image.timestamp).toLocaleDateString()}</span>
        `;

        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-wrapper');
        imgWrapper.appendChild(imgElement);
        imgWrapper.appendChild(imgInfoDiv);

        imgWrapper.addEventListener('click', () => {
            openImageModal(image.id);
        });

        // Распределение по колонкам
        if (image.column === 'left') {
            leftColumn.appendChild(imgWrapper);
        } else if (image.column === 'center') {
            centerColumn.appendChild(imgWrapper);
        } else if (image.column === 'right') {
            rightColumn.appendChild(imgWrapper);
        }
    });
}

// Открытие модального окна с конкретным изображением
function openImageModal(imageId) {
    const imageIndex = imageList.findIndex(img => img.id === imageId);
    if (imageIndex !== -1) {
        currentIndex = imageIndex;
        updateCarouselImages(currentIndex);
        updateImageInfo(imageList[currentIndex]);
        loadComments(imageId);
        openModal();
    }
}

// Обновление изображений в карусели
function updateCarouselImages(index) {
    modalImageCarousel.innerHTML = ''; // Очищаем карусель

    // Добавляем предыдущее, текущее и следующее изображение
    const imagesToShow = [];
    if (index > 0) {
        imagesToShow.push({ ...imageList[index - 1], type: 'prev' });
    }
    imagesToShow.push({ ...imageList[index], type: 'current' });
    if (index < imageList.length - 1) {
        imagesToShow.push({ ...imageList[index + 1], type: 'next' });
    }

    imagesToShow.forEach(imgData => {
        const imgElement = document.createElement('img');
        imgElement.src = imgData.url;
        imgElement.alt = imgData.description || 'Изображение';
        imgElement.classList.add('carousel-image');
        if (imgData.type === 'current') {
            imgElement.id = 'modalImage'; // Текущее изображение будет иметь ID
        } else if (imgData.type === 'prev') {
            imgElement.id = 'prevImage';
        } else if (imgData.type === 'next') {
            imgElement.id = 'nextImage';
        }
        modalImageCarousel.appendChild(imgElement);
    });

    // Настраиваем смещение для центрирования текущего изображения
    const currentImageElement = document.getElementById('modalImage');
    if (currentImageElement) {
        // Вычисляем ширину каждого изображения + margin (40px = 20px с каждой стороны)
        const itemWidth = currentImageElement.offsetWidth + 40;
        // Смещаем карусель так, чтобы текущее изображение было по центру
        // -(index * itemWidth) перемещает текущее изображение к началу контейнера
        // + (modalImageCarousel.offsetWidth / 2) - (currentImageElement.offsetWidth / 2) центрирует его
        const translateXValue = (modalImageCarousel.offsetWidth / 2) - (itemWidth * index) - (currentImageElement.offsetWidth / 2);
        modalImageCarousel.style.transform = `translateX(${translateXValue}px)`;
    }
}


// Функция для навигации по карусели
function navigateCarousel(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < imageList.length) {
        currentIndex = newIndex;
        updateCarouselImages(currentIndex);
        updateImageInfo(imageList[currentIndex]);
        loadComments(imageList[currentIndex].id);
    }
}

// Обработчики кнопок навигации в модальном окне
if (prevImageBtn) {
    prevImageBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateCarousel(-1);
    });
}

if (nextImageBtn) {
    nextImageBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateCarousel(1);
    });
}

// Обновление информации об изображении
function updateImageInfo(image) {
    if (imageInfo) {
        imageInfo.innerHTML = `
            <p>${image.description || 'Нет описания'}</p>
            <p>${new Date(image.timestamp).toLocaleDateString()}</p>
        `;
    }
}

// --- Функции для комментариев ---
// Функция для загрузки комментариев
function loadComments(imageId) {
    const commentsRef = dbRef(database, `comments/${imageId}`);
    onValue(commentsRef, (snapshot) => {
        commentsList.innerHTML = ''; // Очищаем список комментариев
        const commentsData = snapshot.val();
        if (commentsData) {
            // Преобразуем объект комментариев в массив и сортируем по timestamp
            const commentsArray = Object.keys(commentsData).map(key => ({
                id: key,
                ...commentsData[key]
            })).sort((a, b) => a.timestamp - b.timestamp); // Старые сверху

            commentsArray.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.classList.add('comment-item');
                commentItem.innerHTML = `
                    <p class="comment-author">${comment.author}:</p>
                    <p class="comment-text">${comment.text}</p>
                `;
                commentsList.appendChild(commentItem);
            });
            commentsList.scrollTop = commentsList.scrollHeight; // Прокрутка вниз
        }
    });
}

// Функция для отправки комментария
if (sendCommentBtn) {
    sendCommentBtn.addEventListener('click', () => {
        const commentText = commentInput.value.trim();
        const currentImageId = imageList[currentIndex]?.id;

        if (commentText && currentImageId) {
            const commentsRef = dbRef(database, `comments/${currentImageId}`);
            const newCommentRef = push(commentsRef);
            set(newCommentRef, {
                author: auth.currentUser ? auth.currentUser.email : 'Аноним',
                text: commentText,
                timestamp: Date.now()
            }).then(() => {
                commentInput.value = ''; // Очищаем поле ввода
            }).catch((error) => {
                console.error("Ошибка при добавлении комментария:", error);
                alert("Не удалось добавить комментарий.");
            });
        }
    });
}

// --- Функции для действий с изображением (удалить, переместить) ---
if (optionsDropdownGlobalRef) {
    optionsDropdownGlobalRef.addEventListener('click', (event) => {
        event.preventDefault(); // Предотвращаем переход по ссылке
        const action = event.target.dataset.action;
        const targetColumn = event.target.dataset.column;
        const currentImage = imageList[currentIndex];

        if (!currentImage) return;

        if (action === 'delete') {
            if (confirm('Вы уверены, что хотите удалить это изображение?')) {
                const imageRef = dbRef(database, `images/${currentImage.id}`);
                remove(imageRef)
                    .then(() => {
                        console.log('Изображение удалено из Firebase');
                        closeModal();
                    })
                    .catch((error) => {
                        console.error('Ошибка при удалении изображения:', error);
                    });
            }
        } else if (action === 'move' && targetColumn) {
            const imageRef = dbRef(database, `images/${currentImage.id}`);
            update(imageRef, { column: targetColumn })
                .then(() => {
                    console.log(`Изображение перемещено в колонку ${targetColumn}`);
                    closeModal();
                })
                .catch((error) => {
                    console.error('Ошибка при перемещении изображения:', error);
                });
        }
    });
}


// --- Аутентификация ---
onAuthStateChanged(auth, (user) => {
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) { // Проверяем, существует ли элемент перед использованием
        if (user) {
            userNameSpan.textContent = user.email;
            loadImages(); // Загружаем изображения только после аутентификации
        } else {
            userNameSpan.textContent = 'Гость';
            // Если пользователь не аутентифицирован, можно перенаправить на страницу входа
            window.location.href = 'login.html';
        }
    }
});


// Обработчики загрузки файлов (имитация)
// В реальном приложении здесь будет логика загрузки файлов на сервер/Firebase Storage
const handleFileUpload = (column) => {
    // В данном примере мы просто имитируем добавление изображения в Firebase
    // В реальном приложении здесь будет вызов input type="file" и его обработка
    console.log(`Кнопка загрузки для колонки ${column} нажата.`);
    alert(`Загрузка файла для колонки ${column} (функция будет реализована позже)`);
    // Пример добавления нового изображения в базу данных
    // Это место, где вы бы вызывали логику Firebase Storage для загрузки файла,
    // а затем сохраняли URL в Realtime Database.
    // Для демонстрации:
    const newImageRef = push(dbRef(database, 'images'));
    set(newImageRef, {
        url: `https://via.placeholder.com/300x${Math.floor(Math.random() * 200) + 300}`, // Случайная высота
        description: `Новое фото в ${column}`,
        timestamp: Date.now(),
        column: column
    });
};

if (uploadLeftButton) uploadLeftButton.addEventListener('click', () => handleFileUpload('left'));
if (uploadCenterButton) uploadCenterButton.addEventListener('click', () => handleFileUpload('center'));
if (uploadRightButton) uploadRightButton.addEventListener('click', () => handleFileUpload('right'));


// --- Логика свайпа для карусели (touch events) ---
let startX = 0;
let currentTranslate = 0;
let isDragging = false;
let animationId;

function setTranslate(x) {
    modalImageCarousel.style.transform = `translateX(${x}px)`;
}

function touchStart(event) {
    startX = event.touches[0].clientX;
    isDragging = true;
    modalImageCarousel.style.transition = 'none'; // Отключаем переход при начале перетаскивания
    cancelAnimationFrame(animationId); // Отменяем текущую анимацию
}

function touchMove(event) {
    if (!isDragging) return;

    const currentX = event.touches[0].clientX;
    const diff = currentX - startX;
    // Ограничиваем движение, чтобы не прокручивать слишком далеко
    const maxScroll = modalImageCarousel.scrollWidth - modalImageCarousel.clientWidth;
    const newTranslate = currentTranslate + diff;

    // Включаем requestAnimationFrame для более плавной анимации
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(() => {
        setTranslate(newTranslate);
    });
}

function touchEnd(event) {
    isDragging = false;
    modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Включаем переход обратно

    const movedBy = event.changedTouches[0].clientX - startX; // Направление и дистанция свайпа

    if (movedBy > 50 && currentIndex > 0) { // Свайп вправо
        currentIndex--;
    } else if (movedBy < -50 && currentIndex < imageList.length - 1) { // Свайп влево
        currentIndex++;
    }
    // Обновляем карусель и информацию
    updateCarouselImages(currentIndex);
    updateImageInfo(imageList[currentIndex]);
    loadComments(imageList[currentIndex].id);
}

// Добавляем слушатели событий на карусель только если она существует
if (modalImageCarousel) {
    modalImageCarousel.addEventListener('touchstart', touchStart, { passive: true });
    modalImageCarousel.addEventListener('touchmove', touchMove, { passive: true });
    modalImageCarousel.addEventListener('touchend', touchEnd);
}

if(imageModalGlobalRef) {
    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            const isTargetComments = commentsList && (commentsList.contains(event.target) || event.target === commentsList);
            const isTargetCarousel = modalImageCarousel && (modalImageCarousel.contains(event.target) || event.target === modalImageCarousel);

            // Если это свайп по карусели и мы в режиме перетаскивания, позволяем ему работать
            if (isTargetCarousel && isDragging) {
                return;
            }
            // Если цель - список комментариев и он прокручивается, позволяем ему работать
            if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
                return;
            }
            // ***ВАЖНОЕ ИЗМЕНЕНИЕ***: Комментируем или удаляем эту строку, чтобы разрешить прокрутку модального окна
            // event.preventDefault();
        }
    }, { passive: false });
}
