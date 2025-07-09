// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";


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


// Убедитесь, что DOM полностью загружен, прежде чем получать доступ к элементам
document.addEventListener('DOMContentLoaded', () => {
    const imageModalGlobalRef = document.getElementById('imageModal');
    const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
    const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');

    // Новые ссылки на элементы карусели
    const modalImageCarousel = document.querySelector('.modal-image-carousel');
    const prevImageButton = document.getElementById('prevImage');
    const nextImageButton = document.getElementById('nextImage');
    const modalImage = document.getElementById('modalImage');
    const imageInfoDiv = document.getElementById('imageInfo');

    // Ссылки на секцию комментариев
    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');

    // Ссылки на колонки и кнопки загрузки
    const leftColumn = document.getElementById('leftColumn');
    const centerColumn = document.getElementById('centerColumn');
    const rightColumn = document.getElementById('rightColumn');

    const uploadLeftButton = document.getElementById('uploadLeft');
    const uploadCenterButton = document.getElementById('uploadCenter');
    const uploadRightButton = document.getElementById('uploadRight');

    let imageList = [];
    let currentIndex = 0;
    let currentColumn = 'left'; // По умолчанию 'left' или определяется по контексту

    // --- Firebase Auth Status Listener ---
    onAuthStateChanged(auth, (user) => {
        const userNameSpan = document.getElementById('userName');
        if (user) {
            userNameSpan.textContent = user.displayName || user.email;
            // Загружаем изображения после аутентификации пользователя
            loadImages();
        } else {
            userNameSpan.textContent = 'Гость';
            // Перенаправление на страницу входа или отображение соответствующего контента для гостей
            window.location.href = 'index.html';
        }
    });

    // --- Загрузка изображений из Firebase ---
    function loadImages() {
        onValue(dbRef(database, 'images'), (snapshot) => {
            const images = snapshot.val();
            imageList = [];
            leftColumn.innerHTML = '';
            centerColumn.innerHTML = '';
            rightColumn.innerHTML = '';

            if (images) {
                Object.keys(images).forEach(key => {
                    const image = { id: key, ...images[key] };
                    imageList.push(image);
                });
                // Сортировка изображений по timestamp в убывающем порядке (новые сверху)
                imageList.sort((a, b) => b.timestamp - a.timestamp);

                // Теперь отображаем отсортированные изображения
                imageList.forEach(image => {
                    displayImageInColumn(image);
                });
            }
        });
    }

    function displayImageInColumn(image) {
        const imgElement = document.createElement('img');
        imgElement.src = image.url;
        imgElement.alt = image.description || 'Gallery image';
        imgElement.dataset.id = image.id;
        imgElement.classList.add('gallery-image');

        imgElement.addEventListener('click', () => {
            openModal(image.id);
        });

        if (image.column === 'left') {
            leftColumn.appendChild(imgElement);
        } else if (image.column === 'center') {
            centerColumn.appendChild(imgElement);
        } else if (image.column === 'right') {
            rightColumn.appendChild(imgElement);
        }
    }


    // --- Логика модального окна ---
    function openModal(imageId) {
        currentIndex = imageList.findIndex(image => image.id === imageId);
        if (currentIndex === -1) return;

        updateCarouselImages(currentIndex);
        updateImageInfo(imageList[currentIndex]);
        loadComments(imageId);
        imageModalGlobalRef.classList.add('show-modal');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        imageModalGlobalRef.classList.remove('show-modal');
        document.body.style.overflow = '';
    }

    function updateCarouselImages(index) {
        modalImage.src = imageList[index].url;
        // Обновление источников предыдущего/следующего изображений для визуального эффекта карусели, если необходимо
        // Для простого отображения достаточно обновить modalImage.src.
        // Если реализована реальная логика карусели, убедитесь, что она здесь.
    }

    function updateImageInfo(image) {
        imageInfoDiv.innerHTML = `
            <p><strong>Описание:</strong> ${image.description || 'Нет описания'}</p>
            <p><strong>Дата:</strong> ${new Date(image.timestamp).toLocaleString()}</p>
        `;
    }

    // --- Навигация по карусели ---
    prevImageButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            currentIndex--;
            updateCarouselImages(currentIndex);
            updateImageInfo(imageList[currentIndex]);
            loadComments(imageList[currentIndex].id);
        }
    });

    nextImageButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex < imageList.length - 1) {
            currentIndex++;
            updateCarouselImages(currentIndex);
            updateImageInfo(imageList[currentIndex]);
            loadComments(imageList[currentIndex].id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!imageModalGlobalRef.classList.contains('show-modal')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            updateCarouselImages(currentIndex);
            updateImageInfo(imageList[currentIndex]);
            loadComments(imageList[currentIndex].id);
        }
        if (e.key === 'ArrowRight' && currentIndex < imageList.length - 1) {
            currentIndex++;
            updateCarouselImages(currentIndex);
            updateImageInfo(imageList[currentIndex]);
            loadComments(imageList[currentIndex].id);
        }
    });

    // --- Выпадающее меню для дополнительных опций ---
    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation(); // Предотвращает закрытие модального окна при клике на кнопку
        optionsDropdownGlobalRef.classList.toggle('show-dropdown');
    });

    document.addEventListener('click', (event) => {
        if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
            optionsDropdownGlobalRef.classList.remove('show-dropdown');
        }
    });

    optionsDropdownGlobalRef.addEventListener('click', (event) => {
        event.preventDefault();
        const action = event.target.dataset.action;
        const currentImage = imageList[currentIndex];

        if (!currentImage) return;

        if (action === 'delete') {
            if (confirm('Вы уверены, что хотите удалить это изображение?')) {
                deleteImage(currentImage.id);
            }
        } else if (action && action.startsWith('move')) {
            const newColumn = event.target.dataset.column;
            moveImage(currentImage.id, newColumn);
        }
        optionsDropdownGlobalRef.classList.remove('show-dropdown');
    });

    // --- Функции манипуляции изображениями (Удалить/Переместить) ---
    function deleteImage(imageId) {
        remove(dbRef(database, `images/${imageId}`))
            .then(() => {
                console.log('Image deleted successfully!');
                closeModal();
            })
            .catch(error => {
                console.error('Error deleting image:', error);
                alert('Ошибка при удалении изображения.');
            });
    }

    function moveImage(imageId, newColumn) {
        update(dbRef(database, `images/${imageId}`), { column: newColumn })
            .then(() => {
                console.log(`Image moved to ${newColumn} column.`);
                // Не нужно закрывать модальное окно, просто обновите отображение
            })
            .catch(error => {
                console.error('Error moving image:', error);
                alert('Ошибка при перемещении изображения.');
            });
    }

    // --- Логика раздела комментариев ---
    function loadComments(imageId) {
        const commentsRef = dbRef(database, `images/${imageId}/comments`);
        onValue(commentsRef, (snapshot) => {
            commentsList.innerHTML = ''; // Очищаем существующие комментарии
            const comments = snapshot.val();
            if (comments) {
                Object.values(comments).forEach(comment => {
                    const commentElement = document.createElement('div');
                    commentElement.classList.add('comment-item');
                    commentElement.innerHTML = `<strong>${comment.author}:</strong> ${comment.text}`;
                    commentsList.appendChild(commentElement);
                });
            }
        });
    }

    sendCommentBtn.addEventListener('click', () => {
        const commentText = commentInput.value.trim();
        if (commentText === '') return;

        const currentImage = imageList[currentIndex];
        if (!currentImage) return;

        const newCommentRef = push(dbRef(database, `images/${currentImage.id}/comments`));
        set(newCommentRef, {
            author: auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.email) : 'Аноним',
            text: commentText,
            timestamp: Date.now()
        })
        .then(() => {
            commentInput.value = ''; // Очищаем поле ввода
            commentsList.scrollTop = commentsList.scrollHeight; // Прокручиваем до конца
        })
        .catch(error => {
            console.error("Error adding comment:", error);
            alert("Ошибка при добавлении комментария.");
        });
    });

    // --- Кнопки загрузки изображений (Заглушка - фактическая логика загрузки может быть сложнее) ---
    // Предполагается, что эти кнопки запускают механизм загрузки, не обрабатываемый напрямую здесь.
    // Фактический ввод файла и загрузка в хранилище обычно более сложны.
    uploadLeftButton.addEventListener('click', () => {
        currentColumn = 'left';
        // Запуск файлового ввода или диалога загрузки
        alert('Загрузка в Him peach (реализация загрузки файла не показана в этом фрагменте)');
    });

    uploadCenterButton.addEventListener('click', () => {
        currentColumn = 'center';
        alert('Загрузка в Our dreams (реализация загрузки файла не показана в этом фрагменте)');
    });

    uploadRightButton.addEventListener('click', () => {
        currentColumn = 'right';
        alert('Загрузка в Her cat (реализация загрузки файла не показана в этом фрагменте)');
    });

    // --- Функциональность касания/свайпа для карусели модального окна ---
    let startX;
    let currentTranslate;
    let isDragging = false;
    const carouselWidth = modalImageCarousel.offsetWidth + 40; // ширина + gap (предполагая 40px gap)

    function setTranslate(xPos) {
        modalImageCarousel.style.transform = `translateX(${xPos}px)`;
    }

    modalImageCarousel.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            startX = event.touches[0].clientX;
            currentTranslate = getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0;
            isDragging = true;
            modalImageCarousel.style.transition = 'none'; // Отключаем переход во время перетаскивания
        }
    });

    modalImageCarousel.addEventListener('touchmove', (event) => {
        if (!isDragging || event.touches.length !== 1) return;
        const currentX = event.touches[0].clientX;
        const diffX = currentX - startX;
        setTranslate(currentTranslate + diffX);
    });

    modalImageCarousel.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Снова включаем переход

        const movedBy = currentTranslate - (getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0);

        if (movedBy < -50 && currentIndex < imageList.length - 1) { // Свайп влево
            currentIndex++;
        } else if (movedBy > 50 && currentIndex > 0) { // Свайп вправо
            currentIndex--;
        }

        updateCarouselImages(currentIndex);
        updateImageInfo(imageList[currentIndex]);
        loadComments(imageList[currentIndex].id);
    });

    // Обработчик touchmove на imageModalGlobalRef (фоне модального окна)
    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            const isTargetComments = commentsList.contains(event.target) || event.target === commentsList;
            const isTargetCarousel = modalImageCarousel.contains(event.target) || event.target === modalImageCarousel;

            // Если это свайп по карусели и мы в режиме перетаскивания, позволяем ему работать
            if (isTargetCarousel && isDragging) {
                return;
            }
            // Если цель - список комментариев и он прокручивается, позволяем ему работать
            if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
                return;
            }
            // В остальных случаях предотвращаем прокрутку фона
            event.preventDefault();
        }
    }, { passive: false });

});
