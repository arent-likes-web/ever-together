// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

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
const storage = getStorage(app);

// === DOM Elements ===
const userNameSpan = document.getElementById('userName');
const uploadLeftBtn = document.getElementById('uploadLeft');
const uploadCenterBtn = document.getElementById('uploadCenter');
const uploadRightBtn = document.getElementById('uploadRight');
const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

// Modal Elements
const imageModal = document.getElementById('imageModal');
const closeModalBtn = document.querySelector('.close-button');
const modalImage = document.getElementById('modalImage');
const prevImage = document.getElementById('prevImage');
const nextImage = document.getElementById('nextImage');
const modalImageCarousel = document.getElementById('modalImageCarousel');
const prevImageButton = document.getElementById('prevImageButton');
const nextImageButton = document.getElementById('nextImageButton');
const imageInfo = document.getElementById('imageInfo');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');
const moreOptionsButton = document.getElementById('moreOptionsButton');
const optionsDropdown = document.getElementById('optionsDropdown');

// Global Variables for Modal and Carousel
let allImagesInCurrentColumn = [];
let currentImageIndex = 0;
let currentColumnRef = null; // Для отслеживания текущей колонки Firebase
let currentImageId = null; // Для отслеживания ID текущего изображения в модальном окне

// Dragging/Swiping variables
let isDragging = false;
let startPos = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationID = 0;
let carouselWidth = 0; // Будет динамически обновляться

// === Firebase Authentication ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        userNameSpan.textContent = user.email;
        setupDatabaseListeners();
    } else {
        userNameSpan.textContent = 'Гость';
        // Если пользователь не авторизован, можно перенаправить на страницу входа
        window.location.href = 'index.html';
    }
});

// === Image Upload Logic ===
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';

uploadLeftBtn.addEventListener('click', () => {
    fileInput.dataset.column = 'left';
    fileInput.click();
});

uploadCenterBtn.addEventListener('click', () => {
    fileInput.dataset.column = 'center';
    fileInput.click();
});

uploadRightBtn.addEventListener('click', () => {
    fileInput.dataset.column = 'right';
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const column = fileInput.dataset.column;
    if (file && column) {
        uploadImage(file, column);
    }
    fileInput.value = ''; // Сбросить input, чтобы можно было загрузить тот же файл снова
});

async function uploadImage(file, column) {
    if (!auth.currentUser) {
        alert('Пожалуйста, войдите, чтобы загружать изображения.');
        return;
    }

    const fileRef = storageRef(storage, `images/${column}/${auth.currentUser.uid}/${file.name}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            // Здесь можно обновить UI для прогресса загрузки
        },
        (error) => {
            console.error("Upload failed:", error);
            alert('Ошибка при загрузке изображения: ' + error.message);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                saveImageUrlToDatabase(downloadURL, column, auth.currentUser.uid);
            });
        }
    );
}

function saveImageUrlToDatabase(url, column, userId) {
    const imageId = push(dbRef(database, `users/${userId}/images/${column}`)).key;
    const imageData = {
        url: url,
        timestamp: Date.now(),
        description: "", // Пока пустое описание
        comments: {} // Пустой объект для комментариев
    };
    set(dbRef(database, `users/${userId}/images/${column}/${imageId}`), imageData)
        .then(() => {
            console.log("Image URL saved to database");
        })
        .catch((error) => {
            console.error("Failed to save image URL:", error);
        });
}

// === Database Listeners for Images ===
function setupDatabaseListeners() {
    const userId = auth.currentUser.uid;
    const columns = ['left', 'center', 'right'];

    columns.forEach(column => {
        const columnRef = dbRef(database, `users/${userId}/images/${column}`);
        onValue(columnRef, (snapshot) => {
            const imagesData = snapshot.val() || {};
            renderImages(imagesData, column);
        });
    });
}

function renderImages(imagesData, column) {
    const columnElement = document.getElementById(`${column}Column`);
    columnElement.innerHTML = ''; // Очищаем колонку перед рендерингом

    const sortedImages = Object.entries(imagesData)
        .sort(([, a], [, b]) => b.timestamp - a.timestamp); // Сортируем по убыванию даты

    sortedImages.forEach(([id, data]) => {
        const imageWrapper = createImageElement(data.url, id, column, data.description);
        columnElement.appendChild(imageWrapper);
    });
}

function createImageElement(imageUrl, imageId, column, description) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';
    imageWrapper.dataset.imageId = imageId;
    imageWrapper.dataset.column = column;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = description || 'Галерея изображений';
    img.loading = 'lazy'; // Оптимизация загрузки
    img.crossOrigin = "anonymous"; // Для работы с CORS, если изображение на другом домене

    img.onload = () => {
        img.classList.add('loaded'); // Добавляем класс после загрузки для анимации
    };

    img.onerror = () => {
        imageWrapper.classList.add('image-load-error'); // Добавляем класс ошибки
        img.alt = 'Ошибка загрузки изображения';
        img.src = ''; // Очищаем src, чтобы не пыталось загрузиться снова
        imageWrapper.innerHTML = `<p>Ошибка загрузки</p><p>(${img.alt})</p>`;
    };

    imageWrapper.appendChild(img);

    imageWrapper.addEventListener('click', () => {
        openModal(imageId, column);
    });

    return imageWrapper;
}

// === Modal Logic ===
function openModal(imageId, column) {
    if (!auth.currentUser) return;

    currentColumnRef = dbRef(database, `users/${auth.currentUser.uid}/images/${column}`);
    currentImageId = imageId;

    // Скрыть прокрутку на body
    document.body.style.overflow = 'hidden';

    onValue(currentColumnRef, (snapshot) => {
        const imagesData = snapshot.val() || {};
        allImagesInCurrentColumn = Object.entries(imagesData)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.timestamp - a.timestamp);

        currentImageIndex = allImagesInCurrentColumn.findIndex(img => img.id === currentImageId);
        if (currentImageIndex === -1) {
            // Изображение не найдено (возможно, удалено), закрываем модальное окно
            closeModal();
            return;
        }

        // Обновляем карусель и информацию
        updateCarouselImages(currentImageIndex);
        imageModal.classList.add('show-modal');
    }, {
        onlyOnce: true // Получаем данные один раз, чтобы не вызывать updateCarouselImages при каждом изменении в колонке
    });
}

function closeModal() {
    imageModal.classList.remove('show-modal');
    document.body.style.overflow = ''; // Восстановить прокрутку на body
    // Очистить данные модального окна при закрытии
    modalImage.src = '';
    prevImage.src = '';
    nextImage.src = '';
    imageInfo.textContent = '';
    commentsList.innerHTML = '';
    commentInput.value = '';
    optionsDropdown.style.display = 'none'; // Скрыть выпадающее меню
    isDragging = false; // Сброс состояния перетаскивания
    currentTranslate = 0; // Сброс смещения
    setTranslate(0); // Сброс transform
    modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Восстановить переход
}

// Update carousel images and position
function updateCarouselImages(index) {
    carouselWidth = modalImageCarousel.offsetWidth; // Получаем текущую ширину карусели

    currentImageIndex = index;

    // Убедимся, что индекс не выходит за границы
    if (currentImageIndex < 0) {
        currentImageIndex = allImagesInCurrentColumn.length - 1;
    } else if (currentImageIndex >= allImagesInCurrentColumn.length) {
        currentImageIndex = 0;
    }

    const currentImageData = allImagesInCurrentColumn[currentImageIndex];
    currentImageId = currentImageData.id; // Обновляем глобальный ID текущего изображения

    // Загрузка основного изображения
    modalImage.src = currentImageData.url;
    modalImage.alt = currentImageData.description || 'Изображение';
    modalImage.crossOrigin = "anonymous"; // Важно для CORS

    modalImage.onload = () => {
        modalImage.classList.add('loaded');
    };
    modalImage.onerror = () => {
        modalImage.classList.add('image-load-error');
        modalImage.alt = 'Ошибка загрузки изображения';
        modalImage.src = '';
    };

    // Загрузка предыдущего изображения
    if (allImagesInCurrentColumn.length > 1) {
        const prevIndex = (currentImageIndex - 1 + allImagesInCurrentColumn.length) % allImagesInCurrentColumn.length;
        prevImage.src = allImagesInCurrentColumn[prevIndex].url;
        prevImage.alt = allImagesInCurrentColumn[prevIndex].description || 'Предыдущее изображение';
        prevImage.crossOrigin = "anonymous";
        prevImage.onload = () => prevImage.classList.add('loaded');
        prevImage.onerror = () => { prevImage.src = ''; prevImage.alt = 'Ошибка загрузки'; };

        // Загрузка следующего изображения
        const nextIndex = (currentImageIndex + 1) % allImagesInCurrentColumn.length;
        nextImage.src = allImagesInCurrentColumn[nextIndex].url;
        nextImage.alt = allImagesInCurrentColumn[nextIndex].description || 'Следующее изображение';
        nextImage.crossOrigin = "anonymous";
        nextImage.onload = () => nextImage.classList.add('loaded');
        nextImage.onerror = () => { nextImage.src = ''; nextImage.alt = 'Ошибка загрузки'; };

        // Показываем кнопки навигации
        prevImageButton.style.display = 'flex';
        nextImageButton.style.display = 'flex';
    } else {
        // Если только одно изображение, скрываем соседние и кнопки
        prevImage.src = '';
        nextImage.src = '';
        prevImageButton.style.display = 'none';
        nextImageButton.style.display = 'none';
    }

    // Устанавливаем положение карусели так, чтобы текущее изображение было по центру
    currentTranslate = -carouselWidth;
    setTranslate(currentTranslate);

    imageInfo.textContent = currentImageData.description || 'Нет описания.';
    fetchCommentsForImage(currentImageData.id, allImagesInCurrentColumn[0].column); // Передаем column из данных
}

function fetchCommentsForImage(imageId, column) {
    commentsList.innerHTML = ''; // Очистить список комментариев
    if (!auth.currentUser || !imageId || !column) return;

    const commentsRef = dbRef(database, `users/${auth.currentUser.uid}/images/${column}/${imageId}/comments`);
    onValue(commentsRef, (snapshot) => {
        commentsList.innerHTML = ''; // Очистить список перед обновлением
        const comments = snapshot.val() || {};
        if (Object.keys(comments).length === 0) {
            commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев.</p>';
        } else {
            Object.values(comments).sort((a, b) => a.timestamp - b.timestamp).forEach(comment => {
                const p = document.createElement('p');
                const date = new Date(comment.timestamp).toLocaleString();
                p.textContent = `${comment.text} (${date})`;
                commentsList.appendChild(p);
            });
            commentsList.scrollTop = commentsList.scrollHeight; // Прокрутить к последнему комментарию
        }
    });
}

function sendComment() {
    const commentText = commentInput.value.trim();
    if (commentText === "" || !auth.currentUser || !currentImageId || !currentColumnRef) return;

    const commentData = {
        text: commentText,
        timestamp: Date.now()
    };

    const commentsRef = dbRef(database, `users/${auth.currentUser.uid}/images/${allImagesInCurrentColumn[0].column}/${currentImageId}/comments`);
    push(commentsRef, commentData)
        .then(() => {
            commentInput.value = '';
            commentsList.scrollTop = commentsList.scrollHeight; // Прокрутить к последнему комментарию
        })
        .catch((error) => {
            console.error("Failed to add comment:", error);
            alert("Не удалось отправить комментарий.");
        });
}

// === Event Listeners ===
closeModalBtn.addEventListener('click', closeModal);
sendCommentBtn.addEventListener('click', sendComment);

// Navigation buttons
prevImageButton.addEventListener('click', () => {
    updateCarouselImages(currentImageIndex - 1);
});

nextImageButton.addEventListener('click', () => {
    updateCarouselImages(currentImageIndex + 1);
});

// Dropdown for more options (delete, move)
moreOptionsButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Предотвращаем закрытие модального окна
    optionsDropdown.style.display = optionsDropdown.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', (event) => {
    if (!optionsDropdown.contains(event.target) && event.target !== moreOptionsButton) {
        optionsDropdown.style.display = 'none';
    }
});

optionsDropdown.addEventListener('click', (event) => {
    event.preventDefault();
    const action = event.target.dataset.action;
    const targetColumn = event.target.dataset.column;

    if (!currentImageId || !auth.currentUser || !currentColumnRef) {
        alert('Ошибка: изображение или пользователь не определены.');
        return;
    }

    const currentColumnName = allImagesInCurrentColumn[0].column; // Получаем имя текущей колонки

    if (action === 'delete') {
        if (confirm('Вы уверены, что хотите удалить это изображение?')) {
            deleteImage(currentImageId, currentColumnName);
        }
    } else if (action === 'move' && targetColumn) {
        if (currentColumnName === targetColumn) {
            alert('Изображение уже находится в этой колонке.');
            return;
        }
        moveImage(currentImageId, currentColumnName, targetColumn);
    }
    optionsDropdown.style.display = 'none';
});

async function deleteImage(imageId, column) {
    const userId = auth.currentUser.uid;
    const imageDbRef = dbRef(database, `users/${userId}/images/${column}/${imageId}`);
    const imageUrl = allImagesInCurrentColumn.find(img => img.id === imageId)?.url;

    if (imageUrl) {
        try {
            // Удаляем изображение из Storage
            const fileRef = storageRef(storage, imageUrl);
            await deleteObject(fileRef);
            console.log('Image deleted from storage.');
        } catch (error) {
            console.warn('Could not delete image from storage (might not exist or permissions issue):', error);
            // Продолжаем удаление из базы данных, даже если удаление из хранилища не удалось
        }
    }

    // Удаляем запись из Database
    remove(imageDbRef)
        .then(() => {
            console.log("Image data deleted from database.");
            closeModal(); // Закрываем модальное окно после удаления
            // Перезагрузка данных колонки будет вызвана слушателем onValue
        })
        .catch((error) => {
            console.error("Failed to delete image data:", error);
            alert("Ошибка при удалении изображения.");
        });
}

async function moveImage(imageId, fromColumn, toColumn) {
    const userId = auth.currentUser.uid;
    const fromImageRef = dbRef(database, `users/${userId}/images/${fromColumn}/${imageId}`);
    const toImagesRef = dbRef(database, `users/${userId}/images/${toColumn}`);

    try {
        // Получаем данные изображения из старой колонки
        const snapshot = await onValue(fromImageRef, (snap) => snap.val(), { onlyOnce: true });
        const imageData = snapshot.val();

        if (imageData) {
            // Добавляем изображение в новую колонку
            await set(push(toImagesRef), imageData);
            // Удаляем изображение из старой колонки
            await remove(fromImageRef);
            alert('Изображение успешно перемещено!');
            closeModal(); // Закрываем модальное окно после перемещения
        } else {
            alert('Изображение не найдено для перемещения.');
        }
    } catch (error) {
        console.error("Ошибка при перемещении изображения:", error);
        alert("Не удалось переместить изображение.");
    }
}

// === Carousel Dragging/Swiping Logic ===

// Обновление трансформации карусели
function setTranslate(translate) {
    modalImageCarousel.style.transform = `translateX(${translate}px)`;
}

// Запуск перетаскивания
function startDrag(event) {
    // Получаем текущую ширину карусели при начале перетаскивания
    carouselWidth = modalImageCarousel.offsetWidth;

    isDragging = true;
    modalImageCarousel.style.transition = 'none'; // Отключаем CSS-переход при перетаскивании

    if (event.type === 'touchstart') {
        startPos = event.touches[0].clientX;
    } else {
        startPos = event.clientX;
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mouseleave', endDrag); // На случай, если мышь ушла с элемента
    }
    prevTranslate = currentTranslate; // Сохраняем начальное смещение для расчета дельты
    animationID = requestAnimationFrame(animation);
}

// Перетаскивание
function drag(event) {
    if (!isDragging) return;

    let currentPosition = 0;
    if (event.type === 'touchmove') {
        currentPosition = event.touches[0].clientX;
    } else {
        currentPosition = event.clientX;
    }

    const deltaX = currentPosition - startPos;
    currentTranslate = prevTranslate + deltaX;

    setTranslate(currentTranslate);
}

// Окончание перетаскивания
function endDrag() {
    cancelAnimationFrame(animationID);
    isDragging = false;
    modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Включаем CSS-переход обратно

    const movedBy = currentTranslate - prevTranslate; // На сколько пикселей сдвинули

    // Логика "прилипания" к ближайшему изображению
    snapToImage(movedBy);

    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('mouseleave', endDrag);
}

// Функция для "прилипания" к изображению после свайпа/перетаскивания
function snapToImage(movedBy) {
    if (movedBy < -50) { // Свайп влево (к следующему изображению)
        updateCarouselImages(currentImageIndex + 1);
    } else if (movedBy > 50) { // Свайп вправо (к предыдущему изображению)
        updateCarouselImages(currentImageIndex - 1);
    } else {
        // Если сдвиг небольшой, возвращаемся к текущему изображению
        setTranslate(-carouselWidth);
    }
}


// Анимация для плавного перетаскивания
function animation() {
    setTranslate(currentTranslate);
    if (isDragging) {
        requestAnimationFrame(animation);
    }
}

// Event Listeners for carousel dragging
modalImageCarousel.addEventListener('mousedown', startDrag);
modalImageCarousel.addEventListener('mouseup', endDrag); // Добавил сюда, чтобы перехватывать отпускание мыши внутри карусели
modalImageCarousel.addEventListener('mouseleave', endDrag); // Добавил сюда для ухода мыши из карусели во время драга
modalImageCarousel.addEventListener('mousemove', drag);

modalImageCarousel.addEventListener('touchstart', startDrag, { passive: true }); // passive: true для лучшей производительности
modalImageCarousel.addEventListener('touchend', endDrag);
modalImageCarousel.addEventListener('touchmove', drag, { passive: true }); // passive: true для лучшей производительности


// Обработчик touchmove на imageModal (фоне модального окна)
// Это нужно, чтобы предотвратить прокрутку основного body, но позволить свайп карусели и скролл комментариев
imageModal.addEventListener('touchmove', (event) => {
    if (imageModal.classList.contains('show-modal')) {
        const isTargetComments = commentsList.contains(event.target) || event.target === commentsList;
        const isTargetCarousel = modalImageCarousel.contains(event.target) || event.target === modalImageCarousel || prevImageButton.contains(event.target) || nextImageButton.contains(event.target);

        // Если это свайп по карусели или кнопкам навигации
        if (isTargetCarousel && isDragging) {
            return; // Позволяем drag-логике карусели обрабатывать это
        }
        // Если цель - список комментариев и он прокручивается
        if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
            return; // Позволяем прокрутку списка комментариев
        }
        // В остальных случаях предотвращаем прокрутку фона
        event.preventDefault();
    }
}, { passive: false }); // passive: false, чтобы можно было использовать preventDefault


// Обновление ширины карусели при изменении размера окна
window.addEventListener('resize', () => {
    if (imageModal.classList.contains('show-modal')) {
        carouselWidth = modalImageCarousel.offsetWidth;
        setTranslate(-carouselWidth); // Центрируем изображение
    }
});
