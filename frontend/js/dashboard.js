// Shared Dashboard Logic

const API_BASE = (function () {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://sandip-fas-aiandml.onrender.com';   // Render backend API
  }
  return 'http://localhost:5001'; // local development
})();

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Auth Check
function checkAuth(role) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user || user.role !== role) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) {
    return 'just now';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return String(value);
  }

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function authenticatedFetch(url, options) {
  const token = localStorage.getItem('token');
  const requestHeaders = new Headers(options && options.headers ? options.headers : {});

  if (token && !requestHeaders.has('x-auth-token')) {
    requestHeaders.set('x-auth-token', token);
  }

  const response = await fetch(url, {
    ...(options || {}),
    headers: requestHeaders,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Request failed.');
  }

  return response;
}

async function authenticatedJsonFetch(url, options) {
  const response = await authenticatedFetch(url, options);
  return response.json().catch(() => ({}));
}

// Modal Logic
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  if (window.innerWidth <= 768) {
    toggleSidebar(false);
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Sidebar Toggle Logic
function toggleSidebar(show) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!sidebar || !overlay) return;

  if (show === undefined) {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  } else if (show) {
    sidebar.classList.add('active');
    overlay.classList.add('active');
  } else {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  }
}

// Change Password
async function handlePasswordChange(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');
  const btn = e.target.querySelector('button[type="submit"]');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'New passwords do not match';
    errorEl.style.display = 'block';
    return;
  }

  const originalBtnContent = btn.innerHTML;
  btn.innerHTML = '<span>Updating...</span>';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      successEl.textContent = 'Password updated successfully!';
      successEl.style.display = 'block';
      e.target.reset();
      setTimeout(() => closeModal('change-password-modal'), 2000);
    } else {
      if (response.status === 401) {
        errorEl.textContent = 'Your session has expired. Please log in again.';
        errorEl.style.display = 'block';
        setTimeout(logout, 1200);
        return;
      }

      errorEl.textContent = data.error || data.message || 'Failed to update password';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    errorEl.textContent = 'Network error. Please try again later.';
    errorEl.style.display = 'block';
  } finally {
    btn.innerHTML = originalBtnContent;
    btn.disabled = false;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const passwordForm = document.getElementById('change-password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // Profile icon toggle logic
  const profileAvatar = document.getElementById('user-avatar');
  if (profileAvatar) {
    profileAvatar.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        e.stopPropagation();
        toggleSidebar();
      }
    });
  }

  // Close sidebar when clicking overlay
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => toggleSidebar(false));
  }
});
