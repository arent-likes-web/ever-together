@ -1,389 +1,226 @@
// main-page.js

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
// ИСПРАВЛЕНО: getDatabase, ref, set, push, onValue, update, remove должны быть импортированы из firebase-database.js
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
document.addEventListener('DOMContentLoaded', () => {
    // --- Кнопки загрузки изображений ---
    const uploadHimPeachBtn = document.getElementById('uploadHimPeach');
    const uploadOurDreamBtn = document.getElementById('uploadOurDream');
    const uploadHerCatBtn = document.getElementById('uploadHerCat');

    // Назначаем обработчики для кнопок загрузки
    uploadHimPeachBtn.addEventListener('click', () => triggerUpload('him-peach-column'));
    uploadOurDreamBtn.addEventListener('click', () => triggerUpload('our-dream-column'));
    uploadHerCatBtn.addEventListener('click', () => triggerUpload('her-cat-column'));

    function triggerUpload(columnId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none'; // Скрываем, чтобы пользователь его не видел

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                uploadImage(file, columnId);
            }
            document.body.removeChild(fileInput); // Удаляем input после использования
        });

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
        document.body.appendChild(fileInput);
        fileInput.click(); // Имитируем клик
    }
});

// Загрузка изображений из Firebase
function loadImagesFromFirebase() {
    console.log("[main-page.js] Функция loadImagesFromFirebase запущена. Ожидание данных из Firebase...");
    const imagesRef = dbRef(database, 'images');
    function uploadImage(file, targetColumnId) {
        const reader = new FileReader();

    onValue(imagesRef, (snapshot) => {
        console.log("[main-page.js] onValue: Получен snapshot данных из Firebase.");
        const data = snapshot.val();
        
        // Очищаем ВСЕ колонки перед полной перерисовкой
        console.log("[main-page.js] Полная очистка всех колонок перед обновлением.");
        leftColumn.innerHTML = '';
        centerColumn.innerHTML = '';
        rightColumn.innerHTML = '';
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            // Сохраняем ID колонки, в которую загружено изображение
            imageWrapper.setAttribute('data-column-origin', targetColumnId);

        if (data) {
            console.log("[main-page.js] Данные изображений из Firebase:", data);
            const imageArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            
            // Сортируем по времени создания (новые сверху)
            // Это гарантирует, что imageArray будет отсортирован правильно.
            imageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Uploaded Image';

            console.log(`[main-page.js] Найдено ${imageArray.length} изображений. Начинаем отображение.`);
            
            // Временные фрагменты для каждой колонки для эффективного DOM-манипулирования
            const fragments = {
                left: document.createDocumentFragment(),
                center: document.createDocumentFragment(),
                right: document.createDocumentFragment()
            img.onload = () => {
                img.classList.add('loaded'); // Для CSS-анимации появления
            };
            img.onerror = () => {
                imageWrapper.classList.add('image-load-error');
                imageWrapper.textContent = 'Ошибка загрузки изображения';
            };

            imageArray.forEach((imgData) => {
                const targetColumnName = imgData.column;
                const imageWrapper = createImageElement(imgData, imgData.id);
                if (fragments[targetColumnName]) {
                    fragments[targetColumnName].appendChild(imageWrapper);
                } else {
                    console.warn(`[main-page.js] Предупреждение: Колонка "${targetColumnName}" не найдена для изображения ID: ${imgData.id}`);
                }
            // Добавляем кнопку "..."
            const moreOptionsBtn = document.createElement('button');
            moreOptionsBtn.className = 'more-options-button';
            moreOptionsBtn.textContent = '...';
            moreOptionsBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Предотвращаем срабатывание обработчика на imageWrapper
                toggleOptionsDropdown(moreOptionsBtn, imageWrapper);
            });
            imageWrapper.appendChild(moreOptionsBtn);
            
            imageWrapper.appendChild(img);

            // Добавляем фрагменты в соответствующие колонки
            leftColumn.appendChild(fragments.left);
            centerColumn.appendChild(fragments.center);
            rightColumn.appendChild(fragments.right);
            const targetColumn = document.getElementById(targetColumnId);
            if (targetColumn) {
                targetColumn.appendChild(imageWrapper);
            } else {
                console.error('Target column not found:', targetColumnId);
            }
        };
        reader.readAsDataURL(file);
    }

            console.log("[main-page.js] Все изображения обновлены в DOM.");
    // --- Модальное окно и его функциональность ---
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageInfo = document.getElementById('imageInfo');
    const moreOptionsButton = document.querySelector('.modal-actions-container .more-options-button');
    const optionsDropdown = document.querySelector('.modal-actions-container .options-dropdown');

    let currentImageWrapper = null; // Для отслеживания текущего открытого image-wrapper

    // Открытие модального окна при клике на изображение
    document.querySelectorAll('.image-column').forEach(column => {
        column.addEventListener('click', (event) => {
            let targetImageWrapper = event.target.closest('.image-wrapper');
            if (targetImageWrapper && !event.target.classList.contains('more-options-button')) { // Убедимся, что не кликнули на кнопку "..."
                currentImageWrapper = targetImageWrapper;
                const img = targetImageWrapper.querySelector('img');
                if (img) {
                    modalImage.src = img.src;
                    imageInfo.textContent = `Информация о файле: ${img.alt}`; // Пример информации
                    modal.classList.add('show-modal');
                    // Скрываем скролл на body при открытии модального окна
                    document.body.style.overflow = 'hidden';
                }
            }
        });
    });

        } else {
            console.log("[main-page.js] В базе данных Firebase нет записей об изображениях.");
    // Закрытие модального окна при клике вне содержимого
    modal.addEventListener('click', (event) => {
        // Проверяем, что клик произошел именно по модальному фону, а не по его содержимому
        if (event.target === modal) {
            modal.classList.remove('show-modal');
            optionsDropdown.style.display = 'none'; // Убедимся, что дропдаун закрыт
            optionsDropdown.classList.remove('show');
            document.body.style.overflow = ''; // Восстанавливаем скролл
            currentImageWrapper = null;
        }
    }, (error) => { // Обработчик ошибок для onValue
        console.error("[main-page.js] Ошибка при получении данных из Firebase Realtime Database:", error);
        alert("Ошибка загрузки данных из базы данных. Проверьте консоль разработчика.");
    });
}

// Изменена функция для создания элемента изображения
function createImageElement(imageData, imageId) {
    const imageWrapper = document.createElement('div');
    imageWrapper.classList.add('image-wrapper');
    imageWrapper.dataset.timestamp = imageData.timestamp;
    imageWrapper.dataset.views = imageData.views || 0;
    imageWrapper.dataset.id = imageId;
    imageWrapper.dataset.column = imageData.column;

    const img = document.createElement('img');
    img.src = imageData.url;
    img.classList.add('thumbnail');
    img.alt = 'Gallery Image';
    img.loading = 'lazy';
    img.setAttribute('crossorigin', 'anonymous');

    img.onload = () => {
        img.classList.add('loaded');
        // console.log(`[main-page.js] Изображение ${imageData.url} (ID: ${imageId}) успешно загружено.`);
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
        openModal(img);
    // Обработчик для кнопки "..." в модальном окне
    moreOptionsButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Предотвращаем закрытие модального окна при клике на "..."
        toggleOptionsDropdown(moreOptionsButton, currentImageWrapper);
    });

    imageWrapper.appendChild(img);
    return imageWrapper;
}

// Открытие модального окна
function openModal(imgElement) {
    console.log("[main-page.js] Открытие модального окна для изображения:", imgElement.src);
    if (!imageModalGlobalRef || !modalImageElement || !moreOptionsButtonGlobalRef || !optionsDropdownGlobalRef || !imageInfo) {
        console.error("[main-page.js] ОШИБКА: Не найдены все необходимые элементы модального окна в HTML. Проверьте ID.");
        return;
    }

    imageModalGlobalRef.classList.add('show-modal'); // Показываем модальное окно через класс CSS
    optionsDropdownGlobalRef.style.display = 'none'; // Убедимся, что дропдаун скрыт при открытии

    modalImageElement.src = imgElement.src;
    modalImageElement.dataset.id = imgElement.dataset.id;
    modalImageElement.setAttribute('crossorigin', 'anonymous');
    // Функция для переключения дропдауна
    function toggleOptionsDropdown(button, imageWrapper) {
        if (!imageWrapper) return; // На всякий случай

    imageInfo.innerHTML = ''; // Очищаем инфо

    const imageId = imgElement.dataset.id;
    const column = imgElement.dataset.column;
    let currentViews = parseInt(imgElement.dataset.views) || 0;

    const userIsAretren = window.currentUser === 'aretren@gmail.com';
    const userIsChoisalery = window.currentUser === 'choisalery@gmail.com';
    let shouldIncrementView = false;

    if (column === 'left' && userIsAretren) {
        shouldIncrementView = true;
    } else if (column === 'right' && userIsChoisalery) {
        shouldIncrementView = true;
    } else if (column === 'center' && (userIsAretren || userIsChoisalery)) {
        shouldIncrementView = true;
    }
        // Закрываем все другие открытые дропдауны
        document.querySelectorAll('.options-dropdown').forEach(d => {
            if (d !== optionsDropdown) { // Проверяем, что это не текущий дропдаун
                d.style.display = 'none';
                d.classList.remove('show');
            }
        });

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
        const wrapperElement = document.querySelector(`.image-wrapper[data-id="${imageId}"]`);
        if (wrapperElement) {
            wrapperElement.dataset.views = currentViews;
        // Если дропдаун уже открыт, закрываем его
        if (optionsDropdown.style.display === 'block') {
            optionsDropdown.style.display = 'none';
            optionsDropdown.classList.remove('show');
            return;
        }
    }

    // Блокируем взаимодействие с фоном
    if (imageContainerGlobalRef) {
        imageContainerGlobalRef.style.pointerEvents = 'none';
        optionsDropdown.innerHTML = ''; // Очищаем содержимое перед заполнением
        const currentColumnId = imageWrapper.getAttribute('data-column-origin');

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
                    optionsDropdown.style.display = 'none';
                    optionsDropdown.classList.remove('show');
                    // Можно также закрыть модальное окно после перемещения, если нужно:
                    // modal.classList.remove('show-modal');
                    // document.body.style.overflow = '';
                    // currentImageWrapper = null;
                });
                optionsDropdown.appendChild(moveLink);
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
            optionsDropdown.style.display = 'none';
            optionsDropdown.classList.remove('show');
            modal.classList.remove('show-modal'); // Закрыть модальное окно после удаления
            document.body.style.overflow = ''; // Восстановить скролл
            currentImageWrapper = null;
        });
        optionsDropdown.appendChild(deleteLink);

        optionsDropdown.style.display = 'block';
        optionsDropdown.classList.add('show');
    }

    moreOptionsButtonGlobalRef.onclick = function(event) {
        event.stopPropagation(); // Предотвращаем закрытие модального окна при клике на кнопку ...
        optionsDropdownGlobalRef.style.display = optionsDropdownGlobalRef.style.display === 'block' ? 'none' : 'block';
        console.log(`[main-page.js] Дропдаун опций: ${optionsDropdownGlobalRef.style.display}`);
    };

    optionsDropdownGlobalRef.onclick = function(event) {
        event.preventDefault(); // Предотвращаем переход по ссылке
        event.stopPropagation(); // Предотвращаем закрытие дропдауна/модального окна

        const targetActionElement = event.target.closest('a[data-action]');
        if (!targetActionElement) return;

        const action = targetActionElement.dataset.action;
        const currentImageId = modalImageElement.dataset.id;

        console.log(`[main-page.js] Действие: ${action} для изображения ${currentImageId}`);

        if (action === 'delete') {
            if (confirm('Вы уверены, что хотите удалить это изображение?')) {
                remove(dbRef(database, `images/${currentImageId}`))
                    .then(() => {
                        console.log("[main-page.js] Изображение удалено:", currentImageId);
                        closeModal();
                    })
                    .catch(error => console.error("[main-page.js] Ошибка удаления:", error));
    function moveImage(imageWrapper, targetColumnId) {
        const targetColumn = document.getElementById(targetColumnId);
        if (targetColumn) {
            const currentParent = imageWrapper.parentNode;
            if (currentParent) {
                currentParent.removeChild(imageWrapper);
            }
        } else if (action === 'move') {
            const newColumn = targetActionElement.dataset.column;
            update(dbRef(database, `images/${currentImageId}`), { column: newColumn })
                .then(() => {
                    console.log(`[main-page.js] Изображение ${currentImageId} перемещено в ${newColumn}`);
                    closeModal();
                })
                .catch(error => console.error("[main-page.js] Ошибка перемещения:", error));
            targetColumn.appendChild(imageWrapper);
            imageWrapper.setAttribute('data-column-origin', targetColumnId); // Обновляем ID колонки
            // Не закрываем модальное окно после перемещения, только дропдаун
        } else {
            console.error('Target column not found:', targetColumnId);
        }

        optionsDropdownGlobalRef.style.display = 'none';
    };

    modalImageElement.onclick = (event) => event.stopPropagation();
    modalActionsContainer.onclick = (event) => event.stopPropagation();
    imageInfo.onclick = (event) => event.stopPropagation();
}

// Функция закрытия модального окна
function closeModal() {
    console.log("[main-page.js] Закрытие модального окна.");
    if (imageModalGlobalRef) {
        imageModalGlobalRef.classList.remove('show-modal');
    }
    if (optionsDropdownGlobalRef) {
        optionsDropdownGlobalRef.style.display = 'none';
    }
    if (modalImageElement) {
        modalImageElement.src = '';
        modalImageElement.dataset.id = '';
    }
    if (imageInfo) {
        imageInfo.innerHTML = '';
    }


    if (imageContainerGlobalRef) {
        imageContainerGlobalRef.style.pointerEvents = 'auto'; // Разблокируем взаимодействие с фоном
    }
}

// Обработчик для закрытия модального окна по клику вне контента
function handleCloseInteractions(event) {
    // Если дропдаун открыт и клик был вне кнопки и самого дропдауна, закрываем дропдаун
    if (optionsDropdownGlobalRef && optionsDropdownGlobalRef.style.display === 'block') {
        if (moreOptionsButtonGlobalRef &&
            !moreOptionsButtonGlobalRef.contains(event.target) &&
            !optionsDropdownGlobalRef.contains(event.target)) {
            console.log("[main-page.js] Клик вне дропдауна/кнопки, закрываем дропдаун.");
            optionsDropdownGlobalRef.style.display = 'none';
    function deleteImage(imageWrapper) {
        const parent = imageWrapper.parentNode;
        if (parent) {
            parent.removeChild(imageWrapper);
        }
    }

    // Если модальное окно открыто и клик был по его фону (но не по контенту внутри)
    if (imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal') && event.target === imageModalGlobalRef) {
        console.log("[main-page.js] Клик по фону модального окна, закрываем модальное окно.");
        closeModal();
    }
}

// Event listener для закрытия модального окна по клику вне контента
window.addEventListener('click', handleCloseInteractions);

// Обработчик для закрытия модального окна по нажатию ESC
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && imageModalGlobalRef && imageModalGlobalRef.classList.contains('show-modal')) {
        console.log("[main-page.js] Нажата ESC, закрываем модальное окно.");
        closeModal();
    }
});


// Инициализация файлового ввода для загрузки
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true;
fileInput.style.display = 'none'; // Скрываем элемент input, так как будем вызывать его через кнопку
document.body.appendChild(fileInput);

// Обновляем селектор кнопок загрузки (они теперь в top-upload-buttons-container)
const uploadButtons = document.querySelectorAll('.top-upload-buttons-container button[id^="upload"]'); 
uploadButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        const column = button.id.replace('upload', '').toLowerCase();
        fileInput.dataset.column = column; // Сохраняем целевую колонку
        fileInput.click(); // Открываем диалог выбора файла
    // --- Закрытие дропдауна при клике вне его (но не при клике по кнопке "...") ---
    document.addEventListener('click', (event) => {
        // Если клик не по кнопке "..." и не внутри самого дропдауна, закрываем его
        if (!moreOptionsButton.contains(event.target) && !optionsDropdown.contains(event.target)) {
            optionsDropdown.style.display = 'none';
            optionsDropdown.classList.remove('show');
        }
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
                formData.append("upload_preset", "ever_together_upload"); // Важно: убедитесь, что этот preset существует в Cloudinary

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
                    continue; // Продолжаем загрузку других файлов
                }

                const cloudinaryData = await cloudinaryResponse.json();

                if (cloudinaryData.secure_url) {
                    const newImageRef = push(dbRef(database, 'images')); // Генерируем уникальный ключ
                    await set(newImageRef, {
                        url: cloudinaryData.secure_url,
                        timestamp: new Date().toISOString(),
                        views: 0, // Начальное количество просмотров
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
    // Обработчик для предотвращения прокрутки body, когда модальное окно активно
    // Это уже обрабатывается через document.body.style.overflow = 'hidden';
    // Но для iOS иногда полезно добавить touchmove prevention
    modal.addEventListener('touchmove', (event) => {
        if (modal.classList.contains('show-modal')) {
            event.preventDefault();
        }
        event.target.value = null; // Сбрасываем выбранные файлы для возможности повторной загрузки тех же файлов
        console.log("[main-page.js] Пакетная загрузка завершена.");
    }
    }, { passive: false }); // {passive: false} важен для preventDefault
});

// Функция getColumnViews все еще нужна для подсчета просмотров
function getColumnViews(columnName) {
    const images = document.querySelectorAll(`.image-column#${columnName}Column .image-wrapper`);
    return Array.from(images).reduce((acc, wrapper) => acc + (parseInt(wrapper.dataset.views) || 0), 0);
}
