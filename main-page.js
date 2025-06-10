// main-page.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref as dbRef, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";


// Firebase Config (Ваши данные)
const firebaseConfig = {
    apiKey: "AIzaSyDIMvnTxfnpDr72fIIexWcO2Jl0_fqM777", // Убедитесь, что это ваш актуальный ключ
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
// ИСПРАВЛЕНО: optionsDropdownGlobalRef теперь ссылается на элемент с ID 'optionsDropdown'
const optionsDropdownGlobalRef = document.getElementById('optionsDropdown');
// ИСПРАВЛЕНО: moreOptionsButtonGlobalRef теперь ссылается на элемент с ID 'moreOptionsButton'
const moreOptionsButtonGlobalRef = document.getElementById('moreOptionsButton');
const modalImageElement = document.getElementById('modalImage');
const modalActionsContainer = document.querySelector('.modal-actions-container');
const imageContainerGlobalRef = document.querySelector('.image-container');
const imageInfo = document.getElementById('imageInfo');

// Ссылки на колонки для очистки и добавления (ИСПРАВЛЕНО: используются новые ID)
const himPeachColumn = document.getElementById('him-peach-column');
const ourDreamColumn = document.getElementById('our-dream-column');
const herCatColumn = document.getElementById('her-cat-column');

// Глобальная переменная для отслеживания текущего открытого image-wrapper в модальном окне
let currentImageWrapper = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- Кнопки загрузки изображений (обновленная логика) ---
    // Получаем все кнопки в контейнере загрузки
    const uploadButtons = document.querySelectorAll('.top-upload-buttons-container button[data-column-id]');

    uploadButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const columnId = button.dataset.columnId; // Получаем data-column-id
            triggerUpload(columnId); // Передаем его в triggerUpload
        });
    });

    function triggerUpload(columnId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true; // Разрешаем множественную загрузку
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                console.log(`[main-page.js] Начало пакетной загрузки ${files.length} файлов в колонку ${columnId}`);

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
                            const newImageRef = push(dbRef(database, 'images')); // Генерируем уникальный ключ
                            await set(newImageRef, {
                                url: cloudinaryData.secure_url,
                                timestamp: new Date().toISOString(),
                                views: 0,
                                column: columnId // Сохраняем целевую колонку в Firebase
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
                event.target.value = null; // Сбрасываем выбранные файлы
                console.log("[main-page.js] Пакетная загрузка завершена.");
            }
            document.body.removeChild(fileInput); // Удаляем input после использования
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    }

    // Проверка авторизации при загрузке страницы
    console.log("[main-page.js] Вызов onAuthStateChanged...");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log(`[main-page.js] Пользователь авторизован: ${user.email}. Загрузка изображений.`);
            window.currentUser = user.email; // Устанавливаем текущего пользователя
            loadImagesFromFirebase(); // Загружаем изображения
        } else {
            console.log("[main-page.js] Пользователь не авторизован. Перенаправление на страницу входа.");
            window.location.href = "entry.html"; // Перенаправляем, если нет авторизации
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
            himPeachColumn.innerHTML = ''; // ИСПРАВЛЕНО: используем новые ссылки
            ourDreamColumn.innerHTML = '';
            herCatColumn.innerHTML = '';

            if (data) {
                console.log("[main-page.js] Данные изображений из Firebase:", data);
                const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                
                // Сортируем по времени создания (новые сверху)
                imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                console.log(`[main-page.js] Найдено ${imageArray.length} изображений. Начинаем отображение.`);
                
                // Временные фрагменты для каждой колонки для эффективного DOM-манипулирования
                const fragments = {
                    'him-peach-column': document.createDocumentFragment(),
                    'our-dream-column': document.createDocumentFragment(),
                    'her-cat-column': document.createDocumentFragment()
                };

                imageArray.forEach((imgData) => {
                    const targetColumnId = imgData.column; // Получаем ID колонки из данных Firebase
                    const imageWrapper = createImageElement(imgData, imgData.id);
                    if (fragments[targetColumnId]) {
                        fragments[targetColumnId].appendChild(imageWrapper);
                    } else {
                        console.warn(`[main-page.js] Предупреждение: Колонка "${targetColumnId}" не найдена для изображения ID: ${imgData.id}`);
                    }
                });
                
                // Добавляем фрагменты в соответствующие колонки
                himPeachColumn.appendChild(fragments['him-peach-column']);
                ourDreamColumn.appendChild(fragments['our-dream-column']);
                herCatColumn.appendChild(fragments['her-cat-column']);
                
                console.log("[main-page.js] Все изображения обновлены в DOM.");

            } else {
                console.log("[main-page.js] В базе данных Firebase нет записей об изображениях.");
            }
        }, (error) => { // Обработчик ошибок для onValue
            console.error("[main-page.js] Ошибка при получении данных из Firebase Realtime Database:", error);
            alert("Ошибка загрузки данных из базы данных. Проверьте консоль разработчика.");
        });
    }

    // Изменена функция для создания элемента изображения (убрана дублирующая логика)
    function createImageElement(imageData, imageId) {
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.dataset.timestamp = imageData.timestamp;
        imageWrapper.dataset.views = imageData.views || 0;
        imageWrapper.dataset.id = imageId;
        imageWrapper.dataset.columnOrigin = imageData.column; // ИСПРАВЛЕНО: data-column-origin для перемещения

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

        // Добавляем кнопку "..." в каждый image-wrapper
        const moreOptionsBtn = document.createElement('button');
        moreOptionsBtn.className = 'more-options-button';
        moreOptionsBtn.textContent = '...';
        moreOptionsBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Предотвращаем срабатывание обработчика на imageWrapper
            toggleOptionsDropdown(moreOptionsBtn, imageWrapper); // Передаем кнопку и imageWrapper
        });
        imageWrapper.appendChild(moreOptionsBtn);

        imageWrapper.appendChild(img);

        // Открытие модального окна при клике на image-wrapper (но не на кнопку "...")
        imageWrapper.addEventListener('click', (event) => {
            // Если клик был по самому image-wrapper или его img, но не по кнопке "..."
            if (event.target === imageWrapper || event.target === img) {
                openModal(imageWrapper);
            }
        });
        
        return imageWrapper;
    }

    // Открытие модального окна
    function openModal(imageWrapper) {
        if (!imageWrapper) {
            console.error("[main-page.js] openModal: imageWrapper не предоставлен.");
            return;
        }
        currentImageWrapper = imageWrapper; // Устанавливаем текущий imageWrapper
        const imgElement = imageWrapper.querySelector('img');

        console.log("[main-page.js] Открытие модального окна для изображения:", imgElement.src);
        if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo) {
            console.error("[main-page.js] ОШИБКА: Не найдены все необходимые элементы модального окна в HTML. Проверьте ID.");
            return;
        }

        imageModalGlobalRef.classList.add('show-modal'); // Показываем модальное окно через класс CSS
        optionsDropdownGlobalRef.style.display = 'none'; // Убедимся, что дропдаун скрыт при открытии

        modalImageElement.src = imgElement.src;
        modalImageElement.dataset.id = imageWrapper.dataset.id; // Передаем ID из imageWrapper
        modalImageElement.setAttribute('crossorigin', 'anonymous');
        
        imageInfo.innerHTML = ''; // Очищаем инфо

        const imageId = imageWrapper.dataset.id;
        const column = imageWrapper.dataset.columnOrigin; // ИСПРАВЛЕНО: columnOrigin
        let currentViews = parseInt(imageWrapper.dataset.views) || 0;

        const userIsAretren = window.currentUser === 'aretren@gmail.com';
        const userIsChoisalery = window.currentUser === 'choisalery@gmail.com';
        let shouldIncrementView = false;

        if (column === 'him-peach-column' && userIsAretren) { // ИСПРАВЛЕНО: him-peach-column
            shouldIncrementView = true;
        } else if (column === 'her-cat-column' && userIsChoisalery) { // ИСПРАВЛЕНО: her-cat-column
            shouldIncrementView = true;
        } else if (column === 'our-dream-column' && (userIsAretren || userIsChoisalery)) { // ИСПРАВЛЕНО: our-dream-column
            shouldIncrementView = true;
        }

        if (shouldIncrementView) {
            currentViews += 1;
            const imageRefDB = dbRef(database, `images/${imageId}`);
            update(imageRefDB, { views: currentViews })
                .then(() => {
                    console.log(`[main-page.js] Просмотр для ${imageId} обновлен до ${currentViews}.`);
                })
                .catch(error => {
                    console.error(`[main-page.js] Ошибка обновления просмотров для ${imageId}:`, error);
                });
            imageWrapper.dataset.views = currentViews; // Обновляем data-views в DOM
        }

        // Блокируем взаимодействие с фоном и отключаем скролл body
        document.body.style.overflow = 'hidden';
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'none';
        }
    }

    // Функция для переключения дропдауна (теперь используется moreOptionsButtonGlobalRef и optionsDropdownGlobalRef)
    function toggleOptionsDropdown(button, imageWrapper) {
        if (!imageWrapper) return; // На всякий случай

        // Закрываем все другие открытые дропдауны (если они были)
        document.querySelectorAll('.options-dropdown').forEach(d => {
            if (d !== optionsDropdownGlobalRef) {
                d.style.display = 'none';
                d.classList.remove('show');
            }
        });

        // Если дропдаун уже открыт, закрываем его
        if (optionsDropdownGlobalRef.style.display === 'block') {
            optionsDropdownGlobalRef.style.display = 'none';
            optionsDropdownGlobalRef.classList.remove('show');
            return;
        }

        optionsDropdownGlobalRef.innerHTML = ''; // Очищаем содержимое перед заполнением
        const currentColumnId = imageWrapper.dataset.columnOrigin; // ИСПРАВЛЕНО: data-column-origin

        const columns = [
            { id: 'him-peach-column', name: 'Him peach' },
            { id: 'our-dream-column', name: 'Our dream' },
            { id: 'her-cat-column', name: 'Her cat' }
        ];

        columns.forEach(col => {
            if (col.id !== currentColumnId) {
                const moveLink = document.createElement('a');
                moveLink.href = '#';
                moveLink.textContent = `Переместить в ${col.name}`;
                moveLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation(); // Важно: предотвратить закрытие модального окна
                    moveImage(imageWrapper, col.id);
                    optionsDropdownGlobalRef.style.display = 'none';
                    optionsDropdownGlobalRef.classList.remove('show');
                    // Модальное окно остается открытым после перемещения, только дропдаун закрывается.
                    // Если нужно закрывать модальное окно: closeModal();
                });
                optionsDropdownGlobalRef.appendChild(moveLink);
            }
        });

        // Добавить кнопку "Удалить"
        const deleteLink = document.createElement('a');
        deleteLink.href = '#';
        deleteLink.textContent = 'Удалить';
        deleteLink.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteImage(imageWrapper);
            optionsDropdownGlobalRef.style.display = 'none';
            optionsDropdownGlobalRef.classList.remove('show');
            closeModal(); // Закрыть модальное окно после удаления
        });
        optionsDropdownGlobalRef.appendChild(deleteLink);

        optionsDropdownGlobalRef.style.display = 'block';
        optionsDropdownGlobalRef.classList.add('show');
    }

    // --- Функции перемещения и удаления изображений ---
    function moveImage(imageWrapper, targetColumnId) {
        const imageId = imageWrapper.dataset.id;
        // Обновляем данные в Firebase
        update(dbRef(database, `images/${imageId}`), { column: targetColumnId })
            .then(() => {
                console.log(`[main-page.js] Изображение ${imageId} перемещено в ${targetColumnId} в Firebase.`);
                // После успешного обновления в Firebase, onValue Listener обновит DOM
                // вручную удалять и добавлять в DOM здесь не нужно, т.к. loadImagesFromFirebase() сделает это
            })
            .catch(error => {
                console.error("[main-page.js] Ошибка перемещения изображения в Firebase:", error);
            });
    }

    function deleteImage(imageWrapper) {
        const imageId = imageWrapper.dataset.id;
        // Удаляем данные из Firebase
        remove(dbRef(database, `images/${imageId}`))
            .then(() => {
                console.log("[main-page.js] Изображение удалено из Firebase:", imageId);
                // После успешного удаления из Firebase, onValue Listener обновит DOM
            })
            .catch(error => {
                console.error("[main-page.js] Ошибка удаления изображения из Firebase:", error);
            });
    }

    // --- Функции закрытия модального окна и дропдауна ---
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
        document.body.style.overflow = ''; // Восстанавливаем скролл
        if (imageContainerGlobalRef) {
            imageContainerGlobalRef.style.pointerEvents = 'auto'; // Разблокируем взаимодействие с фоном
        }
        currentImageWrapper = null; // Сбрасываем ссылку на текущий image-wrapper
    }

    // Обработчик для закрытия модального окна по клику вне контента (уже есть в вашем коде)
    // ИСПРАВЛЕНО: Этот обработчик был частью вашего исходного кода. Я переместил его сюда.
    imageModalGlobalRef.addEventListener('click', (event) => {
        // Проверяем, что клик произошел именно по модальному фону, а не по его содержимому
        if (event.target === imageModalGlobalRef) {
            console.log("[main-page.js] Клик по фону модального окна, закрываем модальное окно.");
            closeModal();
        }
    });

    // Обработчик для кнопки "..." в модальном окне
    moreOptionsButtonGlobalRef.addEventListener('click', (event) => {
        event.stopPropagation(); // Предотвращаем закрытие модального окна при клике на "..."
        toggleOptionsDropdown(moreOptionsButtonGlobalRef, currentImageWrapper);
    });

    // Обработчик для закрытия дропдауна при клике вне его (но не при клике по кнопке "...")
    document.addEventListener('click', (event) => {
        // Если клик не по кнопке "..." и не внутри самого дропдауна, закрываем его
        if (optionsDropdownGlobalRef.style.display === 'block') {
            if (!moreOptionsButtonGlobalRef.contains(event.target) && !optionsDropdownGlobalRef.contains(event.target)) {
                optionsDropdownGlobalRef.style.display = 'none';
                optionsDropdownGlobalRef.classList.remove('show');
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

    // Обработчик для предотвращения прокрутки body, когда модальное окно активно на iOS
    imageModalGlobalRef.addEventListener('touchmove', (event) => {
        if (imageModalGlobalRef.classList.contains('show-modal')) {
            event.preventDefault();
        }
    }, { passive: false });
});

// Функция getColumnViews все еще нужна для подсчета просмотров
// Убедитесь, что эта функция вызывается там, где нужна, например, для отображения счетчиков
function getColumnViews(columnId) { // ИСПРАВЛЕНО: принимает columnId
    const columnElement = document.getElementById(columnId); // ИСПРАВЛЕНО: получаем элемент по ID
    if (!columnElement) {
        console.warn(`[main-page.js] Колонка с ID "${columnId}" не найдена для подсчета просмотров.`);
        return 0;
    }
    const images = columnElement.querySelectorAll('.image-wrapper');
    return Array.from(images).reduce((acc, wrapper) => acc + (parseInt(wrapper.dataset.views) || 0), 0);
}
