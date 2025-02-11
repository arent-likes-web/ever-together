// Инициализация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDIMvnTxfnpDr72fIIexWcO2Jl0_fqM7tw",
  authDomain: "ever-together.firebaseapp.com",
  databaseURL: "https://ever-together-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ever-together",
  storageBucket: "ever-together.firebasestorage.app",
  messagingSenderId: "333503123875",
  appId: "1:333503123875:web:313a63c0d9f0093f05ca16"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const loginForm = document.getElementById('loginForm');
const verificationForm = document.getElementById('verificationForm');
const errorMessage = document.getElementById('errorMessage');
const verificationErrorMessage = document.getElementById('verificationErrorMessage');

// Список разрешенных пользователей
const allowedUsers = [
  { email: "aretren@gmail.com" },
  { email: "choisalery@gmail.com" }
];

// Проверка, что пользователь в списке разрешенных
function isUserAllowed(email) {
  return allowedUsers.some(user => user.email === email);
}

// Обработчик отправки email для получения кода
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;

  if (!isUserAllowed(email)) {
    errorMessage.textContent = "Этот email не разрешен для входа.";
    return;
  }

  try {
    const actionCodeSettings = {
      // Тема и URL для перехода после успешного подтверждения
      url: 'https://arent-likes-web.github.io/ever-together/main-page.html',  // адрес страницы, куда будет перенаправлен пользователь после подтверждения
      handleCodeInApp: true
    };

    // Отправляем ссылку для входа на email
    await auth.sendSignInLinkToEmail(email, actionCodeSettings);

    // Сохраняем email в localStorage для последующего использования
    window.localStorage.setItem('emailForSignIn', email);

    // Показываем форму для ввода кода
    loginForm.style.display = 'none';
    verificationForm.style.display = 'block';

    errorMessage.textContent = 'Письмо с кодом было отправлено на вашу почту!';
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});

// Обработчик отправки кода подтверждения
verificationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = document.getElementById('verificationCode').value;
  const email = window.localStorage.getItem('emailForSignIn');

  try {
    // Проверка на правильность кода и завершение аутентификации
    const result = await auth.signInWithEmailLink(email, window.location.href);

    // Если код правильный, перенаправляем на main-page.html
    window.location.href = "main-page.html";
  } catch (error) {
    verificationErrorMessage.textContent = "Неверный код. Попробуйте снова.";
  }
});
