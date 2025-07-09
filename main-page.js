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
const modalImageCarousel = document.getElementById('modalImageCarousel'); // Предполагаемый ID элемента карусели
const prevImageBtn = document.getElementById('prevImage');
const nextImageBtn = document.getElementById('nextImage');

// Элементы модального окна
const modalImage = document.getElementById('modalImage');
const imageInfoDiv = document.getElementById('imageInfo');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');
const userNameSpan = document.getElementById('userName');

let currentIndex = 0;
let imageList = [];
let isDragging = false;
let startPos = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationID;


// Функция-помощник для получения элементов по ID
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with ID "${id}" not found.`);
        // Можно выбросить ошибку или вернуть null, в зависимости от желаемого поведения
        return null;
    }
    return element;
}


// Firebase Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        userNameSpan.textContent = user.displayName || user.email;
        console.log("User is signed in:", user.email);
    } else {
        userNameSpan.textContent = 'Guest';
        console.log("No user is signed in.");
        // Redirect to login or show login button
        window.location.href = 'index.html'; // Assuming index.html is your login page
    }
});

// Logout function
window.logout = () => {
    signOut(auth).then(() => {
        console.log("User signed out.");
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
};


// Image Upload
document.getElementById('uploadLeft')?.addEventListener('click', () => triggerUpload('left'));
document.getElementById('uploadCenter')?.addEventListener('click', () => triggerUpload('center'));
document.getElementById('uploadRight')?.addEventListener('click', () => triggerUpload('right'));

function triggerUpload(column) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            uploadImage(file, column);
        }
    };
    input.click();
}

async function uploadImage(file, column) {
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`images/${column}/${file.name}`);
    await fileRef.put(file);
    const fileUrl = await fileRef.getDownloadURL();
    const newImageRef = push(dbRef(database, `images/${column}`));
    await set(newImageRef, {
        url: fileUrl,
        timestamp: Date.now()
    });
    console.log("Image uploaded to Firebase:", fileUrl);
}

// Image Display
onValue(dbRef(database, 'images'), (snapshot) => {
    const imagesData = snapshot.val() || {};
    imageList = [];
    ['left', 'center', 'right'].forEach(column => {
        const columnData = imagesData[column] || {};
        for (const id in columnData) {
            imageList.push({ id, ...columnData[id], column });
        }
    });
    imageList.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

    renderImages();
});


function renderImages() {
    document.getElementById('leftColumn').innerHTML = '';
    document.getElementById('centerColumn').innerHTML = '';
    document.getElementById('rightColumn').innerHTML = '';

    imageList.forEach((image, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = image.url;
        imgElement.alt = 'Gallery image';
        imgElement.dataset.id = image.id;
        imgElement.dataset.column = image.column;
        imgElement.dataset.index = index; // Store global index

        imgElement.addEventListener('click', () => openModal(index));

        // Get the correct column element using getElement
        const columnElement = getElement(`${image.column}Column`);
        if (columnElement) {
            columnElement.appendChild(imgElement);
        }
    });
}


// Modal functionality
function openModal(index) {
    currentIndex = index;
    updateCarouselImages(currentIndex);
    imageModalGlobalRef.classList.add('show-modal');
    document.body.style.overflow = 'hidden'; // Prevent scrolling background
}

function closeModal() {
    imageModalGlobalRef.classList.remove('show-modal');
    document.body.style.overflow = ''; // Re-enable scrolling
}

// Close modal when clicking outside of the content
imageModalGlobalRef.addEventListener('click', (e) => {
    if (e.target === imageModalGlobalRef) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModalGlobalRef.classList.contains('show-modal')) {
        closeModal();
    }
});


// Carousel functionality within modal
function updateCarouselImages(index) {
    modalImageCarousel.innerHTML = ''; // Clear existing images
    const imagesToDisplay = [];

    // Add previous image
    if (index > 0) {
        imagesToDisplay.push(imageList[index - 1]);
    } else {
        imagesToDisplay.push(null); // Placeholder for seamless loop
    }

    // Add current image
    imagesToDisplay.push(imageList[index]);

    // Add next image
    if (index < imageList.length - 1) {
        imagesToDisplay.push(imageList[index + 1]);
    } else {
        imagesToDisplay.push(null); // Placeholder for seamless loop
    }

    imagesToDisplay.forEach(imgData => {
        const imgElement = document.createElement('img');
        imgElement.classList.add('carousel-image');
        if (imgData) {
            imgElement.src = imgData.url;
            imgElement.alt = 'Carousel image';
            imgElement.dataset.id = imgData.id;
        } else {
            imgElement.src = ''; // Empty src for placeholder
            imgElement.alt = '';
        }
        modalImageCarousel.appendChild(imgElement);
    });

    // Snap to the middle image after updating
    const carouselWidth = modalImageCarousel.offsetWidth;
    currentTranslate = -carouselWidth; // This assumes carouselWidth is the width of one image + gap
    setTranslate(currentTranslate);
}


function setTranslate(position) {
    modalImageCarousel.style.transform = `translateX(${position}px)`;
}

// Drag functionality for carousel
modalImageCarousel.addEventListener('touchstart', (e) => {
    if (!imageModalGlobalRef.classList.contains('show-modal')) return;
    startPos = e.touches[0].clientX;
    isDragging = true;
    animationID = requestAnimationFrame(animation);
    modalImageCarousel.style.transition = 'none';
});

modalImageCarousel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const currentTouch = e.touches[0].clientX;
    const diff = currentTouch - startPos;
    currentTranslate = prevTranslate + diff;
});

modalImageCarousel.addEventListener('touchend', () => {
    cancelAnimationFrame(animationID);
    isDragging = false;
    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -100 && currentIndex < imageList.length - 1) {
        currentIndex++;
    } else if (movedBy > 100 && currentIndex > 0) {
        currentIndex--;
    }

    setPositionByIndex();
});

modalImageCarousel.addEventListener('touchleave', () => {
    cancelAnimationFrame(animationID);
    isDragging = false;
    setPositionByIndex();
});

function animation() {
    setTranslate(currentTranslate);
    if (isDragging) requestAnimationFrame(animation);
}

function setPositionByIndex() {
    const carouselWidth = modalImageCarousel.children[0]?.offsetWidth || 0;
    const gap = 40; // Assuming 40px gap as per CSS
    // Recalculate currentTranslate to snap to the correct image after drag/swipe
    // The target position for the *current* image (middle one in the 3-image carousel)
    // should be such that its left edge aligns after the first placeholder image.
    // So, we need to translate by (width of prev image + gap)
    currentTranslate = -(carouselWidth + gap);

    modalImageCarousel.style.transition = 'transform 0.3s ease-out';
    setTranslate(currentTranslate);
    prevTranslate = currentTranslate;
    updateCarouselImages(currentIndex); // Re-render carousel for the new currentIndex
}


prevImageBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
        currentIndex--;
        updateCarouselImages(currentIndex);
    }
});

nextImageBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < imageList.length - 1) {
        currentIndex++;
        updateCarouselImages(currentIndex);
    }
});


// More Options Dropdown
moreOptionsButtonGlobalRef?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent modal from closing
    optionsDropdownGlobalRef.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!moreOptionsButtonGlobalRef?.contains(e.target) && !optionsDropdownGlobalRef?.contains(e.target)) {
        optionsDropdownGlobalRef.classList.remove('show');
    }
});

optionsDropdownGlobalRef?.addEventListener('click', (e) => {
    e.stopPropagation(); // Keep dropdown open for clicks inside
    const action = e.target.dataset.action;
    const targetColumn = e.target.dataset.column;

    if (action && imageList[currentIndex]) {
        const imageId = imageList[currentIndex].id;
        const currentColumn = imageList[currentIndex].column;

        if (action === 'delete') {
            deleteImage(currentColumn, imageId);
        } else if (action === 'move' && targetColumn) {
            moveImage(currentColumn, imageId, targetColumn);
        }
        optionsDropdownGlobalRef.classList.remove('show'); // Close after action
    }
});

async function deleteImage(column, id) {
    // Delete from Firebase Storage (optional, depends on your needs)
    // const storageRef = firebase.storage().ref();
    // const imageRef = storageRef.child(`images/${column}/${imageName}`);
    // await imageRef.delete();

    await remove(dbRef(database, `images/${column}/${id}`));
    console.log(`Image ${id} deleted from ${column}.`);
    closeModal(); // Close modal after deleting
}

async function moveImage(oldColumn, imageId, newColumn) {
    const imageToMove = imageList.find(img => img.id === imageId && img.column === oldColumn);
    if (!imageToMove) {
        console.error("Image not found for moving.");
        return;
    }

    // Remove from old location
    await remove(dbRef(database, `images/${oldColumn}/${imageId}`));

    // Add to new location
    await set(dbRef(database, `images/${newColumn}/${imageId}`), {
        url: imageToMove.url,
        timestamp: imageToMove.timestamp
    });

    console.log(`Image ${imageId} moved from ${oldColumn} to ${newColumn}.`);
    closeModal(); // Close modal after moving
}


// Comments functionality
sendCommentBtn?.addEventListener('click', () => {
    const commentText = commentInput.value.trim();
    if (commentText && imageList[currentIndex]) {
        const imageId = imageList[currentIndex].id;
        const user = auth.currentUser;
        if (user) {
            addComment(imageId, user.displayName || user.email, commentText);
            commentInput.value = '';
        } else {
            alert("Пожалуйста, войдите, чтобы оставить комментарий.");
        }
    }
});

function addComment(imageId, author, text) {
    const newCommentRef = push(dbRef(database, `comments/${imageId}`));
    set(newCommentRef, {
        author,
        text,
        timestamp: Date.now()
    }).then(() => {
        console.log("Comment added.");
    }).catch((error) => {
        console.error("Error adding comment: ", error);
    });
}

// Display comments for the current image in the modal
onValue(dbRef(database, 'comments'), (snapshot) => {
    if (!imageModalGlobalRef.classList.contains('show-modal') || !imageList[currentIndex]) return;

    const commentsData = snapshot.val() || {};
    const currentImageId = imageList[currentIndex]?.id;
    const imageComments = commentsData[currentImageId] || {};

    commentsList.innerHTML = ''; // Clear existing comments

    if (Object.keys(imageComments).length === 0) {
        commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев.</p>';
    } else {
        const sortedComments = Object.values(imageComments).sort((a, b) => a.timestamp - b.timestamp);
        sortedComments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            commentElement.innerHTML = `
                <span class="comment-author">${comment.author}:</span>
                <span class="comment-text">${comment.text}</span>
            `;
            commentsList.appendChild(commentElement);
        });
    }
});


// Touch events for full modal background (to prevent scrolling)
imageModalGlobalRef.addEventListener('touchstart', (event) => {
    if (imageModalGlobalRef.classList.contains('show-modal')) {
        // Prevent scrolling on the background when modal is open
        document.body.style.overflow = 'hidden';
    }
}, { passive: false }); // Use passive: false to allow preventDefault

imageModalGlobalRef.addEventListener('touchend', (event) => {
    if (!imageModalGlobalRef.classList.contains('show-modal')) {
        // Restore scrolling when modal is closed
        document.body.style.overflow = '';
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
