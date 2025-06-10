// main-page.js

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";


// Firebase Config (Ваши данные)
const firebaseConfig = {
    apiKey: "AIzaSyDIMvnTxfnpDr72fIIexWcO2Jl0_fqM7tw",
    authDomain: "ever-together.firebaseapp.com",
    databaseURL: "https://ever-together-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ever-together",
    storageBucket: "ever-together.appspot.com",
    messagingSenderId: "333503123875",
    appId: "1:333503123875:web:313a63c0d9f0093f05ca16"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth();

// --- Глобальные ссылки на элементы DOM ---
const imageModalGlobalRef = document.getElementById('imageModal');
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');
const modalImageElement = document.getElementById('modalImage');
const modalActionsContainer = document.querySelector('.modal-actions-container');
const imageContainerGlobalRef = document.querySelector('.image-container');
const imageInfo = document.getElementById('imageInfo');

// Ссылки на колонки для очистки и добавления
const leftColumn = document.getElementById('leftColumn');
const centerColumn = document.getElementById('centerColumn');
const rightColumn = document.getElementById('rightColumn');

// Глобальная переменная для отслеживания текущего открытого image-wrapper в модальном окне
let currentImageWrapper = null;

document.addEventListener('DOMContentLoaded', () => {
    // Проверка авторизации при загрузке страницы
    console.log("[main-page.js] Вызов onAuthStateChanged...");
    onAuthStateChanged(auth, (user) => {
        const isAuthPage = window.location.pathname.includes("entry.html") ||
                           window.location.pathname.includes("registration.html");

        if (user) {
            console.log(`[main-page.js] Пользователь авторизован: ${user.email}.`);
            window.currentUser = user.email;
            if (isAuthPage) {
                console.log("[main-page.js] Авторизованный пользователь на странице входа. Перенаправление на main-page.html.");
                window.location.href = "main-page.html";
            } else {
                loadImagesFromFirebase();
            }
        } else {
            console.log("[main-page.js] Пользователь не авторизован.");
            if (!isAuthPage) {
                console.log("[main-page.js] Неавторизованный пользователь не на странице входа. Перенаправление на entry.html.");
                window.location.href = "entry.html";
            }
        }
    });

    // Инициализация файлового ввода для загрузки
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Обновляем селектор кнопок загрузки (они теперь в top-upload-buttons-container)
    const uploadButtons = document.querySelectorAll('.top-upload-buttons-container button[id^="upload"]');
    uploadButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const column = button.id.replace('upload', '').toLowerCase(); // 'left', 'center', 'right'
            fileInput.dataset.column = column; // Сохраняем целевую колонку
            fileInput.click(); // Открываем диалог выбора файла
        });
    });

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
                            console.warn("[main-page.js] Не удалось распарсить JSON ошибки Cloudinary.", e);
                        }
                        console.error(`[main-page.js] Ошибка Cloudinary при загрузке ${file.name}: ${errorDetails}`);
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
            event.target.value = null;
            console.log("[main-page.js] Пакетная загрузка завершена.");
        }
    });

    // Загрузка изображений из Firebase
    function loadImagesFromFirebase() {
        console.log("[main-page.js] Функция loadImagesFromFirebase запущена. Ожидание данных из Firebase...");
        const imagesRef = dbRef(database, 'images');

        onValue(imagesRef, (snapshot) => {
            console.log("[main-page.js] onValue: Получен snapshot данных из Firebase.");
            const data = snapshot.val();
            
            // Очищаем ВСЕ колонки перед полной перерисовкой
            console.log("[main-page.js] Полная очистка всех колонок перед обновлением.");
            leftColumn.innerHTML = '';
            centerColumn.innerHTML = '';
            rightColumn.innerHTML = '';

            if (data) {
                console.log("[main-page.js] Данные изображений из Firebase:", data);
                const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                
                imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                console.log(`[main-page.js] Найдено ${imageArray.length} изображений. Начинаем отображение.`);
                
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
                        console.warn(`[main-page.js] Предупреждение: Колонка "${targetColumnName}" не найдена для изображения ID: ${imgData.id}`);
                    }
                });
                
                leftColumn.appendChild(fragments.left);
                centerColumn.appendChild(fragments.center);
                rightColumn.appendChild(fragments.right);
                
                console.log("[main-page.js] Все изображения обновлены в DOM.");

            } else {
                console.log("[main-page.js] В базе данных Firebase нет записей об изображениях.");
            }
        }, (error) => {
            console.error("[main-page.js] Ошибка при получении данных из Firebase Realtime Database:", error);
            alert("Ошибка загрузки данных из базы данных. Проверьте консоль разработчика.");
        });
    }

    function createImageElement(imageData, imageId) {
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.dataset.timestamp = imageData.timestamp;
        // Удалено: imageWrapper.dataset.views = imageData.views || 0;
        imageWrapper.dataset.id = imageId;
        imageWrapper.dataset.columnOrigin = imageData.column; // Используем columnOrigin для ясности

        const img = document.createElement('img');
        img.src = imageData.url;
        img.classList.add('thumbnail');
        img.alt = 'Gallery Image';
        img.loading = 'lazy';
        img.setAttribute('crossorigin', 'anonymous');
        // Удалено: img.dataset.id = imageId;
        // Удалено: img.dataset.column = imageData.column;

        img.onload = () => {
            img.classList.add('loaded');
        };

        img.onerror = (e) => {
            console.error(`[main-page.js] ОШИБКА ЗАГРУЗКИ ИЗОБРАЖЕНИЯ: ${img.src} (ID: ${imageId})`, e);
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

    // Открытие модального окна
    function openModal(imageWrapper) {
        if (!imageWrapper) {
            console.error("[main-page.js] openModal: imageWrapper не предоставлен.");
            return;
        }
        currentImageWrapper = imageWrapper;
        const imgElement = imageWrapper.querySelector('img');

        console.log("[main-page.js] Открытие модального окна для изображения:", imgElement.src);
        if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo) {
            console.error("[main-page.js] ОШИБКА: Не найдены все необходимые элементы модального окна в HTML. Проверьте ID.");
            return;
        }

        imageModalGlobalRef.classList.add('show-modal');
        optionsDropdownGlobalRef.style.display = 'none';

        modalImageElement.src = imgElement.src;
        modalImageElement.dataset.id = imageWrapper.dataset.id;
        modalImageElement.setAttribute('crossorigin', 'anonymous');
        
        imageInfo.innerHTML = '';

        // Удален весь код, отвечающий за логику подсчета просмотров
        // const imageId = imageWrapper.dataset.id;
        // const column = imageWrapper.dataset.columnOrigin;
        // let currentViews = parseInt(imageWrapper.dataset.views) || 0;
        // const userIsAretren = window.currentUser === 'aretren@gmail.com';
        // const userIsChoisalery = window.currentUser === 'choisalery@gmail.com';
        // let shouldIncrementView = false;
        // if (column === 'left' && userIsAretren) {
        //     shouldIncrementView = true;
        // } else if (column === 'right' && userIsChoisalery) {
        //     shouldIncrementView = true;
        // } else if (column === 'center' && (userIsAretren || userIsChoisalery)) {
        //     shouldIncrementView = true;
        // }
        // if (shouldIncrementView) {
        //     currentViews += 1;
        //     const imageRefDB = dbRef(database, `images/${imageId}`);
        //     update(imageRefDB, { views: currentViews })
        //         .then(() => {
        //             console.log(`[main-page.js] Просмотр для ${imageId} обновлен до ${currentViews}.`);
        //             imageWrapper.dataset.views = currentViews;
        //         })
        //         .catch(error => {
        //             console.error(`[main-page.js] Ошибка обновления просмотров для ${imageId}:`, error);
        //         });
        // }

        // Блокируем взаимодействие с фоном
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'none';
        }
    }

    // Функция для переключения дропдауна опций
    function toggleOptionsDropdown() {
        if (!currentImageWrapper) {
            console.warn("[main-page.js] toggleOptionsDropdown: currentImageWrapper не установлен.");
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
                console.log(`[main-page.js] Изображение ${imageId} перемещено в ${targetColumnId} в Firebase.`);
            })
            .catch(error => {
                console.error("[main-page.js] Ошибка перемещения изображения в Firebase:", error);
            });
    }

    function deleteImage(imageId) {
        remove(dbRef(database, `images/${imageId}`))
            .then(() => {
                console.log("[main-page.js] Изображение удалено из Firebase:", imageId);
            })
            .catch(error => {
                console.error("[main-page.js] Ошибка удаления изображения из Firebase:", error);
            });
    }

    // Функция закрытия модального окна
    function closeModal() {
        console.log("[main-page.js] Закрытие модального окна.");
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

        document.body.style.overflow = '';
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'auto';
        }
        currentImageWrapper = null;
    }

    // --- Обработчики событий для модального окна и дропдауна (привязываются один раз) ---

    // Обработчик для кнопки "..."
    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleOptionsDropdown();
    });

    // Обработчик для закрытия модального окна по клику вне контента
    imageModalGlobalRef.addEventListener('click', (event) => {
        if (event.target === imageModalGlobalRef) {
            console.log("[main-page.js] Клик по фону модального окна, закрываем модальное окно.");
            closeModal();
        }
    });

    // Обработчик для закрытия дропдауна при клике вне его
    document.addEventListener('click', (event) => {
        if (optionsDropdownGlobalRef.style.display === 'block') {
            if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
                optionsDropdownGlobalRef.style.display = 'none';
                optionsDropdownGlobalRef.classList.remove('show');
                console.log("[main-page.js] Клик вне дропдауна/кнопки, закрываем дропдаун.");
            }
        }
    });

    // Обработчик для закрытия модального окна по нажатию ESC
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
            console.log("[main-page.js] Нажата ESC, закрываем модальное окно.");
            closeModal();
        }
    });

    // Исправление для iOS: предотвращение прокрутки фона при открытом модальном окне
    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            event.preventDefault();
        }
    }, { passive: false });
});

// Удалена функция getColumnViews, так как она связана с подсчетом просмотров
// function getColumnViews(columnName) {
//     const columnElement = document.getElementById(columnName + 'Column');
//     if (!columnElement) {
//         console.warn(`[main-page.js] Колонка с ID "${columnName}Column" не найдена для подсчета просмотров.`);
//         return 0;
//     }
//     const images = columnElement.querySelectorAll('.image-wrapper');
//     return Array.from(images).reduce((acc, wrapper) => acc + (parseInt(wrapper.dataset.views) || 0), 0);
// }
