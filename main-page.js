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
// Firebase Storage больше не используется для загрузки
// const storage = getStorage(app);


document.addEventListener('DOMContentLoaded', () => {
    // --- Все ссылки на DOM-элементы теперь гарантированно внутри DOMContentLoaded ---
    const imageModalGlobalRef = document.getElementById('imageModal');
    const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
    const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');

    const modalImageCarousel = document.querySelector('.modal-image-carousel');
    const prevImageButton = document.getElementById('prevImageButton');
    const nextImageButton = document.getElementById('nextImageButton');
    const modalImage = document.getElementById('modalImage');
    const imageInfoDiv = document.getElementById('imageInfo');

    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');

    const leftColumn = document.getElementById('leftColumn');
    const centerColumn = document.getElementById('centerColumn');
    const rightColumn = document.getElementById('rightColumn');

    // Кнопки загрузки, теперь без прямого fileInput
    const uploadLeftButton = document.getElementById('uploadLeft');
    const uploadCenterButton = document.getElementById('uploadCenter');
    const uploadRightButton = document.getElementById('uploadRight');

    const userNameSpan = document.getElementById('userName');

    // --- Конец ссылок на DOM-элементы ---


    let imageList = [];
    let currentIndex = 0;

    // --- НАСТРОЙКИ CLOUDINARY (из вашего кода) ---
    const CLOUDINARY_CLOUD_NAME = 'dozbf3jis';
    const CLOUDINARY_UPLOAD_PRESET = 'ever_together_upload';
    // --- КОНЕЦ НАСТРОЕК CLOUDINARY ---


    // --- Инициализация файлового ввода для пакетной загрузки (из вашего кода) ---
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true; // Разрешаем выбор нескольких файлов
    fileInput.style.display = 'none'; // Скрываем элемент input, так как будем вызывать его через кнопку
    document.body.appendChild(fileInput);

    // Обработчики для кнопок загрузки (перенаправляют на fileInput)
    const uploadButtons = document.querySelectorAll('.top-upload-buttons-container button'); // Селектор для ваших кнопок загрузки
    uploadButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const column = button.id.replace('upload', '').toLowerCase(); // Получаем column из id кнопки (e.g., 'uploadLeft' -> 'left')
            fileInput.dataset.column = column; // Сохраняем целевую колонку
            fileInput.click(); // Открываем диалог выбора файла
        });
    });

    // Обработчик изменения скрытого input[type="file"] для пакетной загрузки
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
                    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

                    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
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
                            timestamp: new Date().toISOString(), // Используем ISO String для консистентности
                            views: 0, // Начальное количество просмотров
                            column: selectedColumn,
                            uploadedBy: auth.currentUser ? auth.currentUser.uid : 'anonymous', // Добавлено, если пользователь есть
                            uploadedByName: auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.email) : 'Аноним'
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
            loadImages(); // Перезагружаем изображения после завершения пакетной загрузки
        }
    });

    // --- Firebase Auth Status Listener ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userNameSpan.textContent = user.displayName || user.email;
            loadImages();
        } else {
            userNameSpan.textContent = 'Гость';
            window.location.href = 'index.html';
        }
    });

    // --- Загрузка изображений из Firebase (URLы теперь приходят с Cloudinary) ---
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
                    // Преобразуем timestamp из ISO String обратно в число, если это необходимо для сортировки
                    if (typeof image.timestamp === 'string') {
                        image.timestamp = new Date(image.timestamp).getTime();
                    } else if (typeof image.timestamp === 'undefined' || image.timestamp === null) {
                        image.timestamp = Date.now(); // Fallback, если timestamp отсутствует
                    }
                    imageList.push(image);
                });
                imageList.sort((a, b) => b.timestamp - a.timestamp);

                imageList.forEach(image => {
                    displayImageInColumn(image);
                });
            }
        });
    }

    function displayImageInColumn(image) {
        const imgElement = document.createElement('img');
        imgElement.src = image.url; // URL теперь с Cloudinary
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

    // --- Новое: Закрытие модального окна по клику вне контента ---
    imageModalGlobalRef.addEventListener('click', (event) => {
        // Закрываем модальное окно, только если клик был непосредственно по его фону (не по контенту внутри)
        if (event.target === imageModalGlobalRef) {
            closeModal();
        }
    });

    function updateCarouselImages(index) {
        modalImage.src = imageList[index].url;
    }

    // --- Изменено: Убрана строка "Описание" ---
    function updateImageInfo(image) {
        imageInfoDiv.innerHTML = `
            <p><strong>Дата:</strong> ${new Date(image.timestamp).toLocaleString()}</p>
            <p><strong>Загрузил:</strong> ${image.uploadedByName || 'Неизвестно'}</p>
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
        event.stopPropagation();
        optionsDropdownGlobalRef.classList.toggle('show-dropdown');
    });

    document.addEventListener('click', (event) => {
        if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
            optionsDropdownGlobalRef.classList.remove('show-dropdown');
        }
    });

    // --- Функционал перемещения и удаления (уже был в предыдущей версии) ---
    optionsDropdownGlobalRef.addEventListener('click', (event) => {
        event.preventDefault();
        const action = event.target.dataset.action;
        const currentImage = imageList[currentIndex];
        const user = auth.currentUser;

        if (!currentImage || !user) return; // Проверка, что изображение выбрано и пользователь аутентифицирован

        // Проверяем, что только загрузивший пользователь может удалить или переместить фото
        if (currentImage.uploadedBy !== user.uid) {
            alert('Вы можете удалять или перемещать только те фотографии, которые загрузили сами.');
            return;
        }

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
            commentsList.innerHTML = '';
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
            commentInput.value = '';
            commentsList.scrollTop = commentsList.scrollHeight;
        })
        .catch(error => {
            console.error("Error adding comment:", error);
            alert("Ошибка при добавлении комментария.");
        });
    });


    // --- Функциональность касания/свайпа для карусели модального окна ---
    let startX;
    let currentTranslate;
    let isDragging = false;
    // Убедимся, что modalImageCarousel существует перед доступом к offsetWidth
    const carouselWidth = modalImageCarousel ? (modalImageCarousel.offsetWidth + 40) : 0; // Добавлено +40 для учета gap

    function setTranslate(xPos) {
        if(modalImageCarousel) {
            modalImageCarousel.style.transform = `translateX(${xPos}px)`;
        }
    }

    if(modalImageCarousel) {
        modalImageCarousel.addEventListener('touchstart', (event) => {
            if (event.touches.length === 1) {
                startX = event.touches[0].clientX;
                // Получаем текущее смещение, чтобы продолжить с него
                currentTranslate = getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0;
                isDragging = true;
                modalImageCarousel.style.transition = 'none'; // Отключаем переход для плавного перетаскивания
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
            modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Включаем переход обратно

            const finalTranslate = getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0;
            const movedBy = currentTranslate - finalTranslate; // Направление и дистанция свайпа

            if (movedBy > 50 && currentIndex < imageList.length - 1) { // Свайп влево
                currentIndex++;
            } else if (movedBy < -50 && currentIndex > 0) { // Свайп вправо
                currentIndex--;
            }
            // Обновляем карусель и информацию
            updateCarouselImages(currentIndex);
            updateImageInfo(imageList[currentIndex]);
            loadComments(imageList[currentIndex].id);
        });
    }

    if(imageModalGlobalRef) {
        imageModalGlobalRef.addEventListener('touchmove', (event) => {
            if (imageModalGlobalRef.classList.contains('show-modal')) {
                const isTargetComments = commentsList && (commentsList.contains(event.target) || event.target === commentsList);
                const isTargetCarousel = modalImageCarousel && (modalImageCarousel.contains(event.target) || event.target === modalImageCarousel);

                if (isTargetCarousel && isDragging) {
                    return; // Если это свайп по карусели и мы в режиме перетаскивания, позволяем ему работать
                }
                if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
                    return; // Если цель - список комментариев и он прокручивается, позволяем ему работать
                }
                event.preventDefault(); // В остальных случаях предотвращаем прокрутку фона
            }
        }, { passive: false });
    }

});
