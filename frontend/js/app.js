// Initialize Lucide Icons
lucide.createIcons();

// Replace the Vercel URL with your new Render URL
const API_BASE = window.location.origin === 'http://localhost:5001' ? 'http://localhost:5001' : 'https://sandip-fas-backend.onrender.com';

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('active');
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
  });
});

// Modal Logic
const modal = document.getElementById('login-modal');
const modalTitle = document.getElementById('modal-title');
const modalIcon = document.getElementById('modal-icon');
const modalIconBg = document.getElementById('modal-icon-bg');
const usernameGroup = document.getElementById('username-group');
const prnGroup = document.getElementById('prn-group');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');

let currentRole = '';

const portalConfig = {
  'HOD Portal': { icon: 'briefcase', colorClass: 'bg-blue-light', textColor: 'text-blue' },
  'Coordinator Portal': { icon: 'users', colorClass: 'bg-emerald-light', textColor: 'text-emerald' },
  'Student Portal': { icon: 'graduation-cap', colorClass: 'bg-violet-light', textColor: 'text-violet' }
};

window.openLoginModal = function (role) {
  currentRole = role;
  const config = portalConfig[role];

  // Set Title and Icon
  modalTitle.textContent = `${role} Login`;
  modalIcon.setAttribute('data-lucide', config.icon);

  // Reset classes
  modalIconBg.className = `modal-icon-wrapper ${config.colorClass}`;
  modalIcon.className = `icon-lg ${config.textColor}`;

  // Re-initialize icon for the new data-lucide attribute
  lucide.createIcons();

  // Toggle inputs based on role
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  if (role === 'Student Portal') {
    usernameGroup.style.display = 'none';
    prnGroup.style.display = 'flex';
    document.getElementById('prnNumber').required = true;
    document.getElementById('username').required = false;
    toggleBtn.style.display = 'flex';
    passwordInput.style.paddingRight = '3rem';
  } else {
    usernameGroup.style.display = 'flex';
    prnGroup.style.display = 'none';
    document.getElementById('username').required = true;
    document.getElementById('prnNumber').required = false;
    toggleBtn.style.display = 'none';
    passwordInput.type = 'password';
    passwordInput.style.paddingRight = '';
    document.getElementById('toggle-password-icon').setAttribute('data-lucide', 'eye');
    lucide.createIcons();
  }

  // Clear form
  loginForm.reset();
  loginError.style.display = 'none';

  // Show modal
  modal.style.display = 'flex';
};

window.closeLoginModal = function () {
  modal.style.display = 'none';
  currentRole = '';
};

// Show/hide password toggle
document.getElementById('toggle-password').addEventListener('click', () => {
  const pwd = document.getElementById('password');
  const icon = document.getElementById('toggle-password-icon');
  const isHidden = pwd.type === 'password';
  pwd.type = isHidden ? 'text' : 'password';
  icon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
  lucide.createIcons();
});

// Form Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  loginError.style.display = 'none';
  const originalBtnContent = loginBtn.innerHTML;
  loginBtn.innerHTML = `<span>Loading...</span>`;
  loginBtn.disabled = true;

  try {
    const password = document.getElementById('password').value;
    const endpoint = `${API_BASE}/api/auth/login`;
    let payload = { password };

    if (currentRole === 'Student Portal') {
      payload.prnNumber = document.getElementById('prnNumber').value;
      payload.role = 'student';
    } else if (currentRole === 'Coordinator Portal') {
      payload.email = document.getElementById('username').value;
      payload.role = 'coordinator';
    } else {
      payload.email = document.getElementById('username').value;
      payload.role = 'hod';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      // Store token and redirect
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (currentRole === 'HOD Portal') {
        window.location.href = 'hod-dashboard.html';
      } else if (currentRole === 'Coordinator Portal') {
        window.location.href = 'coordinator-dashboard.html';
      } else {
        window.location.href = 'student-dashboard.html';
      }
    } else {
      loginError.textContent = data.error || data.message || 'Login failed. Please check your credentials.';
      loginError.style.display = 'block';
    }
  } catch (error) {
    loginError.textContent = 'Network error. Please try again later.';
    loginError.style.display = 'block';
  } finally {
    loginBtn.innerHTML = originalBtnContent;
    loginBtn.disabled = false;
    lucide.createIcons();
  }
});
