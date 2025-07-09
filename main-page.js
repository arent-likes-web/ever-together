// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";
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
const storage = getStorage(app);

// Global references for modal elements
const imageModalGlobalRef = document.getElementById('imageModal');
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');
const commentsList = document.getElementById('commentsList'); // Make sure this is globally accessible or passed

// New references for carousel elements
const modalImageCarousel = document.getElementById('modal-image-carousel');
const prevImagePlaceholder = document.getElementById('prevImage');
const modalImageMain = document.getElementById('modalImage');
const nextImagePlaceholder = document.getElementById('nextImage');

// Global variables for image data and current index
let imageList = [];
let currentImageIndex = 0;
let isDragging = false;
let startX = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationID = 0;


// Utility function to safely get element
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with ID "${id}" not found.`);
    }
    return element;
}

// Ensure all necessary elements are loaded before proceeding
document.addEventListener('DOMContentLoaded', () => {
    // Check if critical elements exist
    const criticalElements = ['imageModal', 'closeModalButton', 'prevImageButton', 'nextImageButton', 'modal-image-carousel', 'modalImage', 'commentsList', 'commentInput', 'sendCommentBtn', 'moreOptionsButton', 'optionsDropdown'];
    criticalElements.forEach(id => {
        if (!getElement(id)) {
            console.error(`Application might not function correctly: Missing critical element with ID "${id}"`);
        }
    });

    // Get elements after DOM is fully loaded
    const closeModalButton = getElement('closeModalButton');
    const prevImageButton = getElement('prevImageButton');
    const nextImageButton = getElement('nextImageButton');
    const commentInput = getElement('commentInput');
    const sendCommentBtn = getElement('sendCommentBtn');
    const userNameSpan = getElement('userName');

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    if (prevImageButton) {
        prevImageButton.addEventListener('click', () => navigateCarousel(-1));
    }
    if (nextImageButton) {
        nextImageButton.addEventListener('click', () => navigateCarousel(1));
    }
    if (moreOptionsButtonGlobalRef) {
        moreOptionsButtonGlobalRef.addEventListener('click', toggleOptionsDropdown);
    }
    if (sendCommentBtn) {
        sendCommentBtn.addEventListener('click', addComment);
    }

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (optionsDropdownGlobalRef && moreOptionsButtonGlobalRef &&
            !optionsDropdownGlobalRef.contains(event.target) &&
            !moreOptionsButtonGlobalRef.contains(event.target)) {
            optionsDropdownGlobalRef.classList.remove('show');
        }
    });

    // Add event listeners to dropdown options
    if (optionsDropdownGlobalRef) {
        optionsDropdownGlobalRef.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', handleOptionClick);
        });
    }

    // Carousel touch/mouse events
    if (modalImageCarousel) {
        modalImageCarousel.addEventListener('mousedown', touchStart);
        modalImageCarousel.addEventListener('mouseup', touchEnd);
        modalImageCarousel.addEventListener('mouseleave', touchEnd);
        modalImageCarousel.addEventListener('mousemove', touchMove);

        modalImageCarousel.addEventListener('touchstart', touchStart);
        modalImageCarousel.addEventListener('touchend', touchEnd);
        modalImageCarousel.addEventListener('touchmove', touchMove);
    }
});


onAuthStateChanged(auth, (user) => {
    const userNameSpan = getElement('userName');
    if (user && userNameSpan) {
        userNameSpan.textContent = user.email;
    } else if (userNameSpan) {
        userNameSpan.textContent = 'Гость';
    }
});

// Firebase DB path constants
const IMAGES_DB_PATH = 'images/';
const COMMENTS_DB_PATH = 'comments/';

// Column mapping
const columnMap = {
    'left': 'leftColumn',
    'center': 'centerColumn',
    'right': 'rightColumn'
};

// --- Image Upload Functions ---
document.addEventListener('DOMContentLoaded', () => {
    const uploadLeftBtn = getElement('uploadLeft');
    const uploadCenterBtn = getElement('uploadCenter');
    const uploadRightBtn = getElement('uploadRight');

    if (uploadLeftBtn) {
        uploadLeftBtn.addEventListener('click', () => triggerFileInput('left'));
    }
    if (uploadCenterBtn) {
        uploadCenterBtn.addEventListener('click', () => triggerFileInput('center'));
    }
    if (uploadRightBtn) {
        uploadRightBtn.addEventListener('click', () => triggerFileInput('right'));
    }
});

function triggerFileInput(column) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadImage(file, column);
        }
    };
    fileInput.click();
}

async function uploadImage(file, column) {
    if (!auth.currentUser) {
        alert('Пожалуйста, войдите, чтобы загружать изображения.');
        window.location.href = 'index.html'; // Redirect to login
        return;
    }

    const imageRef = storageRef(storage, `${IMAGES_DB_PATH}${column}/${file.name}`);
    try {
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);
        await saveImageUrlToDatabase(imageUrl, column, file.name);
        alert('Изображение успешно загружено!');
    } catch (error) {
        console.error("Ошибка загрузки изображения:", error);
        alert('Ошибка загрузки изображения: ' + error.message);
    }
}

async function saveImageUrlToDatabase(url, column, fileName) {
    const newImageRef = push(dbRef(database, `${IMAGES_DB_PATH}${column}`));
    await set(newImageRef, {
        url: url,
        fileName: fileName,
        timestamp: Date.now(),
        uploadedBy: auth.currentUser ? auth.currentUser.email : 'anonymous'
    });
}

// --- Image Display and Modal Logic ---
onValue(dbRef(database, IMAGES_DB_PATH), (snapshot) => {
    const data = snapshot.val();
    renderImages(data);
});

function renderImages(data) {
    const leftColumnElement = getElement('leftColumn');
    const centerColumnElement = getElement('centerColumn');
    const rightColumnElement = getElement('rightColumn');

    if (!leftColumnElement || !centerColumnElement || !rightColumnElement) {
        console.error("One or more image columns not found in HTML.");
        return;
    }

    leftColumnElement.innerHTML = '';
    centerColumnElement.innerHTML = '';
    rightColumnElement.innerHTML = '';

    imageList = []; // Clear previous list

    if (data) {
        Object.keys(data).forEach(columnId => {
            const columnData = data[columnId];
            const columnElement = getElement(columnId); // Get the actual column div

            if (columnElement) {
                Object.keys(columnData).forEach(imageId => {
                    const image = { id: imageId, column: columnId, ...columnData[imageId] };
                    imageList.push(image); // Populate global image list
                    const imgElement = document.createElement('img');
                    imgElement.src = image.url;
                    imgElement.alt = image.fileName;
                    imgElement.classList.add('gallery-image');
                    imgElement.dataset.imageId = image.id;
                    imgElement.dataset.columnId = image.column;

                    imgElement.addEventListener('click', () => openModal(image.id, image.column));
                    columnElement.appendChild(imgElement);
                });
            }
        });
        // Sort imageList by timestamp to ensure consistent order for carousel
        imageList.sort((a, b) => a.timestamp - b.timestamp);
    }
}

function openModal(imageId, columnId) {
    if (!imageModalGlobalRef) {
        console.error("Modal element not found.");
        return;
    }

    currentImageIndex = imageList.findIndex(img => img.id === imageId && img.column === columnId);

    if (currentImageIndex === -1) {
        console.error("Image not found in list for modal.");
        return;
    }

    updateCarouselImages(currentImageIndex);
    loadComments(imageId, columnId);
    displayImageInfo(imageList[currentImageIndex]);

    imageModalGlobalRef.classList.add('show-modal');
    document.body.style.overflow = 'hidden'; // Prevent scrolling background
}


function closeModal() {
    if (imageModalGlobalRef) {
        imageModalGlobalRef.classList.remove('show-modal');
        document.body.style.overflow = ''; // Restore scrolling
        if (optionsDropdownGlobalRef) {
            optionsDropdownGlobalRef.classList.remove('show'); // Hide dropdown on close
        }
    }
}

function updateCarouselImages(index) {
    if (!modalImageMain || !prevImagePlaceholder || !nextImagePlaceholder) {
        console.error("Carousel image elements not found.");
        return;
    }

    const currentImage = imageList[index];
    const prevImage = imageList[index - 1];
    const nextImage = imageList[index + 1];

    modalImageMain.src = currentImage ? currentImage.url : '';
    modalImageMain.alt = currentImage ? currentImage.fileName : '';
    modalImageMain.dataset.currentImageId = currentImage ? currentImage.id : '';
    modalImageMain.dataset.currentColumnId = currentImage ? currentImage.column : '';

    prevImagePlaceholder.src = prevImage ? prevImage.url : '';
    prevImagePlaceholder.alt = prevImage ? prevImage.fileName : '';

    nextImagePlaceholder.src = nextImage ? nextImage.url : '';
    nextImagePlaceholder.alt = nextImage ? nextImage.fileName : '';

    displayImageInfo(currentImage);
    loadComments(currentImage.id, currentImage.column);

    // Reset carousel position to ensure current image is centered
    if (modalImageCarousel) {
        const carouselWidth = modalImageCarousel.offsetWidth;
        // Position modalImageMain in the center. The other images will be relative to it.
        // We set the transform to put the *main image's left edge* at 100vw/2 - modalImageMain.width/2
        // To achieve this, modalImageCarousel's translateX should offset the content to center modalImageMain.
        // Assuming images are of similar width or handled by CSS for centering within carousel.
        // For simplicity, let's reset to a neutral position for the next transition to apply correctly.
        modalImageCarousel.style.transition = 'none'; // Disable transition for snap
        modalImageCarousel.style.transform = `translateX(-${carouselWidth}px)`; // Center the main image (second in 3-image setup)
        // Re-enable transition after snap
        setTimeout(() => {
            modalImageCarousel.style.transition = 'transform 0.3s ease-out';
        }, 0);
    }
}


function navigateCarousel(direction) {
    const newIndex = currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < imageList.length) {
        currentImageIndex = newIndex;
        updateCarouselImages(currentImageIndex);
    }
}

function displayImageInfo(image) {
    const imageInfoDiv = getElement('imageInfo');
    if (imageInfoDiv && image) {
        const date = new Date(image.timestamp).toLocaleDateString();
        const time = new Date(image.timestamp).toLocaleTimeString();
        imageInfoDiv.innerHTML = `
            <p><strong>Имя файла:</strong> ${image.fileName}</p>
            <p><strong>Загружено:</strong> ${image.uploadedBy} ${date} ${time}</p>
        `;
    } else if (imageInfoDiv) {
        imageInfoDiv.innerHTML = '';
    }
}

// --- Comments Logic ---
async function addComment() {
    if (!auth.currentUser) {
        alert('Пожалуйста, войдите, чтобы оставлять комментарии.');
        window.location.href = 'index.html';
        return;
    }

    const commentInput = getElement('commentInput');
    const imageId = modalImageMain ? modalImageMain.dataset.currentImageId : null;
    const columnId = modalImageMain ? modalImageMain.dataset.currentColumnId : null;

    if (!commentInput || commentInput.value.trim() === "" || !imageId || !columnId) {
        alert("Пожалуйста, введите комментарий и убедитесь, что изображение выбрано.");
        return;
    }

    const commentText = commentInput.value.trim();
    const newCommentRef = push(dbRef(database, `${COMMENTS_DB_PATH}${columnId}/${imageId}`));

    try {
        await set(newCommentRef, {
            text: commentText,
            timestamp: Date.now(),
            userName: auth.currentUser ? auth.currentUser.email : 'anonymous'
        });
        commentInput.value = ''; // Clear input
    } catch (error) {
        console.error("Ошибка добавления комментария:", error);
        alert("Ошибка добавления комментария.");
    }
}

function loadComments(imageId, columnId) {
    if (!commentsList) {
        console.error("Comments list element not found.");
        return;
    }
    const commentsRef = dbRef(database, `${COMMENTS_DB_PATH}${columnId}/${imageId}`);
    onValue(commentsRef, (snapshot) => {
        const commentsData = snapshot.val();
        commentsList.innerHTML = ''; // Clear existing comments

        if (commentsData) {
            const commentsArray = Object.values(commentsData);
            commentsArray.sort((a, b) => a.timestamp - b.timestamp); // Sort by time

            commentsArray.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment-item');
                const date = new Date(comment.timestamp).toLocaleDateString();
                const time = new Date(comment.timestamp).toLocaleTimeString();
                commentDiv.innerHTML = `
                    <p><strong>${comment.userName}</strong> (${date} ${time}):</p>
                    <p>${comment.text}</p>
                `;
                commentsList.appendChild(commentDiv);
            });
            commentsList.scrollTop = commentsList.scrollHeight; // Scroll to bottom
        }
    });
}

// --- Image Options (Delete/Move) Logic ---
function toggleOptionsDropdown() {
    if (optionsDropdownGlobalRef) {
        optionsDropdownGlobalRef.classList.toggle('show');
    }
}

async function handleOptionClick(event) {
    event.preventDefault();
    const action = event.target.dataset.action;
    const currentImageId = modalImageMain ? modalImageMain.dataset.currentImageId : null;
    const currentColumnId = modalImageMain ? modalImageMain.dataset.currentColumnId : null;

    if (!currentImageId || !currentColumnId) {
        alert("Изображение не выбрано.");
        return;
    }

    if (!auth.currentUser) {
        alert('Пожалуйста, войдите, чтобы выполнять эти действия.');
        window.location.href = 'index.html';
        return;
    }

    if (action === 'delete') {
        if (confirm('Вы уверены, что хотите удалить это изображение?')) {
            await deleteImage(currentImageId, currentColumnId);
            closeModal();
        }
    } else if (action === 'move') {
        const targetColumn = event.target.dataset.column;
        if (confirm(`Вы уверены, что хотите переместить это изображение в ${targetColumn === 'left' ? 'Him peach' : targetColumn === 'center' ? 'Our dreams' : 'Her cat'}?`)) {
            await moveImage(currentImageId, currentColumnId, targetColumn);
            closeModal();
        }
    }

    if (optionsDropdownGlobalRef) {
        optionsDropdownGlobalRef.classList.remove('show');
    }
}

async function deleteImage(imageId, columnId) {
    try {
        // 1. Get image details from DB to get URL and file name for storage deletion
        const imageRef = dbRef(database, `${IMAGES_DB_PATH}${columnId}/${imageId}`);
        const snapshot = await new Promise(resolve => onValue(imageRef, resolve, { onlyOnce: true }));
        const imageData = snapshot.val();

        if (imageData && imageData.url) {
            // 2. Delete from Firebase Storage
            const fileRef = storageRef(storage, imageData.url);
            await deleteObject(fileRef);
        }

        // 3. Delete image entry from Realtime Database
        await remove(imageRef);

        // 4. Delete associated comments
        await remove(dbRef(database, `${COMMENTS_DB_PATH}${columnId}/${imageId}`));

        alert('Изображение и связанные комментарии успешно удалены!');
    } catch (error) {
        console.error("Ошибка удаления изображения:", error);
        alert('Ошибка удаления изображения: ' + error.message);
    }
}

async function moveImage(imageId, currentColumnId, targetColumnId) {
    if (currentColumnId === targetColumnId) {
        alert('Изображение уже находится в этой колонке.');
        return;
    }

    try {
        // 1. Get image data from current location
        const currentImageRef = dbRef(database, `${IMAGES_DB_PATH}${currentColumnId}/${imageId}`);
        const snapshot = await new Promise(resolve => onValue(currentImageRef, resolve, { onlyOnce: true }));
        const imageData = snapshot.val();

        if (imageData) {
            // 2. Create a new entry in the target column
            const newImageRef = push(dbRef(database, `${IMAGES_DB_PATH}${targetColumnId}`));
            await set(newImageRef, { ...imageData, column: targetColumnId }); // Update column property

            // 3. Delete from original location
            await remove(currentImageRef);

            // 4. Move associated comments
            const commentsRef = dbRef(database, `${COMMENTS_DB_PATH}${currentColumnId}/${imageId}`);
            const commentsSnapshot = await new Promise(resolve => onValue(commentsRef, resolve, { onlyOnce: true }));
            const commentsData = commentsSnapshot.val();

            if (commentsData) {
                const newCommentsRef = dbRef(database, `${COMMENTS_DB_PATH}${targetColumnId}/${newImageRef.key}`); // Use new image ID
                await set(newCommentsRef, commentsData);
                await remove(commentsRef); // Delete old comments
            }

            alert('Изображение успешно перемещено!');
        } else {
            alert('Изображение для перемещения не найдено.');
        }
    } catch (error) {
        console.error("Ошибка перемещения изображения:", error);
        alert('Ошибка перемещения изображения: ' + error.message);
    }
}


// --- Carousel Swipe/Drag Logic ---
function setTranslate(xPos) {
    if (modalImageCarousel) {
        modalImageCarousel.style.transform = `translateX(${xPos}px)`;
    }
}

function touchStart(event) {
    const carouselWidth = modalImageCarousel ? modalImageCarousel.offsetWidth : 0;
    // Set initial position to effectively "center" the current image within the visual carousel.
    // This is important because the carousel always has 3 images (prev, current, next)
    // and we want the 'current' image to be at the second slot, which means an offset of one carousel width.
    currentTranslate = -carouselWidth; 
    prevTranslate = currentTranslate;
    setTranslate(currentTranslate);


    isDragging = true;
    startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    animationID = requestAnimationFrame(animation);
    if (modalImageCarousel) {
        modalImageCarousel.style.transition = 'none';
    }
}

function touchEnd() {
    cancelAnimationFrame(animationID);
    isDragging = false;

    if (!modalImageCarousel) return;

    const movedBy = currentTranslate - prevTranslate;

    // Determine swipe threshold based on carousel width
    const swipeThreshold = modalImageCarousel.offsetWidth * 0.25; // 25% of carousel width

    if (movedBy < -swipeThreshold && currentImageIndex < imageList.length - 1) {
        currentImageIndex++; // Swipe left, go to next image
    } else if (movedBy > swipeThreshold && currentImageIndex > 0) {
        currentImageIndex--; // Swipe right, go to previous image
    }

    // After determining the new index, snap to the correct position
    // Temporarily disable transition for immediate snap
    modalImageCarousel.style.transition = 'none'; 
    currentTranslate = -modalImageCarousel.offsetWidth; // Reset to the "center" image position
    setTranslate(currentTranslate);
    updateCarouselImages(currentImageIndex);

    // Re-enable transition for subsequent smooth movements
    setTimeout(() => {
        if (modalImageCarousel) {
            modalImageCarousel.style.transition = 'transform 0.3s ease-out';
        }
    }, 0);
}


function touchMove(event) {
    if (!isDragging) return;

    const currentPosition = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    const diff = currentPosition - startX;
    // Update currentTranslate relative to the initial "centered" position, allowing drag movement
    currentTranslate = prevTranslate + diff; 
}

function animation() {
    setTranslate(currentTranslate);
    if (isDragging) {
        requestAnimationFrame(animation);
    }
}

// Handle keyboard navigation for modal
document.addEventListener('keydown', (e) => {
    if (imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            navigateCarousel(-1);
        } else if (e.key === 'ArrowRight') {
            navigateCarousel(1);
        }
    }
});

// Prevent background scroll when modal is open, but allow scrolling within comments and carousel
document.addEventListener('touchmove', (event) => {
    if (imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
        const isTargetComments = commentsList.contains(event.target) || event.target === commentsList;
        const isTargetCarousel = modalImageCarousel && (modalImageCarousel.contains(event.target) || event.target === modalImageCarousel);

        // If it's a swipe on the carousel and we are dragging, allow it to work
        if (isTargetCarousel && isDragging) {
            return;
        }
        // If the target is the comments list and it's scrollable, allow it to work
        if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
            return;
        }
        // Otherwise, prevent background scroll
        event.preventDefault();
    }
}, { passive: false });
