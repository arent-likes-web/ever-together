// Импорт необходимых функций из SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Конфигурация Firebase
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
const auth = getAuth(app);

// Работа с формами
const loginForm = document.getElementById('loginForm');
const messageContainer = document.getElementById('messageContainer');
const errorMessage = document.getElementById('errorMessage');

// Разрешённые пользователи
const allowedUsers = [
  { email: "aretren@gmail.com" },
  { email: "choisalery@gmail.com" }
];

function isUserAllowed(email) {
  return allowedUsers.some(user => user.email === email);
}

// Обработка отправки формы для отправки ссылки
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;

  if (!isUserAllowed(email)) {
    errorMessage.textContent = "Этот email не разрешён для входа.";
    return;
  }

  const actionCodeSettings = {
    url: 'https://arent-likes-web.github.io/ever-together/main-page.html',
    handleCodeInApp: true
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    loginForm.style.display = 'none';
    messageContainer.style.display = 'block';
    errorMessage.textContent = '';
  } catch (error) {
    console.error("Ошибка при отправке письма:", error);
    errorMessage.textContent = `Ошибка: ${error.message}`;
  }
});
