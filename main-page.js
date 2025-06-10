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
const modalImageElement = document.getElementById('modalImage');
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
let currentTranslate = 0;
let prevTranslate = 0;

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
        const imgElement = imageWrapper.querySelector('img');
        const currentColumn = imageWrapper.dataset.columnOrigin;

        // Заполняем allImagesInCurrentColumn и currentImageIndex
        allImagesInCurrentColumn = Array.from(document.getElementById(`${currentColumn}Column`).querySelectorAll('.image-wrapper'))
                                        .sort((a, b) => new Date(b.dataset.timestamp) - new Date(a.dataset.timestamp));
        currentImageIndex = allImagesInCurrentColumn.findIndex(wrapper => wrapper.dataset.id === currentImageId);

        if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo || !commentsList || !commentInput || !sendCommentBtn) {
            console.error("One or more modal elements are missing.");
            return;
        }

        // При открытии модала, убедимся, что изображение в исходном состоянии (transform: none)
        modalImageElement.style.transform = 'translateX(0)';
        modalImageElement.style.transition = 'transform 0.3s ease-out'; // Убедимся, что transition включен

        imageModalGlobalRef.classList.add('show-modal');
        optionsDropdownGlobalRef.style.display = 'none';

        modalImageElement.src = imgElement.src;
        modalImageElement.dataset.id = currentImageId;
        modalImageElement.setAttribute('crossorigin', 'anonymous');
        
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

    // --- Функции для свайпа ---
    function setPositionByIndex() {
        modalImageElement.style.transform = `translateX(${currentTranslate}px)`;
        modalImageElement.style.transition = 'transform 0.3s ease-out'; // Плавное завершение свайпа
    }

    function touchStart(event) {
        if (optionsDropdownGlobalRef.style.display === 'block') { // Если дропдаун открыт, игнорируем свайп
            return;
        }
        isDragging = true;
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        modalImageElement.classList.add('dragging');
        modalImageElement.style.transition = 'none'; // Отключаем transition во время перетаскивания
        prevTranslate = currentTranslate; // Запоминаем текущее смещение
    }

    function touchMove(event) {
        if (!isDragging) return;

        const currentPosition = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        currentTranslate = prevTranslate + currentPosition - startX;
        modalImageElement.style.transform = `translateX(${currentTranslate}px)`;
    }

    function touchEnd() {
        isDragging = false;
        modalImageElement.classList.remove('dragging');

        const movedBy = currentTranslate - prevTranslate; // Насколько сильно сдвинули
        const threshold = modalImageElement.offsetWidth / 4; // Порог для переключения изображения (25% ширины)

        if (movedBy < -threshold && currentImageIndex < allImagesInCurrentColumn.length - 1) {
            // Свайп влево (к следующему изображению)
            currentImageIndex++;
            showImageByIndex(currentImageIndex, 'left');
        } else if (movedBy > threshold && currentImageIndex > 0) {
            // Свайп вправо (к предыдущему изображению)
            currentImageIndex--;
            showImageByIndex(currentImageIndex, 'right');
        } else {
            // Свайп недостаточен, возвращаемся на текущее изображение
            currentTranslate = 0;
            setPositionByIndex();
        }
    }

    function showImageByIndex(index, direction) {
        if (index < 0 || index >= allImagesInCurrentColumn.length) {
            // Если вышли за пределы, возвращаем изображение на место
            currentTranslate = 0;
            setPositionByIndex();
            return;
        }

        const nextImageWrapper = allImagesInCurrentColumn[index];
        const nextImageId = nextImageWrapper.dataset.id;
        const nextImageSrc = nextImageWrapper.querySelector('img').src;

        // Если это новое изображение, обновим src и комментарии
        if (nextImageId !== currentImageId) {
            // Запускаем анимацию "перелистывания"
            modalImageElement.style.transform = `translateX(${direction === 'left' ? -modalImageElement.offsetWidth : modalImageElement.offsetWidth}px)`;
            modalImageElement.style.transition = 'transform 0.3s ease-out';

            // Ждем завершения анимации, затем меняем изображение и сбрасываем transform
            modalImageElement.addEventListener('transitionend', function handler() {
                modalImageElement.src = nextImageSrc;
                modalImageElement.dataset.id = nextImageId;
                currentImageId = nextImageId;
                loadCommentsForImage(currentImageId);
                
                modalImageElement.style.transform = 'translateX(0)';
                modalImageElement.removeEventListener('transitionend', handler); // Удаляем обработчик, чтобы он не срабатывал повторно
                currentTranslate = 0; // Сбрасываем смещение
            }, { once: true }); // Убедимся, что обработчик удаляется после первого срабатывания
        } else {
            // Если изображение не изменилось (например, при свайпе в конце/начале),
            // просто возвращаем его на место.
            currentTranslate = 0;
            setPositionByIndex();
        }
    }

    // Добавляем слушателей событий для свайпа к modalImageElement
    modalImageElement.addEventListener('touchstart', touchStart);
    modalImageElement.addEventListener('touchmove', touchMove);
    modalImageElement.addEventListener('touchend', touchEnd);

    // Для десктопа:
    modalImageElement.addEventListener('mousedown', touchStart); // Используем touchStart, т.к. логика схожа
    modalImageElement.addEventListener('mousemove', touchMove); // Используем touchMove
    modalImageElement.addEventListener('mouseup', touchEnd); // Используем touchEnd
    modalImageElement.addEventListener('mouseleave', () => { // Если мышка ушла с элемента во время перетаскивания
        if (isDragging) {
            touchEnd();
        }
    });


    function loadCommentsForImage(imageId) {
        if (!imageId) return;

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
        if (modalImageElement) {
            modalImageElement.src = '';
            modalImageElement.dataset.id = '';
            modalImageElement.style.transform = 'translateX(0)'; // Сбрасываем transform при закрытии
            modalImageElement.style.transition = 'transform 0.3s ease-out'; // Возвращаем transition
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
    }

    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleOptionsDropdown();
    });

    imageModalGlobalRef.addEventListener('click', (event) => {
        // Проверяем, что клик был именно по фону модального окна, а не по его содержимому
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
                    showImageByIndex(currentImageIndex, 'right');
                } else {
                    // Если достигнуто начало, можно показать легкую "пружину"
                    modalImageElement.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        modalImageElement.style.transform = 'translateX(0)';
                    }, 100);
                }
            } else if (event.key === 'ArrowRight') {
                event.preventDefault(); // Предотвращаем прокрутку страницы
                if (currentImageIndex < allImagesInCurrentColumn.length - 1) {
                    currentImageIndex++;
                    showImageByIndex(currentImageIndex, 'left');
                } else {
                    // Если достигнут конец, можно показать легкую "пружину"
                    modalImageElement.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        modalImageElement.style.transform = 'translateX(0)';
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
        if (imageModalGlobalRef.classList.contains('show-modal') && event.target !== commentsList && !commentsList.contains(event.target)) {
            // Проверяем, что мы не пытаемся прокрутить список комментариев
            event.preventDefault();
        }
    }, { passive: false });
});
