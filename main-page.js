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

const imageModalGlobalRef = document.getElementById('imageModal');
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');

// Новые ссылки на элементы карусели
const modalImageCarousel = document.querySelector('.modal-image-carousel');
const prevImageElement = document.getElementById('prevImage');
const modalImageElement = document.getElementById('modalImage'); // Текущее изображение
const nextImageElement = document.getElementById('nextImage');

const imageContainerGlobalRef = document.querySelector('.image-container');
const imageInfo = document.getElementById('imageInfo');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');

const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

let currentImageWrapper = null;
let currentImageId = null;
let allImagesInCurrentColumn = []; // Массив всех изображений в текущей колонке
let currentImageIndex = -1; // Индекс текущего изображения в allImagesInCurrentColumn

// --- Переменные для свайпа ---
let startX = 0;
let isDragging = false;
let currentTranslate = -modalImageCarousel.offsetWidth; // Начальное смещение для центрирования modalImageElement
let prevTranslate = 0; // Сохраняем предыдущее смещение для расчета сдвига


document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        const isAuthPage = window.location.pathname.includes("entry.html") ||
                               window.location.pathname.includes("registration.html");

        if (user) {
            window.currentUser = user.email;
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) {
                userNameSpan.textContent = user.email.split('@')[0];
            }

            if (isAuthPage) {
                window.location.href = "main-page.html";
            } else {
                loadImagesFromFirebase();
            }
        } else {
            if (!isAuthPage) {
                window.location.href = "entry.html";
            }
        }
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const uploadButtons = document.querySelectorAll('.top-upload-buttons-container button[id^="upload"]');
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

            for (const file of files) {
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
                        }
                        alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorDetails}. Проверьте консоль.`);
                        continue;
                    }

                    const cloudinaryData = await cloudinaryResponse.json();

                    if (cloudinaryData.secure_url) {
                        const newImageRef = push(dbRef(database, 'images'));
                        await set(newImageRef, {
                            url: cloudinaryData.secure_url,
                            timestamp: new Date().toISOString(),
                            column: selectedColumn
                        });
                    } else {
                        const errorMsg = cloudinaryData.error && cloudinaryData.error.message ? cloudinaryData.error.message : "URL не получен от Cloudinary.";
                        alert(`Ошибка при загрузке файла ${file.name} в Cloudinary: ${errorMsg}.`);
                    }
                } catch (error) {
                    alert(`Произошла ошибка при загрузке файла ${file.name}: ${error.message}. Проверьте консоль.`);
                }
            }
            event.target.value = null;
        }
    });

    function loadImagesFromFirebase() {
        const imagesRef = dbRef(database, 'images');

        onValue(imagesRef, (snapshot) => {
            const data = snapshot.val();
            
            leftColumn.innerHTML = '';
            centerColumn.innerHTML = '';
            rightColumn.innerHTML = '';

            if (data) {
                const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                
                imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                const fragments = {
                    left: document.createDocumentFragment(),
                    center: document.createDocumentFragment(),
                    right: document.createDocumentFragment()
                };

                imageArray.forEach((imgData) => {
                    const targetColumnName = imgData.column;
                    const imageWrapper = createImageElement(imgData, imgData.id);
                    if (fragments[targetColumnName]) {
                        fragments[targetColumnName].appendChild(imageWrapper);
                    } else {
                        // Если столбец не найден (возможно, устаревшие данные), добавим в левую колонку по умолчанию
                        fragments.left.appendChild(imageWrapper);
                    }
                });
                
                leftColumn.appendChild(fragments.left);
                centerColumn.appendChild(fragments.center);
                rightColumn.appendChild(fragments.right);
                
            } else {
                // console.log("No images found in Firebase.");
            }
        }, (error) => {
            alert("Ошибка загрузки данных из базы данных. Проверьте консоль разработчика.");
            console.error("Firebase load error:", error);
        });
    }

    function createImageElement(imageData, imageId) {
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.dataset.timestamp = imageData.timestamp;
        imageWrapper.dataset.id = imageId;
        imageWrapper.dataset.columnOrigin = imageData.column;

        const img = document.createElement('img');
        img.src = imageData.url;
        img.classList.add('thumbnail');
        img.alt = 'Gallery Image';
        img.loading = 'lazy';
        img.setAttribute('crossorigin', 'anonymous');

        img.onload = () => {
            img.classList.add('loaded');
        };

        img.onerror = (e) => {
            imageWrapper.classList.add('image-load-error');
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
            if (event.target === imageWrapper || event.target === img) {
                openModal(imageWrapper);
            }
        });

        imageWrapper.appendChild(img);
        return imageWrapper;
    }

    function openModal(imageWrapper) {
        if (!imageWrapper) {
            return;
        }
        currentImageWrapper = imageWrapper;
        currentImageId = imageWrapper.dataset.id;
        const currentColumn = imageWrapper.dataset.columnOrigin;

        // Заполняем allImagesInCurrentColumn и currentImageIndex
        allImagesInCurrentColumn = Array.from(document.getElementById(`${currentColumn}Column`).querySelectorAll('.image-wrapper'))
                                        .sort((a, b) => new Date(b.dataset.timestamp) - new Date(a.dataset.timestamp));
        currentImageIndex = allImagesInCurrentColumn.findIndex(wrapper => wrapper.dataset.id === currentImageId);

        if (!imageModalGlobalRef || !modalImageCarousel || !prevImageElement || !modalImageElement || !nextImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo || !commentsList || !commentInput || !sendCommentBtn) {
            console.error("One or more modal elements are missing.");
            return;
        }

        // При открытии модала, убедимся, что карусель в исходном состоянии (показывает центральное изображение)
        currentTranslate = -modalImageCarousel.offsetWidth; // Устанавливаем смещение для центрирования
        modalImageCarousel.style.transform = `translateX(${currentTranslate}px)`;
        modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Убедимся, что transition включен

        imageModalGlobalRef.classList.add('show-modal');
        optionsDropdownGlobalRef.style.display = 'none';

        // Загружаем текущее и соседние изображения
        updateCarouselImages(currentImageIndex);
        
        imageInfo.innerHTML = '';
        commentsList.innerHTML = '';
        commentInput.value = '';

        loadCommentsForImage(currentImageId);

        // Блокируем прокрутку body, если модальное окно открыто
        document.body.style.overflow = 'hidden'; 
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'none';
        }
    }

    // Обновляет src изображений в карусели
    function updateCarouselImages(index) {
        // Убедимся, что prevImageElement и nextImageElement пустые, если нет предыдущего/следующего
        prevImageElement.src = '';
        nextImageElement.src = '';

        // Текущее изображение
        const currentImgData = allImagesInCurrentColumn[index];
        if (currentImgData) {
            modalImageElement.src = currentImgData.querySelector('img').src;
            modalImageElement.dataset.id = currentImgData.dataset.id;
            modalImageElement.setAttribute('crossorigin', 'anonymous');
            currentImageId = currentImgData.dataset.id; // Обновляем global currentImageId
        } else {
            modalImageElement.src = '';
            modalImageElement.dataset.id = '';
            currentImageId = null;
        }

        // Предыдущее изображение
        if (index > 0) {
            const prevImgData = allImagesInCurrentColumn[index - 1];
            prevImageElement.src = prevImgData.querySelector('img').src;
            prevImageElement.setAttribute('crossorigin', 'anonymous');
        }

        // Следующее изображение
        if (index < allImagesInCurrentColumn.length - 1) {
            const nextImgData = allImagesInCurrentColumn[index + 1];
            nextImageElement.src = nextImgData.querySelector('img').src;
            nextImageElement.setAttribute('crossorigin', 'anonymous');
        }

        loadCommentsForImage(currentImageId); // Обновляем комментарии для нового текущего изображения
    }

    // --- Функции для свайпа ---
    function setTranslate(xPos) {
        modalImageCarousel.style.transform = `translateX(${xPos}px)`;
    }

    function touchStart(event) {
        if (optionsDropdownGlobalRef.style.display === 'block') { 
            // Если дропдаун открыт, игнорируем свайп на карусели
            return;
        }
        isDragging = true;
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        modalImageCarousel.classList.add('dragging');
        modalImageCarousel.style.transition = 'none'; // Отключаем transition во время перетаскивания
        // prevTranslate теперь должен быть текущим translate X карусели
        const style = window.getComputedStyle(modalImageCarousel);
        const matrix = new DOMMatrixReadOnly(style.transform);
        prevTranslate = matrix.m41; 
    }

    function touchMove(event) {
        if (!isDragging) return;

        const currentPosition = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        currentTranslate = prevTranslate + currentPosition - startX;
        setTranslate(currentTranslate);
    }

    function touchEnd() {
        isDragging = false;
        modalImageCarousel.classList.remove('dragging');

        const movedBy = currentTranslate - prevTranslate; // Насколько сильно сдвинули от начальной точки перетаскивания
        const threshold = modalImageCarousel.offsetWidth / 4; // Порог для переключения изображения (25% ширины)

        let targetIndex = currentImageIndex; // Предполагаем, что изображение не поменяется
        let newTranslateOffset = 0; // Насколько нужно сместить карусель относительно -100%

        // Проверяем, куда свайпнули
        if (movedBy < -threshold) { // Свайп влево (к следующему изображению)
            if (currentImageIndex < allImagesInCurrentColumn.length - 1) {
                targetIndex = currentImageIndex + 1;
                newTranslateOffset = -modalImageCarousel.offsetWidth; // Перемещаем карусель на одно изображение влево
            }
        } else if (movedBy > threshold) { // Свайп вправо (к предыдущему изображению)
            if (currentImageIndex > 0) {
                targetIndex = currentImageIndex - 1;
                newTranslateOffset = modalImageCarousel.offsetWidth; // Перемещаем карусель на одно изображение вправо
            }
        }

        // Если изображение меняется
        if (targetIndex !== currentImageIndex) {
            currentImageIndex = targetIndex;
            // Устанавливаем конечное положение для анимации
            setTranslate(currentTranslate + newTranslateOffset); // Двигаем на новое положение с учетом свайпа
            modalImageCarousel.style.transition = 'transform 0.3s ease-out';

            // Ждем завершения анимации, затем сбрасываем положение карусели и обновляем изображения
            modalImageCarousel.addEventListener('transitionend', function handler() {
                modalImageCarousel.removeEventListener('transitionend', handler);
                currentTranslate = -modalImageCarousel.offsetWidth; // Сброс на центрированное положение
                setTranslate(currentTranslate);
                modalImageCarousel.style.transition = 'none'; // Отключаем transition для мгновенного сброса
                updateCarouselImages(currentImageIndex); // Обновляем src изображений
                modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Включаем обратно
            }, { once: true });
        } else {
            // Если свайп недостаточен, возвращаемся на текущее изображение
            currentTranslate = -modalImageCarousel.offsetWidth; // Возвращаем в центральное положение
            setTranslate(currentTranslate);
            modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Плавное возвращение
        }
    }

    // Добавляем слушателей событий для свайпа к modalImageCarousel
    modalImageCarousel.addEventListener('touchstart', touchStart);
    modalImageCarousel.addEventListener('touchmove', touchMove);
    modalImageCarousel.addEventListener('touchend', touchEnd);

    // Для десктопа:
    modalImageCarousel.addEventListener('mousedown', touchStart);
    modalImageCarousel.addEventListener('mousemove', touchMove);
    modalImageCarousel.addEventListener('mouseup', touchEnd);
    modalImageCarousel.addEventListener('mouseleave', () => { 
        if (isDragging) {
            touchEnd();
        }
    });

    function loadCommentsForImage(imageId) {
        if (!imageId) {
            commentsList.innerHTML = '';
            return;
        }

        const commentsRef = dbRef(database, `images/${imageId}/comments`);
        onValue(commentsRef, (snapshot) => {
            const commentsData = snapshot.val();
            commentsList.innerHTML = '';

            if (commentsData) {
                const commentArray = Object.keys(commentsData).map(key => ({ id: key, ...commentsData[key] }));
                commentArray.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                commentArray.forEach(comment => {
                    const commentElement = document.createElement('p');
                    const authorSpan = document.createElement('span');
                    authorSpan.classList.add('comment-author');
                    authorSpan.textContent = `${comment.author.split('@')[0]}: `;

                    const textSpan = document.createElement('span');
                    textSpan.classList.add('comment-text');
                    textSpan.textContent = comment.text;

                    const dateSpan = document.createElement('span');
                    dateSpan.classList.add('comment-date');
                    const date = new Date(comment.timestamp);
                    dateSpan.textContent = date.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    commentElement.appendChild(authorSpan);
                    commentElement.appendChild(textSpan);
                    commentElement.appendChild(dateSpan);
                    commentsList.appendChild(commentElement);
                });
                commentsList.scrollTop = commentsList.scrollHeight;
            }
        }, (error) => {
            console.error("Ошибка загрузки комментариев:", error);
        });
    }

    sendCommentBtn.addEventListener('click', async () => {
        const commentText = commentInput.value.trim();
        if (commentText === '' || !currentImageId || !window.currentUser) {
            return;
        }

        try {
            const newCommentRef = push(dbRef(database, `images/${currentImageId}/comments`));
            await set(newCommentRef, {
                author: window.currentUser,
                text: commentText,
                timestamp: new Date().toISOString()
            });
            commentInput.value = '';
        } catch (error) {
            console.error("Ошибка при добавлении комментария:", error);
            alert("Не удалось добавить комментарий. Попробуйте снова.");
        }
    });

    commentInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendCommentBtn.click();
        }
    });


    function toggleOptionsDropdown() {
        if (!currentImageWrapper) {
            return;
        }

        document.querySelectorAll('.options-dropdown').forEach(d => {
            if (d !== optionsDropdownGlobalRef) {
                d.style.display = 'none';
                d.classList.remove('show');
            }
        });

        if (optionsDropdownGlobalRef.style.display === 'block') {
            optionsDropdownGlobalRef.style.display = 'none';
            optionsDropdownGlobalRef.classList.remove('show');
            return;
        }

        optionsDropdownGlobalRef.innerHTML = '';

        const currentColumnId = currentImageWrapper.dataset.columnOrigin;

        const columns = [
            { id: 'left', name: 'Him peach' },
            { id: 'center', name: 'Our dreams' },
            { id: 'right', name: 'Her cat' }
        ];

        columns.forEach(col => {
            if (col.id !== currentColumnId) {
                const moveLink = document.createElement('a');
                moveLink.href = '#';
                moveLink.textContent = `Переместить в ${col.name}`;
                moveLink.dataset.action = 'move';
                moveLink.dataset.column = col.id;
                moveLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    moveImage(currentImageWrapper.dataset.id, col.id);
                    optionsDropdownGlobalRef.style.display = 'none';
                    closeModal();
                });
                optionsDropdownGlobalRef.appendChild(moveLink);
            }
        });

        const deleteLink = document.createElement('a');
        deleteLink.href = '#';
        deleteLink.textContent = 'Удалить';
        deleteLink.dataset.action = 'delete';
        deleteLink.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (confirm('Вы уверены, что хотите удалить это изображение?')) {
                deleteImage(currentImageWrapper.dataset.id);
                optionsDropdownGlobalRef.style.display = 'none';
                closeModal();
            }
        });
        optionsDropdownGlobalRef.appendChild(deleteLink);

        optionsDropdownGlobalRef.style.display = 'block';
        optionsDropdownGlobalRef.classList.add('show');
    }

    function moveImage(imageId, targetColumnId) {
        update(dbRef(database, `images/${imageId}`), { column: targetColumnId })
            .then(() => {
                // console.log("Изображение перемещено успешно!");
            })
            .catch(error => {
                console.error("Ошибка при перемещении изображения:", error);
                alert("Не удалось переместить изображение.");
            });
    }

    function deleteImage(imageId) {
        remove(dbRef(database, `images/${imageId}`))
            .then(() => {
                // console.log("Изображение удалено успешно!");
            })
            .catch(error => {
                console.error("Ошибка при удалении изображения:", error);
                alert("Не удалось удалить изображение.");
            });
    }

    function closeModal() {
        if (imageModalGlobalRef) {
            imageModalGlobalRef.classList.remove('show-modal');
        }
        if (optionsDropdownGlobalRef) {
            optionsDropdownGlobalRef.style.display = 'none';
            optionsDropdownGlobalRef.classList.remove('show');
        }
        if (modalImageCarousel) {
            modalImageCarousel.style.transform = 'translateX(-100%)'; // Сбрасываем transform при закрытии
            modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Возвращаем transition
        }
        if (imageInfo) {
            imageInfo.innerHTML = '';
        }
        if (commentsList) {
            commentsList.innerHTML = '';
        }
        if (commentInput) {
            commentInput.value = '';
        }

        document.body.style.overflow = ''; // Разблокируем прокрутку body
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'auto';
        }
        currentImageWrapper = null;
        currentImageId = null;
        allImagesInCurrentColumn = []; // Очищаем массив при закрытии
        currentImageIndex = -1; // Сбрасываем индекс

        // Очищаем src всех изображений в карусели
        prevImageElement.src = '';
        modalImageElement.src = '';
        nextImageElement.src = '';
    }

    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleOptionsDropdown();
    });

    imageModalGlobalRef.addEventListener('click', (event) => {
        // Проверяем, что клик был именно по фону модального окна, а не по его содержимому
        // Исключаем клики по элементам карусели, чтобы они не закрывали модал
        if (event.target === imageModalGlobalRef) {
            closeModal();
        }
    });

    document.addEventListener('click', (event) => {
        if (optionsDropdownGlobalRef.style.display === 'block') {
            if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
                optionsDropdownGlobalRef.style.display = 'none';
                optionsDropdownGlobalRef.classList.remove('show');
            }
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
            closeModal();
        } else if (imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
            // Обработка клавиш-стрелок для навигации
            if (event.key === 'ArrowLeft') {
                event.preventDefault(); // Предотвращаем прокрутку страницы
                if (currentImageIndex > 0) {
                    currentImageIndex--;
                    // Симулируем свайп вправо (предыдущее фото)
                    currentTranslate = 0; // Изначально смещаем карусель, чтобы показать предыдущее фото
                    setTranslate(currentTranslate);
                    modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                    
                    // Ждем завершения анимации, затем сбрасываем и обновляем
                    modalImageCarousel.addEventListener('transitionend', function handler() {
                        modalImageCarousel.removeEventListener('transitionend', handler);
                        currentTranslate = -modalImageCarousel.offsetWidth; // Сброс на центрированное положение
                        setTranslate(currentTranslate);
                        modalImageCarousel.style.transition = 'none';
                        updateCarouselImages(currentImageIndex);
                        modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                    }, { once: true });

                } else {
                    // Если достигнуто начало, можно показать легкую "пружину"
                    modalImageCarousel.style.transform = 'translateX(calc(-100% + 20px))';
                    setTimeout(() => {
                        modalImageCarousel.style.transform = 'translateX(-100%)';
                    }, 100);
                }
            } else if (event.key === 'ArrowRight') {
                event.preventDefault(); // Предотвращаем прокрутку страницы
                if (currentImageIndex < allImagesInCurrentColumn.length - 1) {
                    currentImageIndex++;
                    // Симулируем свайп влево (следующее фото)
                    currentTranslate = -modalImageCarousel.offsetWidth * 2; // Изначально смещаем карусель, чтобы показать следующее фото
                    setTranslate(currentTranslate);
                    modalImageCarousel.style.transition = 'transform 0.3s ease-out';

                    // Ждем завершения анимации, затем сбрасываем и обновляем
                    modalImageCarousel.addEventListener('transitionend', function handler() {
                        modalImageCarousel.removeEventListener('transitionend', handler);
                        currentTranslate = -modalImageCarousel.offsetWidth; // Сброс на центрированное положение
                        setTranslate(currentTranslate);
                        modalImageCarousel.style.transition = 'none';
                        updateCarouselImages(currentImageIndex);
                        modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                    }, { once: true });
                } else {
                    // Если достигнут конец, можно показать легкую "пружину"
                    modalImageCarousel.style.transform = 'translateX(calc(-100% - 20px))';
                    setTimeout(() => {
                        modalImageCarousel.style.transform = 'translateX(-100%)';
                    }, 100);
                }
            }
        }
    });

    // Это уже было, но важно, чтобы не конфликтовало со свайпом
    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        // Мы не блокируем touchmove здесь, чтобы позволить свайп изображения.
        // Вместо этого мы управляем прокруткой body через CSS и JS.
        // Если event.target - это commentsList и он прокручивается, то это нормально.
        // Если это не modalImageElement или commentsList, то можно остановить.
        if (imageModalGlobalRef.classList.contains('show-modal') && event.target !== commentsList && !commentsList.contains(event.target) && !modalImageCarousel.contains(event.target)) {
            // Проверяем, что мы не пытаемся прокрутить список комментариев или саму карусель
            event.preventDefault();
        }
    }, { passive: false });
});
