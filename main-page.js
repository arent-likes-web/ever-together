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
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const prevImage = document.getElementById('prevImage');
const nextImage = document.getElementById('nextImage');
const imageInfoDiv = document.getElementById('imageInfo');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');
const moreOptionsButton = document.getElementById('moreOptionsButton');
const optionsDropdown = document.getElementById('optionsDropdown');
const prevImageButton = document.getElementById('prevImageButton');
const nextImageButton = document.getElementById('nextImageButton');
const modalImageCarousel = document.getElementById('modal-image-carousel');


// === Global Variables ===
let currentUserId = null;
let currentUserName = "Гость";
let imagesData = {
    "left": [],
    "center": [],
    "right": []
};
let currentImageIndex = 0; // Index of the currently viewed image in the modal
let currentColumnId = null; // Column of the currently viewed image
let currentImageKey = null; // Key of the currently viewed image in Firebase
let currentImageUrl = null; // URL of the currently viewed image

// Carousel drag variables
let isDragging = false;
let startPos = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationId;
let carouselWidth; // Will be set dynamically based on actual carousel container width

// === Utility Functions ===

// Throttling function to limit how often a function can run
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Sets the transform style for the carousel
function setTranslate(translate) {
    modalImageCarousel.style.transform = `translateX(${translate}px)`;
}

// Animation loop for smooth dragging
function animation() {
    setTranslate(currentTranslate);
    if (isDragging) requestAnimationFrame(animation);
}

// Snaps the carousel to the correct image after drag ends
function snapToImage() {
    // Determine which image we landed on
    const movedBy = currentTranslate - prevTranslate;
    const threshold = carouselWidth * 0.25; // Move threshold (e.g., 25% of image width)

    if (movedBy < -threshold && currentImageIndex < imagesData[currentColumnId].length - 1) {
        // Swiped left, go to next image
        currentImageIndex++;
    } else if (movedBy > threshold && currentImageIndex > 0) {
        // Swiped right, go to previous image
        currentImageIndex--;
    }

    // Update carousel images and reset translation
    updateCarouselImages(currentImageIndex);

    // After updating, reset the carousel to be centered on the current image
    currentTranslate = -carouselWidth;
    modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Re-enable transition for snap
    setTranslate(currentTranslate);
    prevTranslate = currentTranslate;
}

// Function to update carousel images based on currentImageIndex
function updateCarouselImages(index) {
    const images = imagesData[currentColumnId];
    if (!images || images.length === 0) {
        prevImage.src = '';
        modalImage.src = '';
        nextImage.src = '';
        prevImage.classList.remove('loaded');
        modalImage.classList.remove('loaded');
        nextImage.classList.remove('loaded');
        imageInfoDiv.textContent = 'Изображений нет.';
        prevImageButton.style.display = 'none';
        nextImageButton.style.display = 'none';
        modalImageCarousel.style.transform = `translateX(0)`; // Reset carousel position
        return;
    }

    // Set correct display for nav buttons
    prevImageButton.style.display = (index > 0) ? 'flex' : 'none';
    nextImageButton.style.display = (index < images.length - 1) ? 'flex' : 'none';

    // Current image
    const currentImageData = images[index];
    currentImageKey = currentImageData.key;
    currentImageUrl = currentImageData.url;

    // Previous image
    const prevImageData = images[index - 1];
    // Next image
    const nextImageData = images[index + 1];

    // Reset loaded class and src
    prevImage.classList.remove('loaded');
    modalImage.classList.remove('loaded');
    nextImage.classList.remove('loaded');
    prevImage.src = '';
    modalImage.src = '';
    nextImage.src = '';

    // Function to load image with fallback for errors
    const loadImage = (imgElement, url, altText) => {
        imgElement.alt = altText;
        if (url) {
            imgElement.crossOrigin = "anonymous"; // Needed for images from Cloudinary or other CDN for canvas/etc.
            imgElement.src = url;
            imgElement.onload = () => {
                imgElement.classList.add('loaded');
                // Check if this is the modalImage being loaded and adjust carousel
                if (imgElement === modalImage) {
                    currentTranslate = -carouselWidth; // Ensure it's always centered on load
                    setTranslate(currentTranslate);
                }
            };
            imgElement.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                imgElement.src = ''; // Clear broken src
                imgElement.alt = 'Ошибка загрузки';
                imgElement.classList.remove('loaded');
                // Optionally display a placeholder or error message on the image itself
                // For example, add a class to imgElement and style it to show a broken image icon
            };
        } else {
            imgElement.alt = ''; // Clear alt text if no image
        }
    };

    // Load images
    loadImage(prevImage, prevImageData ? prevImageData.url : '', 'Предыдущее изображение');
    loadImage(modalImage, currentImageData.url, 'Текущее изображение');
    loadImage(nextImage, nextImageData ? nextImageData.url : '', 'Следующее изображение');

    // Update info
    imageInfoDiv.textContent = `Изображение ${index + 1} из ${images.length}`;
    updateComments(currentImageKey);
}

// Handle carousel navigation
function navigateCarousel(direction) {
    let newIndex = currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < imagesData[currentColumnId].length) {
        currentImageIndex = newIndex;
        // Disable transition temporarily for instant snap to next/prev image slot
        modalImageCarousel.style.transition = 'none';
        currentTranslate = -carouselWidth - (direction * carouselWidth); // Move to new slot instantly
        setTranslate(currentTranslate);
        prevTranslate = currentTranslate;

        // Force a reflow to ensure the non-transitioned movement happens before re-enabling transition
        modalImageCarousel.offsetWidth;

        // Then, update the images. This will correctly center the new modalImage
        updateCarouselImages(currentImageIndex);

        // Re-enable transition after the snap
        setTimeout(() => {
            modalImageCarousel.style.transition = 'transform 0.3s ease-out';
        }, 0);
    }
}


// === Image Rendering ===

// Renders images into a specific column
function renderImages(columnId, images) {
    const columnElement = document.getElementById(columnId);
    columnElement.innerHTML = ''; // Clear existing images
    images.forEach(img => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.dataset.key = img.key;
        wrapper.dataset.column = columnId;

        const imgElement = document.createElement('img');
        imgElement.src = img.url;
        imgElement.alt = img.name || 'Галерея';

        // Add loaded class when image loads
        imgElement.onload = () => {
            imgElement.classList.add('loaded');
            // Hide spinner or placeholder if you have one
        };
        imgElement.onerror = () => {
            console.error(`Error loading image from URL: ${img.url}`);
            wrapper.classList.add('image-load-error'); // Add error class for styling
            imgElement.alt = 'Ошибка загрузки изображения';
            imgElement.src = ''; // Clear broken image src
        };

        wrapper.appendChild(imgElement);
        columnElement.appendChild(wrapper);

        wrapper.addEventListener('click', () => {
            openModal(img.key, columnId);
        });
    });
}

// === Modal Functions ===

function openModal(imageKey, column) {
    currentColumnId = column;
    const imagesInColumn = imagesData[column];
    currentImageIndex = imagesInColumn.findIndex(img => img.key === imageKey);

    if (currentImageIndex === -1) {
        console.error("Image not found in the current column.");
        return;
    }

    // Calculate carousel width once modal is visible
    imageModal.classList.add('show-modal');
    // Ensure modal is visible and rendered before getting offsetWidth
    requestAnimationFrame(() => {
        carouselWidth = modalImageCarousel.offsetWidth / 3; // Width of one image slot

        // Initial setup for carousel: center the current image
        currentTranslate = -carouselWidth; // Start with modalImage centered
        prevTranslate = currentTranslate;
        setTranslate(currentTranslate); // Apply initial centering
        modalImageCarousel.style.transition = 'transform 0.3s ease-out'; // Ensure transition is on

        updateCarouselImages(currentImageIndex);
    });
    
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeModal() {
    imageModal.classList.add('hide-modal');
    imageModal.classList.remove('show-modal');
    // Allow animation to play before hiding
    imageModal.addEventListener('animationend', () => {
        imageModal.classList.remove('hide-modal');
        document.body.style.overflow = ''; // Restore background scroll
    }, { once: true });

    // Hide dropdown just in case
    optionsDropdown.style.display = 'none';
}

// === Image Upload Logic ===

function uploadImage(file, columnId) {
    if (!currentUserId) {
        alert("Пожалуйста, войдите, чтобы загружать изображения.");
        return;
    }

    const imageRef = storageRef(storage, `images/${currentUserId}/${columnId}/${file.name}-${Date.now()}`);
    const uploadTask = uploadBytesResumable(imageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress}% done`);
            // You can add UI feedback for progress here
        },
        (error) => {
            console.error("Upload failed:", error);
            alert("Ошибка при загрузке изображения.");
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                const newImageRef = push(dbRef(database, `users/${currentUserId}/images/${columnId}`));
                set(newImageRef, {
                    url: downloadURL,
                    name: file.name,
                    timestamp: Date.now(),
                    uploadedBy: currentUserName,
                    comments: {} // Initialize comments object
                }).then(() => {
                    console.log("Image data saved to database.");
                    // Data will be re-rendered by onValue listener
                }).catch((error) => {
                    console.error("Error saving image data:", error);
                    alert("Ошибка при сохранении данных изображения.");
                });
            });
        }
    );
}

// Attach file input listeners
function setupUploadButtons() {
    [uploadLeftBtn, uploadCenterBtn, uploadRightBtn].forEach(button => {
        button.addEventListener('click', () => {
            if (!currentUserId) {
                alert("Пожалуйста, войдите, чтобы загружать изображения.");
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadImage(file, button.id.replace('upload', '').toLowerCase());
                }
            };
            input.click();
        });
    });
}

// === Comments Logic ===

function updateComments(imageKey) {
    commentsList.innerHTML = ''; // Clear existing comments
    const imageRef = dbRef(database, `users/${currentUserId}/images/${currentColumnId}/${imageKey}/comments`);
    onValue(imageRef, (snapshot) => {
        commentsList.innerHTML = ''; // Clear before re-rendering
        const comments = snapshot.val();
        if (comments) {
            const commentArray = Object.values(comments).sort((a, b) => a.timestamp - b.timestamp);
            commentArray.forEach(comment => {
                const p = document.createElement('p');
                p.textContent = `${comment.userName}: ${comment.text}`;
                commentsList.appendChild(p);
            });
        } else {
            commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев.</p>';
        }
        // Scroll to bottom of comments list
        commentsList.scrollTop = commentsList.scrollHeight;
    });
}

sendCommentBtn.addEventListener('click', () => {
    const commentText = commentInput.value.trim();
    if (commentText && currentImageKey && currentUserId) {
        const commentRef = push(dbRef(database, `users/${currentUserId}/images/${currentColumnId}/${currentImageKey}/comments`));
        set(commentRef, {
            text: commentText,
            timestamp: Date.now(),
            userName: currentUserName
        }).then(() => {
            commentInput.value = ''; // Clear input
            // Comments will be updated by onValue listener
        }).catch((error) => {
            console.error("Error sending comment:", error);
            alert("Ошибка при отправке комментария.");
        });
    } else {
        alert("Комментарий не может быть пустым.");
    }
});

// === Image Actions (Delete/Move) ===

moreOptionsButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent modal from closing immediately
    optionsDropdown.style.display = optionsDropdown.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', (event) => {
    if (!optionsDropdown.contains(event.target) && event.target !== moreOptionsButton) {
        optionsDropdown.style.display = 'none';
    }
});

optionsDropdown.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action || !currentImageKey || !currentColumnId || !currentUserId) return;

    if (action === 'delete') {
        if (confirm("Вы уверены, что хотите удалить это изображение?")) {
            // Delete from Storage
            const imgData = imagesData[currentColumnId].find(img => img.key === currentImageKey);
            if (imgData && imgData.url) {
                const imgStorageRef = storageRef(storage, imgData.url);
                deleteObject(imgStorageRef).then(() => {
                    console.log("Image deleted from storage.");
                }).catch((error) => {
                    console.error("Error deleting image from storage:", error);
                    alert("Ошибка при удалении изображения из хранилища.");
                });
            }

            // Delete from Database
            remove(dbRef(database, `users/${currentUserId}/images/${currentColumnId}/${currentImageKey}`))
                .then(() => {
                    console.log("Image data deleted from database.");
                    closeModal();
                })
                .catch((error) => {
                    console.error("Error deleting image data:", error);
                    alert("Ошибка при удалении данных изображения.");
                });
        }
    } else if (action === 'move') {
        const targetColumnId = event.target.dataset.column;
        if (targetColumnId && targetColumnId !== currentColumnId) {
            const imgToMove = imagesData[currentColumnId].find(img => img.key === currentImageKey);
            if (imgToMove) {
                // Remove from old location
                remove(dbRef(database, `users/${currentUserId}/images/${currentColumnId}/${currentImageKey}`))
                    .then(() => {
                        // Add to new location
                        set(dbRef(database, `users/${currentUserId}/images/${targetColumnId}/${currentImageKey}`), imgToMove)
                            .then(() => {
                                console.log(`Image moved from ${currentColumnId} to ${targetColumnId}`);
                                closeModal(); // Close modal after move
                            })
                            .catch((error) => {
                                console.error("Error moving image:", error);
                                alert("Ошибка при перемещении изображения.");
                            });
                    })
                    .catch((error) => {
                        console.error("Error removing image from old column:", error);
                        alert("Ошибка при перемещении изображения.");
                    });
            }
        }
    }
    optionsDropdown.style.display = 'none'; // Hide dropdown after action
});

// === Authentication & Data Loading ===

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        // Fetch user's name or set a default
        const userRef = dbRef(database, `users/${currentUserId}/profile/name`);
        onValue(userRef, (snapshot) => {
            currentUserName = snapshot.val() || user.email || "Пользователь";
            userNameSpan.textContent = `Привет, ${currentUserName}!`;
        }, {
            onlyOnce: true
        });

        // Load images for all columns
        ['left', 'center', 'right'].forEach(columnId => {
            const columnRef = dbRef(database, `users/${currentUserId}/images/${columnId}`);
            onValue(columnRef, (snapshot) => {
                const images = [];
                snapshot.forEach((childSnapshot) => {
                    images.push({
                        key: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                imagesData[columnId] = images;
                renderImages(columnId, images);
            });
        });

        setupUploadButtons();

    } else {
        currentUserId = null;
        currentUserName = "Гость";
        userNameSpan.textContent = 'Вы не вошли';
        // Clear all columns if logged out
        leftColumn.innerHTML = '';
        centerColumn.innerHTML = '';
        rightColumn.innerHTML = '';
        alert("Вы не авторизованы. Пожалуйста, войдите.");
        // Redirect to login page or show login/signup options
        window.location.href = 'auth.html'; // Example redirect
    }
});


// === Event Listeners ===

closeModalButton.addEventListener('click', closeModal);

// Modal close on outside click (excluding modal content and options dropdown)
imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) {
        closeModal();
    }
});

// Keyboard navigation for carousel and modal close
document.addEventListener('keydown', (event) => {
    if (imageModal.classList.contains('show-modal')) {
        if (event.key === 'ArrowLeft') {
            navigateCarousel(-1);
        } else if (event.key === 'ArrowRight') {
            navigateCarousel(1);
        } else if (event.key === 'Escape') {
            closeModal();
        }
    }
});

prevImageButton.addEventListener('click', () => navigateCarousel(-1));
nextImageButton.addEventListener('click', () => navigateCarousel(1));

// === Carousel Drag/Swipe Functionality ===

modalImageCarousel.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startPos = e.clientX || e.touches[0].clientX;
    modalImageCarousel.style.transition = 'none'; // Disable transition during drag
    prevTranslate = currentTranslate;
    animationId = requestAnimationFrame(animation);
});

modalImageCarousel.addEventListener('pointermove', throttle((e) => {
    if (!isDragging) return;
    const currentPosition = e.clientX || e.touches[0].clientX;
    const diff = currentPosition - startPos;
    // Limit drag to within bounds of previous and next image slots
    const minTranslate = -2 * carouselWidth; // max left for previous image
    const maxTranslate = 0; // max right for next image

    let newTranslate = prevTranslate + diff;
    // Clamp the translation to prevent dragging too far
    if (newTranslate > maxTranslate + carouselWidth / 4) { // Add a small elastic effect beyond bounds
        newTranslate = maxTranslate + carouselWidth / 4;
    } else if (newTranslate < minTranslate - carouselWidth / 4) {
        newTranslate = minTranslate - carouselWidth / 4;
    }
    currentTranslate = newTranslate;

}, 100)); // Throttle to prevent performance issues

modalImageCarousel.addEventListener('pointerup', () => {
    if (!isDragging) return;
    cancelAnimationFrame(animationId);
    isDragging = false;
    snapToImage();
});

modalImageCarousel.addEventListener('pointerleave', () => {
    if (!isDragging) return;
    cancelAnimationFrame(animationId);
    isDragging = false;
    snapToImage();
});

// Update carouselWidth on window resize
window.addEventListener('resize', () => {
    if (imageModal.classList.contains('show-modal')) {
        carouselWidth = modalImageCarousel.offsetWidth / 3;
        // Re-center current image after resize
        currentTranslate = -carouselWidth;
        prevTranslate = currentTranslate;
        setTranslate(currentTranslate);
    }
});

// Prevent body scroll when modal is open, but allow comment scroll and carousel drag
imageModal.addEventListener('touchmove', (event) => {
    if (imageModal.classList.contains('show-modal')) {
        const isTargetComments = commentsList.contains(event.target) || event.target === commentsList;
        const isTargetCarousel = modalImageCarousel.contains(event.target) || modalImageCarousel.contains(event.target.parentNode);

        // Allow scroll if target is comments list and it's actually scrollable
        if (isTargetComments && commentsList.scrollHeight > commentsList.clientHeight) {
            return;
        }
        // Allow drag if target is carousel and we are dragging
        if (isTargetCarousel && isDragging) {
            return;
        }
        // Otherwise, prevent default scroll
        event.preventDefault();
    }
}, { passive: false });
