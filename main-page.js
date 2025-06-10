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
// const modalActionsContainer = document.querySelector('.modal-actions-container'); // Теперь не нужен, используем новый контейнер
const imageContainerGlobalRef = document.querySelector('.image-container');
const imageInfo = document.getElementById('imageInfo');
const commentsList = document.getElementById('commentsList'); // Новый элемент для списка комментариев
const commentInput = document.getElementById('commentInput'); // Новый элемент для поля ввода комментария
const sendCommentBtn = document.getElementById('sendCommentBtn'); // Новый элемент для кнопки отправки комментария

const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

let currentImageWrapper = null;
let currentImageId = null; // Добавим для хранения ID текущего изображения

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        const isAuthPage = window.location.pathname.includes("entry.html") ||
                               window.location.pathname.includes("registration.html");

        if (user) {
            window.currentUser = user.email;
            // Установим отображаемое имя пользователя (часть почты до '@')
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
        currentImageId = imageWrapper.dataset.id; // Сохраняем ID текущего изображения
        const imgElement = imageWrapper.querySelector('img');

        if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo || !commentsList || !commentInput || !sendCommentBtn) {
            console.error("One or more modal elements are missing.");
            return;
        }

        imageModalGlobalRef.classList.add('show-modal');
        optionsDropdownGlobalRef.style.display = 'none';

        modalImageElement.src = imgElement.src;
        modalImageElement.dataset.id = currentImageId; // Используем currentImageId
        modalImageElement.setAttribute('crossorigin', 'anonymous');
        
        imageInfo.innerHTML = '';
        commentsList.innerHTML = ''; // Очищаем список комментариев при открытии модалки
        commentInput.value = ''; // Очищаем поле ввода комментария

        // Загружаем и отображаем комментарии
        loadCommentsForImage(currentImageId);

        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'none';
        }
    }

    // Новая функция для загрузки комментариев
    function loadCommentsForImage(imageId) {
        if (!imageId) return;

        const commentsRef = dbRef(database, `images/${imageId}/comments`);
        onValue(commentsRef, (snapshot) => {
            const commentsData = snapshot.val();
            commentsList.innerHTML = ''; // Очищаем перед обновлением

            if (commentsData) {
                const commentArray = Object.keys(commentsData).map(key => ({ id: key, ...commentsData[key] }));
                commentArray.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Сортируем по дате, старые вверху

                commentArray.forEach(comment => {
                    const commentElement = document.createElement('p');
                    const authorSpan = document.createElement('span');
                    authorSpan.classList.add('comment-author');
                    authorSpan.textContent = `${comment.author.split('@')[0]}: `; // Отображаем имя пользователя без домена

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
                commentsList.scrollTop = commentsList.scrollHeight; // Прокрутка к последнему комментарию
            }
        }, (error) => {
            console.error("Ошибка загрузки комментариев:", error);
        });
    }

    // Обработчик отправки комментария
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
            commentInput.value = ''; // Очищаем поле ввода
        } catch (error) {
            console.error("Ошибка при добавлении комментария:", error);
            alert("Не удалось добавить комментарий. Попробуйте снова.");
        }
    });

    // Добавляем обработчик для Enter в поле комментария
    commentInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Проверяем, что это просто Enter, а не Shift+Enter
            event.preventDefault(); // Предотвращаем стандартное поведение (перенос строки)
            sendCommentBtn.click(); // Имитируем клик по кнопке отправки
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
        }
        if (imageInfo) {
            imageInfo.innerHTML = '';
        }
        if (commentsList) { // Очищаем комментарии при закрытии
            commentsList.innerHTML = '';
        }
        if (commentInput) { // Очищаем поле ввода
            commentInput.value = '';
        }


        document.body.style.overflow = '';
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'auto';
        }
        currentImageWrapper = null;
        currentImageId = null; // Обнуляем ID текущего изображения
    }

    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleOptionsDropdown();
    });

    imageModalGlobalRef.addEventListener('click', (event) => {
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
        }
    });

    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            event.preventDefault();
        }
    }, { passive: false });
});
