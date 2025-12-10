// Splash Screen
document.addEventListener('DOMContentLoaded', function() {
  const splashScreen = document.getElementById('splash-screen');
  const mainApp = document.getElementById('main-app');
  
  setTimeout(() => {
    splashScreen.style.display = 'none';
    mainApp.style.display = 'block';
  }, 3500);
});

// Mobile Menu Toggle
const mobileMenu = document.querySelector('.mobile-menu');
const nav = document.querySelector('.nav ul');

if (mobileMenu) {
  mobileMenu.addEventListener('click', function() {
    nav.classList.toggle('active');
  });
}

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  });
});

// Scroll Animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.feature-card, .plan-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'all 0.6s ease';
  observer.observe(el);
});

// Form Validation (for login and register pages)
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 8;
}

// Local Storage for user session (demo)
function saveUserSession(userData) {
  localStorage.setItem('elosya_user', JSON.stringify(userData));
}

function getUserSession() {
  const userData = localStorage.getItem('elosya_user');
  return userData ? JSON.parse(userData) : null;
}

function clearUserSession() {
  localStorage.removeItem('elosya_user');
}

// Check if user is logged in
function isLoggedIn() {
  return getUserSession() !== null;
}

// Update header based on login status
function updateHeaderAuth() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;
  
  if (isLoggedIn()) {
    const user = getUserSession();
    headerActions.innerHTML = `
      <span class="user-welcome">Bonjour, ${user.name}</span>
      <button onclick="logout()" class="btn btn-outline">Déconnexion</button>
    `;
  }
}

function logout() {
  clearUserSession();
  window.location.href = 'index.html';
}

// Initialize auth state
updateHeaderAuth();
