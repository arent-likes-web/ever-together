// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";


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


document.addEventListener('DOMContentLoaded', () => {
    // --- Все ссылки на DOM-элементы теперь внутри DOMContentLoaded ---
    const imageModalGlobalRef = document.getElementById('imageModal');
    const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
    const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');

    const modalImageCarousel = document.querySelector('.modal-image-carousel');
    const prevImageButton = document.getElementById('prevImage');
    const nextImageButton = document.getElementById('nextImage');
    const modalImage = document.getElementById('modalImage');
    const imageInfoDiv = document.getElementById('imageInfo');

    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');

    const leftColumn = document.getElementById('leftColumn');
    const centerColumn = document.getElementById('centerColumn');
    const rightColumn = document.getElementById('rightColumn');

    const uploadLeftButton = document.getElementById('uploadLeft');
    const uploadCenterButton = document.getElementById('uploadCenter');
    const uploadRightButton = document.getElementById('uploadRight');

    const fileInputLeft = document.getElementById('fileInputLeft');
    const fileInputCenter = document.getElementById('fileInputCenter');
    const fileInputRight = document.getElementById('fileInputRight');
    // --- Конец ссылок на DOM-элементы ---


    let imageList = [];
    let currentIndex = 0;
    let currentColumn = 'left';

    // --- Firebase Auth Status Listener ---
    onAuthStateChanged(auth, (user) => {
        const userNameSpan = document.getElementById('userName'); // Эту ссылку тоже стоит объявить здесь
        if (user) {
            userNameSpan.textContent = user.displayName || user.email;
            loadImages();
        } else {
            userNameSpan.textContent = 'Гость';
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
                    if (typeof image.timestamp === 'string') {
                        image.timestamp = new Date(image.timestamp).getTime();
                    } else if (typeof image.timestamp === 'undefined' || image.timestamp === null) {
                        image.timestamp = Date.now();
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
        event.stopPropagation();
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

    // --- Логика загрузки изображений ---

    async function uploadImageToFirebase(file, column) {
        if (!file) {
            alert('Пожалуйста, выберите файл для загрузки.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Для загрузки изображений необходимо войти в систему.');
            return;
        }

        console.log(`Начинается загрузка файла: ${file.name} в колонку: ${column}`);
        alert(`Начинается загрузка файла: ${file.name} в колонку: ${column}`);

        try {
            const storagePath = `images/${user.uid}/${Date.now()}_${file.name}`;
            const imageRef = storageRef(storage, storagePath);
            const uploadResult = await uploadBytes(imageRef, file);
            const imageUrl = await getDownloadURL(uploadResult.ref);

            const newImageRef = push(dbRef(database, 'images'));
            await set(newImageRef, {
                url: imageUrl,
                column: column,
                description: '',
                timestamp: Date.now(),
                uploadedBy: user.uid,
                uploadedByName: user.displayName || user.email
            });

            console.log('Изображение успешно загружено и информация сохранена в базу данных!');
            alert('Фотография успешно загружена!');

        } catch (error) {
            console.error('Ошибка при загрузке изображения:', error);
            alert('Ошибка при загрузке фотографии: ' + error.message);
        }
    }

    // Обработчики для кнопок загрузки
    uploadLeftButton.addEventListener('click', () => {
        fileInputLeft.click();
    });
    uploadCenterButton.addEventListener('click', () => {
        fileInputCenter.click();
    });
    uploadRightButton.addEventListener('click', () => {
        fileInputRight.click();
    });

    // Обработчики изменения скрытых input[type="file"]
    fileInputLeft.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadImageToFirebase(file, fileInputLeft.dataset.column);
        }
        event.target.value = '';
    });

    fileInputCenter.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadImageToFirebase(file, fileInputCenter.dataset.column);
        }
        event.target.value = '';
    });

    fileInputRight.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadImageToFirebase(file, fileInputRight.dataset.column);
        }
        event.target.value = '';
    });


    // --- Функциональность касания/свайпа для карусели модального окна ---
    let startX;
    let currentTranslate;
    let isDragging = false;
    const carouselWidth = modalImageCarousel.offsetWidth + 40;

    function setTranslate(xPos) {
        modalImageCarousel.style.transform = `translateX(${xPos}px)`;
    }

    modalImageCarousel.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            startX = event.touches[0].clientX;
            currentTranslate = getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0;
            isDragging = true;
            modalImageCarousel.style.transition = 'none';
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
        modalImageCarousel.style.transition = 'transform 0.3s ease-out';

        const movedBy = currentTranslate - (getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4] ? parseFloat(getComputedStyle(modalImageCarousel).transform.replace(/[^0-9\-.,]/g, '').split(',')[4]) : 0);

        if (movedBy < -50 && currentIndex < imageList.length - 1) {
            currentIndex++;
        } else if (movedBy > 50 && currentIndex > 0) {
            currentIndex--;
        }

        updateCarouselImages(currentIndex);
        updateImageInfo(imageList[currentIndex]);
        loadComments(imageList[currentIndex].id);
    });

    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            const isTargetComments = commentsList.contains(event.target) || event.target === commentsList;
            const isTargetCarousel = modalImageCarousel.contains(event.target) || event.target === modalImageCarousel;

            if (isTargetCarousel && isDragging) {
                return;
            }
            if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
                return;
            }
            event.preventDefault();
        }
    }, { passive: false });

});
