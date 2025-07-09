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
let currentTranslate = 0; // The actual translateX value of the carousel (px)
let prevTranslate = 0;    // The translateX value at the start of a drag (px)

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
        img.src = imageData.url; // <-- Здесь устанавливается URL Cloudinary
        console.log(`DEBUG: Set src for thumbnail ID ${imageId} to: ${img.src}`);
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
                const clickedThumbnailSrc = imageWrapper.querySelector('img').src;
                console.log(`DEBUG: Clicked thumbnail ID ${imageWrapper.dataset.id}, its src is: ${clickedThumbnailSrc}`);
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
        
        imageModalGlobalRef.classList.add('show-modal');
        optionsDropdownGlobalRef.style.display = 'none';

        // Блокируем прокрутку body, если модальное окно открыто
        document.body.style.overflow = 'hidden'; 
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'none';
        }

        // Используем requestAnimationFrame, чтобы убедиться, что модальное окно и карусель
        // полностью отрисованы и имеют правильные размеры, прежде чем мы будем использовать offsetWidth
        requestAnimationFrame(() => {
            modalImageCarousel.style.transition = 'none'; 
            currentTranslate = -modalImageCarousel.offsetWidth; // Центрируем `modalImageElement`
            setTranslate(currentTranslate);
            updateCarouselImages(currentImageIndex); // Загружаем текущее и соседние изображения
            
            // После установки начального положения, можно снова включить transition
            // Используем setTimeout 0 для отложенного включения transition,
            // чтобы браузер успел отрисовать изменения без transition
            setTimeout(() => {
                modalImageCarousel.style.transition = 'transform 0.3s ease-out';
            }, 0);
        });


        imageInfo.innerHTML = '';
        commentsList.innerHTML = '';
        commentInput.value = '';

        // Комментарии загружаются внутри updateCarouselImages
        // loadCommentsForImage(currentImageId); 
    }

    // Обновляет src изображений в карусели
    function updateCarouselImages(index) {
        // УДАЛЕНЫ СТРОКИ prevImageElement.src = ''; modalImageElement.src = ''; nextImageElement.src = '';

        // Текущее изображение
        const currentImgDataWrapper = allImagesInCurrentColumn[index];
        if (currentImgDataWrapper) {
            const thumbnailImg = currentImgDataWrapper.querySelector('img');
            if (thumbnailImg) {
                const thumbnailSrc = thumbnailImg.src;
                console.log("DEBUG: Thumbnail image source for current image in updateCarouselImages:", thumbnailSrc);
                if (thumbnailSrc && thumbnailSrc !== window.location.href) {
                    modalImageElement.src = thumbnailSrc;
                    modalImageElement.dataset.id = currentImgDataWrapper.dataset.id;
                    modalImageElement.setAttribute('crossorigin', 'anonymous');
                    currentImageId = currentImgDataWrapper.dataset.id;
                    modalImageElement.onerror = () => { 
                        console.error("Failed to load modalImageElement src:", modalImageElement.src); 
                        modalImageElement.alt = "Ошибка загрузки фото";
                    };
                } else {
                    console.error("DEBUG: Thumbnail src is invalid or empty for current image, or is the page URL (in updateCarouselImages):", thumbnailSrc);
                    modalImageElement.src = '';
                    modalImageElement.alt = "Изображение не найдено или недействительно.";
                }
            } else {
                console.error("DEBUG: No img element found in currentImgDataWrapper for current image.");
                modalImageElement.src = '';
                modalImageElement.alt = "Изображение не найдено.";
            }
        } else {
            console.warn("Attempted to update carousel with invalid current image index:", index);
            currentImageId = null;
        }

        // Предыдущее изображение
        if (index > 0) {
            const prevImgDataWrapper = allImagesInCurrentColumn[index - 1];
            const prevThumbnailImg = prevImgDataWrapper.querySelector('img');
            if (prevThumbnailImg) {
                const prevThumbnailSrc = prevThumbnailImg.src;
                console.log("DEBUG: Thumbnail image source for previous image in updateCarouselImages:", prevThumbnailSrc);
                if (prevThumbnailSrc && prevThumbnailSrc !== window.location.href) {
                    prevImageElement.src = prevThumbnailSrc;
                    prevImageElement.setAttribute('crossorigin', 'anonymous');
                    prevImageElement.onerror = () => { console.error("Failed to load prevImageElement src:", prevImageElement.src); };
                } else {
                    console.error("DEBUG: Thumbnail src is invalid or empty for previous image, or is the page URL (in updateCarouselImages):", prevThumbnailSrc);
                    prevImageElement.src = '';
                }
            } else {
                console.error("DEBUG: No img element found in prevImgDataWrapper for previous image.");
                prevImageElement.src = '';
            }
        } else {
            prevImageElement.src = '';
        }

        // Следующее изображение
        if (index < allImagesInCurrentColumn.length - 1) {
            const nextImgDataWrapper = allImagesInCurrentColumn[index + 1];
            const nextThumbnailImg = nextImgDataWrapper.querySelector('img');
            if (nextThumbnailImg) {
                const nextThumbnailSrc = nextThumbnailImg.src;
                console.log("DEBUG: Thumbnail image source for next image in updateCarouselImages:", nextThumbnailSrc);
                if (nextThumbnailSrc && nextThumbnailSrc !== window.location.href) {
                    nextImageElement.src = nextThumbnailSrc;
                    nextImageElement.setAttribute('crossorigin', 'anonymous');
                    nextImageElement.onerror = () => { console.error("Failed to load nextImageElement src:", nextImageElement.src); };
                } else {
                    console.error("DEBUG: Thumbnail src is invalid or empty for next image, or is the page URL (in updateCarouselImages):", nextThumbnailSrc);
                    nextImageElement.src = '';
                }
            } else {
                console.error("DEBUG: No img element found in nextImgDataWrapper for next image.");
                nextImageElement.src = '';
            }
        } else {
            nextImageElement.src = '';
        }

        loadCommentsForImage(currentImageId);
    }

    // --- Функции для свайпа ---
    function setTranslate(xPos) {
        modalImageCarousel.style.transform = `translateX(${xPos}px)`;
    }

    function getTranslateX(element) {
        const style = window.getComputedStyle(element);
        const matrix = new DOMMatrixReadOnly(style.transform);
        return matrix.m41;
    }

    function touchStart(event) {
        // Игнорируем, если дропдаун открыт, чтобы не конфликтовать
        if (optionsDropdownGlobalRef.style.display === 'block') { 
            return;
        }

        // Предотвращаем дефолтное поведение, чтобы избежать прокрутки страницы на мобильных
        // при начале свайпа на карусели
        if (event.target === modalImageCarousel || modalImageCarousel.contains(event.target)) {
            event.preventDefault();
        }
        
        isDragging = true;
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        modalImageCarousel.classList.add('dragging');
        modalImageCarousel.style.transition = 'none'; // Отключаем transition во время перетаскивания
        
        prevTranslate = getTranslateX(modalImageCarousel); // Запоминаем текущее смещение в px
    }

    function touchMove(event) {
        if (!isDragging) return;

        // Ensure only one touch is tracked for mobile to prevent erratic behavior
        if (event.type.includes('touch') && event.touches.length > 1) return;

        // Предотвращаем дефолтное поведение, чтобы не прокручивалась страница
        // если пользователь свайпает по карусели, но не по комментариям.
        if (event.target === modalImageCarousel || modalImageCarousel.contains(event.target)) {
            event.preventDefault();
        }

        const currentPosition = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        currentTranslate = prevTranslate + (currentPosition - startX); // currentTranslate is the new calculated position based on drag
        setTranslate(currentTranslate);
    }

    function touchEnd() {
        if (!isDragging) return;
        isDragging = false;
        modalImageCarousel.classList.remove('dragging');

        const carouselWidth = modalImageCarousel.offsetWidth;
        const movedBy = currentTranslate - prevTranslate;
        const threshold = carouselWidth / 4;

        let finalTranslateX = -carouselWidth;
        let newImageIndex = currentImageIndex;

        if (movedBy < -threshold) { // Swiped left (towards next image)
            if (currentImageIndex < allImagesInCurrentColumn.length - 1) {
                newImageIndex = currentImageIndex + 1;
                finalTranslateX = -carouselWidth * 2;
            }
        } else if (movedBy > threshold) { // Swiped right (towards previous image)
            if (currentImageIndex > 0) {
                newImageIndex = currentImageIndex - 1;
                finalTranslateX = 0;
            }
        }

        modalImageCarousel.style.transition = 'transform 0.3s ease-out';
        setTranslate(finalTranslateX);

        if (newImageIndex !== currentImageIndex) {
            currentImageIndex = newImageIndex;
            // After the animation finishes, reset carousel to show the new current image centrally
            modalImageCarousel.addEventListener('transitionend', function handler() {
                modalImageCarousel.removeEventListener('transitionend', handler);
                modalImageCarousel.style.transition = 'none'; // Temporarily disable transition for instant snap
                currentTranslate = -carouselWidth; // Reset to center the new main image
                setTranslate(currentTranslate);
                updateCarouselImages(currentImageIndex); // Update image sources for the new central image
                
                // Use setTimeout to re-enable transition after the browser has rendered the snap
                setTimeout(() => {
                    modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                }, 0);
            }, { once: true });
        } else {
            // No index change, snap back to current image
            currentTranslate = -carouselWidth;
            setTranslate(currentTranslate);
        }
    }

    // Добавляем слушателей событий для свайпа к modalImageCarousel
    modalImageCarousel.addEventListener('touchstart', touchStart, { passive: false });
    modalImageCarousel.addEventListener('touchmove', touchMove, { passive: false });
    modalImageCarousel.addEventListener('touchend', touchEnd);

    // Для десктопа:
    modalImageCarousel.addEventListener('mousedown', touchStart); 
    modalImageCarousel.addEventListener('mousemove', touchMove); 
    // События mouseup и mouseleave должны быть на document, чтобы захватывать отпускания вне элемента
    document.addEventListener('mouseup', touchEnd); 
    document.addEventListener('mouseleave', (event) => { 
        // Если курсор мыши покидает окно браузера во время перетаскивания,
        // это считается завершением перетаскивания.
        if (isDragging) {
            // Дополнительная проверка, чтобы убедиться, что это не просто перемещение по элементам DOM
            // а именно уход курсора из окна
            if (event.clientY <= 0 || event.clientX <= 0 || (event.clientX >= window.innerWidth || event.clientY >= window.innerHeight)) {
                touchEnd();
            }
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
            // Reset the carousel to its default centered state without transition
            modalImageCarousel.style.transition = 'none'; 
            currentTranslate = -modalImageCarousel.offsetWidth;
            setTranslate(currentTranslate);
            // Re-enable transition for next open, delayed to allow snap
            setTimeout(() => {
                modalImageCarousel.style.transition = 'transform 0.3s ease-out';
            }, 0);
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
        // Исключаем клики по элементам карусели и dropdown, чтобы они не закрывали модал
        if (event.target === imageModalGlobalRef || 
            (event.target !== modalImageCarousel && !modalImageCarousel.contains(event.target) &&
             event.target !== optionsDropdownGlobalRef && !optionsDropdownGlobalRef.contains(event.target) &&
             event.target !== moreOptionsButtonGlobalRef)) {
            closeModal();
        }
    });

    document.addEventListener('click', (event) => {
        // Если дропдаун открыт и клик не был по кнопке или самому дропдауну, закрыть его
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
            const carouselWidth = modalImageCarousel.offsetWidth;
            let newIndex = currentImageIndex;
            let targetX = -carouselWidth; // Default to current position (centered)

            if (event.key === 'ArrowLeft') {
                event.preventDefault(); 
                if (currentImageIndex > 0) {
                    newIndex = currentImageIndex - 1;
                    targetX = 0; // Show previous image (left slot)
                } else {
                    // "Bounce" effect at the start
                    modalImageCarousel.style.transition = 'transform 0.1s ease-out';
                    setTranslate(-carouselWidth + 20); // Bounce right (from center)
                    setTimeout(() => {
                        setTranslate(-carouselWidth);
                    }, 100);
                    return; // Exit as no image change
                }
            } else if (event.key === 'ArrowRight') {
                event.preventDefault(); 
                if (currentImageIndex < allImagesInCurrentColumn.length - 1) {
                    newIndex = currentImageIndex + 1;
                    targetX = -carouselWidth * 2; // Show next image (right slot)
                } else {
                    // "Bounce" effect at the end
                    modalImageCarousel.style.transition = 'transform 0.1s ease-out';
                    setTranslate(-carouselWidth - 20); // Bounce left (from center)
                    setTimeout(() => {
                        setTranslate(-carouselWidth);
                    }, 100);
                    return; // Exit as no image change
                }
            }

            if (newIndex !== currentImageIndex) {
                currentImageIndex = newIndex;
                modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                setTranslate(targetX);

                modalImageCarousel.addEventListener('transitionend', function handler() {
                    modalImageCarousel.removeEventListener('transitionend', handler);
                    modalImageCarousel.style.transition = 'none'; // Snap instantly
                    currentTranslate = -carouselWidth; // Reset to center
                    setTranslate(currentTranslate);
                    updateCarouselImages(currentImageIndex);
                    // Re-enable transition after snap
                    setTimeout(() => {
                        modalImageCarousel.style.transition = 'transform 0.3s ease-out';
                    }, 0);
                }, { once: true });
            }
        }
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



let currentIndex = 0;
let imageList = [];

function openModal(wrapper) {
    const column = wrapper.dataset.columnOrigin;
    imageList = Array.from(document.querySelectorAll(`#${column}Column .image-wrapper`));
    currentIndex = imageList.findIndex(w => w === wrapper);
    setCarouselImages();
    document.getElementById('imageModal').classList.add('show-modal');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('show-modal');
    document.body.style.overflow = '';
}

function setCarouselImages() {
    const carousel = document.querySelector('.modal-image-carousel');
    const offset = currentIndex * (carousel.children[0]?.offsetWidth + 40); // ширина + gap
    carousel.style.transform = `translateX(calc(50vw - ${offset + (carousel.children[0]?.offsetWidth / 2)}px))`;

    // Прелоад
    for (let i = -1; i <= 1; i++) {
        const img = carousel.children[currentIndex + i];
        if (img) new Image().src = img.src;
    }
}

document.getElementById('prevImage')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
        currentIndex--;
        setCarouselImages();
    }
});

document.getElementById('nextImage')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < imageList.length - 1) {
        currentIndex++;
        setCarouselImages();
    }
});

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imageModal');
    if (!modal.classList.contains('show-modal')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        setCarouselImages();
    }
    if (e.key === 'ArrowRight' && currentIndex < imageList.length - 1) {
        currentIndex++;
        setCarouselImages();
    }
});

// === Modal Carousel Logic ===
let currentIndex = 0;
let imageList = [];

function openModal(wrapper) {
    const column = wrapper.dataset.columnOrigin;
    imageList = Array.from(document.querySelectorAll(`#${column}Column .image-wrapper`));
    currentIndex = imageList.findIndex(w => w === wrapper);
    setCarouselImages();
    document.getElementById('imageModal').classList.add('show-modal');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('show-modal');
    document.body.style.overflow = '';
}

function setCarouselImages() {
    const carousel = document.querySelector('.modal-image-carousel');
    const [prev, main, next] = carousel.querySelectorAll('img');

    const getSrc = (i) => imageList[i]?.querySelector('img')?.src || '';

    prev.src = getSrc(currentIndex - 1);
    main.src = getSrc(currentIndex);
    next.src = getSrc(currentIndex + 1);

    prev.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    next.style.visibility = currentIndex < imageList.length - 1 ? 'visible' : 'hidden';
}

document.getElementById('prevImage')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
        currentIndex--;
        setCarouselImages();
    }
});

document.getElementById('nextImage')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < imageList.length - 1) {
        currentIndex++;
        setCarouselImages();
    }
});

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imageModal');
    if (!modal.classList.contains('show-modal')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        setCarouselImages();
    }
    if (e.key === 'ArrowRight' && currentIndex < imageList.length - 1) {
        currentIndex++;
        setCarouselImages();
    }
});
// === End Modal Carousel Logic ===
