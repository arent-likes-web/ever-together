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

        document.body.appendChild(fileInput);
        fileInput.click(); // Имитируем клик
    }

    function uploadImage(file, targetColumnId) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const imageUrl = e.target.result;
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            // Сохраняем ID колонки, в которую загружено изображение
            imageWrapper.setAttribute('data-column-origin', targetColumnId);

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Uploaded Image';

            img.onload = () => {
                img.classList.add('loaded'); // Для CSS-анимации появления
            };
            img.onerror = () => {
                imageWrapper.classList.add('image-load-error');
                imageWrapper.textContent = 'Ошибка загрузки изображения';
            };

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

            const targetColumn = document.getElementById(targetColumnId);
            if (targetColumn) {
                targetColumn.appendChild(imageWrapper);
            } else {
                console.error('Target column not found:', targetColumnId);
            }
        };
        reader.readAsDataURL(file);
    }

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
    });

    // Обработчик для кнопки "..." в модальном окне
    moreOptionsButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Предотвращаем закрытие модального окна при клике на "..."
        toggleOptionsDropdown(moreOptionsButton, currentImageWrapper);
    });

    // Функция для переключения дропдауна
    function toggleOptionsDropdown(button, imageWrapper) {
        if (!imageWrapper) return; // На всякий случай

        // Закрываем все другие открытые дропдауны
        document.querySelectorAll('.options-dropdown').forEach(d => {
            if (d !== optionsDropdown) { // Проверяем, что это не текущий дропдаун
                d.style.display = 'none';
                d.classList.remove('show');
            }
        });

        // Если дропдаун уже открыт, закрываем его
        if (optionsDropdown.style.display === 'block') {
            optionsDropdown.style.display = 'none';
            optionsDropdown.classList.remove('show');
            return;
        }

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

    function moveImage(imageWrapper, targetColumnId) {
        const targetColumn = document.getElementById(targetColumnId);
        if (targetColumn) {
            const currentParent = imageWrapper.parentNode;
            if (currentParent) {
                currentParent.removeChild(imageWrapper);
            }
            targetColumn.appendChild(imageWrapper);
            imageWrapper.setAttribute('data-column-origin', targetColumnId); // Обновляем ID колонки
            // Не закрываем модальное окно после перемещения, только дропдаун
        } else {
            console.error('Target column not found:', targetColumnId);
        }
    }

    function deleteImage(imageWrapper) {
        const parent = imageWrapper.parentNode;
        if (parent) {
            parent.removeChild(imageWrapper);
        }
    }

    // --- Закрытие дропдауна при клике вне его (но не при клике по кнопке "...") ---
    document.addEventListener('click', (event) => {
        // Если клик не по кнопке "..." и не внутри самого дропдауна, закрываем его
        if (!moreOptionsButton.contains(event.target) && !optionsDropdown.contains(event.target)) {
            optionsDropdown.style.display = 'none';
            optionsDropdown.classList.remove('show');
        }
    });

    // Обработчик для предотвращения прокрутки body, когда модальное окно активно
    // Это уже обрабатывается через document.body.style.overflow = 'hidden';
    // Но для iOS иногда полезно добавить touchmove prevention
    modal.addEventListener('touchmove', (event) => {
        if (modal.classList.contains('show-modal')) {
            event.preventDefault();
        }
    }, { passive: false }); // {passive: false} важен для preventDefault
});
