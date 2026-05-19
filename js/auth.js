// ==========================================================
// AUTH.JS — Firebase Auth State, Login/Register, Username Guard
// ==========================================================

'use strict';

// ----------------------------------------------------------
// FIREBASE INITIALIZATION
// ----------------------------------------------------------
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDNDQjRX8Y7j4zZ0mV-m__HyJWrQgTBxYA",
  authDomain: "the-paradox-gallery.firebaseapp.com",
  projectId: "the-paradox-gallery",
  storageBucket: "the-paradox-gallery.firebasestorage.app",
  messagingSenderId: "659400708496",
  appId: "1:659400708496:web:f9a8c5c8ba33f15ce8e315",
  measurementId: "G-GMGTY7W8TW",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expose globally for other modules
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;

// ----------------------------------------------------------
// HELPER: Set button loading state
// ----------------------------------------------------------
function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span>`;
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.originalText || 'Submit';
  }
}

// ----------------------------------------------------------
// HELPER: Show field error
// ----------------------------------------------------------
function showFieldError(input, message) {
  input.classList.add('error');
  const errEl = input.parentElement.querySelector('.field-error');
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add('visible');
  }
}

function clearFieldError(input) {
  input.classList.remove('error');
  const errEl = input.parentElement.querySelector('.field-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('visible');
  }
}

function clearAllErrors(form) {
  form.querySelectorAll('input').forEach(clearFieldError);
}

// ----------------------------------------------------------
// GLOBAL AUTH STATE OBSERVER
// Called on every page load — handles routing logic
// ----------------------------------------------------------
function initAuthStateObserver() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in — fetch their Firestore profile
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Cache user data globally
          window.currentUser = { uid: user.uid, ...userData };

          // USERNAME INTERCEPT GUARD
          // If username is empty, force redirect to settings
          if (!userData.username || userData.username.trim() === '') {
            if (currentPage !== 'settings.html') {
              window.location.href = 'settings.html';
              return;
            }
          } else {
            // Username is set — redirect away from auth/settings if needed
            if (currentPage === 'auth.html') {
              window.location.href = 'dashboard.html';
              return;
            }
          }

          // Update navbar for logged-in state
          updateNavbarForUser(userData);

        } else {
          // Document doesn't exist (shouldn't happen, but handle gracefully)
          console.warn('User document not found in Firestore');
          window.currentUser = { uid: user.uid };
          updateNavbarForUser(null);
        }
      } catch (err) {
        console.error('Error fetching user document:', err);
      }

    } else {
      // User is NOT signed in
      window.currentUser = null;

      // Protect private pages
      const protectedPages = ['dashboard.html', 'settings.html'];
      if (protectedPages.includes(currentPage)) {
        window.location.href = 'auth.html';
        return;
      }

      // Update navbar for guest state
      updateNavbarForGuest();
    }
  });
}

// ----------------------------------------------------------
// NAVBAR STATE UPDATER
// ----------------------------------------------------------
function updateNavbarForUser(userData) {
  const navCtaWrapper = document.getElementById('nav-cta-wrapper');
  const navCta = document.getElementById('nav-cta');
  const drawerCta = document.getElementById('drawer-cta');

  if (navCta) {
    navCta.textContent = 'My Studio';
    navCta.href = 'dashboard.html';
  }

  if (drawerCta) {
    drawerCta.textContent = 'My Studio';
    drawerCta.href = 'dashboard.html';
  }
}

function updateNavbarForGuest() {
  const navCta = document.getElementById('nav-cta');
  const drawerCta = document.getElementById('drawer-cta');

  if (navCta) {
    navCta.textContent = 'Enter Gallery';
    navCta.href = 'auth.html';
  }

  if (drawerCta) {
    drawerCta.textContent = 'Enter Gallery';
    drawerCta.href = 'auth.html';
  }
}

// ----------------------------------------------------------
// AUTH PAGE: TAB SWITCHER
// ----------------------------------------------------------
function initAuthTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const panels = document.querySelectorAll('.auth-panel');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(`panel-${target}`);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// ----------------------------------------------------------
// PASSWORD VISIBILITY TOGGLE
// ----------------------------------------------------------
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? 'HIDE' : 'SHOW';
    });
  });
}

// ----------------------------------------------------------
// REGISTRATION HANDLER
// ----------------------------------------------------------
function initRegistration() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const nameInput = document.getElementById('reg-name');
    const phoneInput = document.getElementById('reg-phone');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const submitBtn = form.querySelector('.auth-submit-btn');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // --- CLIENT-SIDE VALIDATION ---
    let hasError = false;

    if (!name) {
      showFieldError(nameInput, 'Full name is required.');
      hasError = true;
    }

    if (!phone || !/^\+?[\d\s\-]{7,15}$/.test(phone)) {
      showFieldError(phoneInput, 'Enter a valid phone number.');
      hasError = true;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError(emailInput, 'Enter a valid email address.');
      hasError = true;
    }

    if (!password || password.length < 6) {
      showFieldError(passwordInput, 'Password must be at least 6 characters.');
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create Firestore /users/{uid} document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: name,
        email: email,
        phone: phone,
        username: '', // Username intercept guard will redirect to settings
        createdAt: serverTimestamp(),
      });

      window.UI?.showToast('Welcome to The Paradox Gallery!', 'success');

      // Auth state observer will detect empty username and redirect to settings
      // No manual redirect needed here

    } catch (err) {
      console.error('Registration error:', err);
      setButtonLoading(submitBtn, false, 'Create Account');

      // Map Firebase error codes to user-friendly messages
      const errorMap = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };

      const message = errorMap[err.code] || 'Registration failed. Please try again.';
      window.UI?.showToast(message, 'error');

      if (err.code === 'auth/email-already-in-use') {
        showFieldError(emailInput, 'Email already in use.');
      }
    }
  });
}

// ----------------------------------------------------------
// LOGIN HANDLER
// ----------------------------------------------------------
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = form.querySelector('.auth-submit-btn');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    if (!email) {
      showFieldError(emailInput, 'Email is required.');
      hasError = true;
    }

    if (!password) {
      showFieldError(passwordInput, 'Password is required.');
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.UI?.showToast('Welcome back.', 'success');
      // Auth state observer handles routing (username check + redirect)

    } catch (err) {
      console.error('Login error:', err);
      setButtonLoading(submitBtn, false, 'Enter Gallery');

      const errorMap = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/invalid-email': 'Please enter a valid email.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };

      const message = errorMap[err.code] || 'Login failed. Please try again.';
      window.UI?.showToast(message, 'error');

      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showFieldError(passwordInput, 'Incorrect password.');
      } else if (err.code === 'auth/user-not-found') {
        showFieldError(emailInput, 'No account with this email.');
      }
    }
  });
}

// ----------------------------------------------------------
// LOGOUT HANDLER
// ----------------------------------------------------------
async function handleLogout() {
  try {
    await signOut(auth);
    window.currentUser = null;
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout error:', err);
    window.UI?.showToast('Logout failed. Please try again.', 'error');
  }
}

// Attach to logout button(s)
function initLogoutButtons() {
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
}

// ----------------------------------------------------------
// INITIALIZE ON DOM READY
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initAuthStateObserver();
  initAuthTabs();
  initPasswordToggles();
  initRegistration();
  initLogin();
  initLogoutButtons();
});

// Export for use in other modules
window.Auth = {
  auth,
  db,
  handleLogout,
};
