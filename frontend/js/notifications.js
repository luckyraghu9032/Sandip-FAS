// Notification System - shared across all dashboards

let notifications = [];
let notificationSocket = null;

// Initialize notification icon click handlers
function initNotifications() {
  const icon = document.getElementById('notification-icon');
  const badge = document.getElementById('notification-badge');
  const wrapper = document.getElementById('notification-wrapper');

  if (!icon) return;

  icon.addEventListener('click', () => {
    openNotificationsModal();
  });

  // Bind Read All button after modal is inserted (may not exist yet)
  const bindReadAll = () => {
    const readAllBtn = document.getElementById('read-all-btn');
    if (readAllBtn && !readAllBtn.dataset.bound) {
      readAllBtn.addEventListener('click', async () => {
        try {
          await authenticatedJsonFetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT' });
          // Refresh list and count
          fetchNotifications();
          fetchUnreadCount();
        } catch (err) {
          console.error('Failed to mark all as read:', err);
        }
      });
      readAllBtn.dataset.bound = 'true';
    }
  };

  // Ensure binding after modal creation
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.addedNodes.length) {
        bindReadAll();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  fetchUnreadCount();
}

async function fetchUnreadCount() {
  try {
    const data = await authenticatedJsonFetch(`${API_BASE}/api/notifications/unread-count`);
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = data.count > 99 ? '99+' : data.count;
      badge.style.display = data.count > 0 ? 'flex' : 'none';
    }
  } catch (err) {
    console.error('Failed to fetch unread count:', err);
  }
}

async function fetchNotifications() {
  try {
    notifications = await authenticatedJsonFetch(`${API_BASE}/api/notifications`);
    renderNotificationsList();
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }
}

function renderNotificationsList() {
  const list = document.getElementById('notifications-list');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center">No notifications yet.</p>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" style="padding:0.75rem 1rem;border-bottom:1px solid var(--border-color);cursor:pointer">
      <div style="font-weight:600;color:var(--uni-blue-dark);margin-bottom:0.25rem">${escapeHtml(n.title)}</div>
      <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem">${escapeHtml(n.message)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${formatTimeAgo(n.created_at)} - ${n.sender_name || 'System'}</div>
    </div>
  `).join('');

  list.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      markAsRead(id);
    });
  });
}

async function markAsRead(id) {
  try {
    await authenticatedJsonFetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH' });
    notifications = notifications.map(n => n.id == id ? { ...n, is_read: true } : n);
    renderNotificationsList();
    // Decrement badge count locally
    const badge = document.getElementById('notification-badge');
    if (badge) {
      let current = parseInt(badge.textContent) || 0;
      current = Math.max(0, current - 1);
      badge.textContent = current > 99 ? '99+' : current;
      badge.style.display = current > 0 ? 'flex' : 'none';
    }
    // Also refresh count from server to stay in sync
    fetchUnreadCount();
  } catch (err) {
    console.error('Failed to mark as read:', err);
  }
}

async function openNotificationsModal() {
  await fetchNotifications();
  const modal = document.getElementById('notifications-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  // Auto-mark all as read when opening the modal
  try {
    await authenticatedJsonFetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT' });
    // Update local state
    notifications = notifications.map(n => ({ ...n, is_read: true }));
    renderNotificationsList();
    // Clear badge
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to auto-mark all as read:', err);
  }
}

// Create notification modal HTML (to be added to each dashboard)
function createNotificationsModalHTML() {
  return `
    <div class="modal-backdrop" id="notifications-modal" style="display:none;z-index:1000">
      <div class="modal-container" style="max-width:500px;width:90%">
        <div class="modal-content">
          <button class="modal-close" onclick="closeModal('notifications-modal')">
            <i data-lucide="x"></i>
          </button>
          <div class="modal-header">
            <div class="modal-icon-wrapper bg-blue-light">
              <i data-lucide="bell" class="icon-lg text-blue"></i>
            </div>
      <h2 class="modal-title">Notifications</h2>
      <p class="modal-subtitle">View and manage your messages</p>
      <button id="read-all-btn" class="btn btn-secondary btn-sm" style="margin-left:auto;">Read All</button>
    </div>      </div>
          <div id="notifications-list" style="max-height:400px;overflow-y:auto"></div>
        </div>
      </div>
    </div>
  `;
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Expose to global scope
window.initNotifications = initNotifications;
window.openNotificationsModal = openNotificationsModal;