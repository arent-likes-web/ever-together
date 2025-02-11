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
const errorMessage = document.getElementById('errorMessage');

// Список разрешенных пользователей
const allowedUsers = [
  { email: "aretren@gmail.com", password: "esc5re8UfBPJyXBADi4eMJHDU9O2" },
  { email: "choisalery@gmail.com", password: "qY5pMWARb2SRVXiUTxyipyICUJ53" }
];

// Проверка, что пользователь в списке разрешенных
function isUserAllowed(email) {
  return allowedUsers.some(user => user.email === email);
}

// Обработчик отправки формы
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Предотвратить перезагрузку страницы

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!isUserAllowed(email)) {
    errorMessage.textContent = "Этот email не разрешен для входа.";
    return;
  }

  try {
    // Вход с помощью email и пароля
    await auth.signInWithEmailAndPassword(email, password);

    // Проверяем, подтвержден ли email пользователя
    const user = auth.currentUser;
    if (!user.emailVerified) {
      // Если email не подтвержден, отправляем письмо с подтверждением
      await user.sendEmailVerification();
      errorMessage.textContent = "Пожалуйста, подтвердите ваш email перед входом. Мы отправили письмо для подтверждения.";
      return;
    }

    // Перенаправление на main-page после успешного входа
    window.location.href = "main-page.html";  // Заменить на нужный URL
  } catch (error) {
    // Показ ошибки, если вход не удался
    errorMessage.textContent = error.message;
  }
});
