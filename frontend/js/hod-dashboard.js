(function () {
  const pageMarker = document.getElementById('allocation-table-body');

  if (!pageMarker) {
    return;
  }

  const DIVISIONS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

  const state = {
    coordinators: [],
    rosterSearchQuery: '',
    activity: [],
    pendingReports: [],
    lastSyncAt: null,
    syncMode: 'loading',
    syncLabel: 'Loading coordinator roster...',
    syncHelp: 'Preparing the coordinator workspace.',
  };

  const elements = {
    userDisplayName: document.getElementById('user-display-name'),
    welcomeMsg: document.getElementById('welcome-msg'),
    totalFaculty: document.getElementById('total-faculty'),
    divisionsAssigned: document.getElementById('divisions-assigned'),
    pendingReviews: document.getElementById('pending-reviews'),
    manualCoordinatorForm: document.getElementById('manual-coordinator-form'),
    manualCoordinatorName: document.getElementById('manual-coordinator-name'),
    manualCoordinatorEmail: document.getElementById('manual-coordinator-email'),
    manualCoordinatorPrn: document.getElementById('manual-coordinator-prn'),
    manualCoordinatorDivision: document.getElementById('manual-coordinator-division'),
    manualCoordinatorSubmit: document.getElementById('manual-coordinator-submit'),
    manualCoordinatorError: document.getElementById('manual-coordinator-error'),
    manualCoordinatorSuccess: document.getElementById('manual-coordinator-success'),
    coordinatorRosterSearch: document.getElementById('coordinator-roster-search'),
    coordinatorRosterBody: document.getElementById('coordinator-roster-body'),
    coordinatorRosterChip: document.getElementById('coordinator-roster-chip'),
    allocationTableBody: document.getElementById('allocation-table-body'),
    allocationTableChip: document.getElementById('allocation-table-chip'),
    reportList: document.getElementById('report-list'),
    reportChip: document.getElementById('report-chip'),
    payloadSummary: document.getElementById('payload-summary'),
    previewPayloadBtn: document.getElementById('preview-payload-btn'),
    payloadModal: document.getElementById('payload-modal'),
    payloadPreview: document.getElementById('payload-preview'),
    confirmSyncBtn: document.getElementById('confirm-sync-btn'),
    closePayloadBtn: document.getElementById('close-payload-btn'),
    payloadCloseAction: document.getElementById('payload-close-action'),
    sidebarLinks: Array.from(document.querySelectorAll('.sidebar-link[href^="#"]')),
  };

  let currentUser = null;

  function init() {
    currentUser = checkAuth('hod');
    if (!currentUser) {
      return;
    }

    elements.userDisplayName.textContent = currentUser.name;
    elements.welcomeMsg.textContent = `Welcome, ${currentUser.name}. Add coordinators manually, review the full roster, and keep division assignments aligned from one workspace.`;

    populateDivisionSelect(elements.manualCoordinatorDivision, '', 'Choose division');
    bindEvents();
    renderAll();
    lucide.createIcons();
    loadCoordinatorRoster();
  }

  function bindEvents() {
    elements.manualCoordinatorForm.addEventListener('submit', handleManualCoordinatorSubmit);
    elements.coordinatorRosterSearch.addEventListener('input', handleCoordinatorRosterSearch);
    elements.coordinatorRosterBody.addEventListener('change', handleRosterDivisionChange);
    elements.previewPayloadBtn.addEventListener('click', openPayloadPreview);
    elements.confirmSyncBtn.addEventListener('click', syncAllocations);
    elements.closePayloadBtn.addEventListener('click', closePayloadPreview);
    elements.payloadCloseAction.addEventListener('click', closePayloadPreview);
    elements.payloadModal.addEventListener('click', (event) => {
      if (event.target === elements.payloadModal) {
        closePayloadPreview();
      }
    });

    elements.sidebarLinks.forEach((link) => {
      link.addEventListener('click', () => {
        elements.sidebarLinks.forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
        toggleSidebar(false);
      });
    });

    const sendNotifForm = document.getElementById('send-notification-form');
    const notifError = document.getElementById('notif-error');
    if (sendNotifForm) {
      sendNotifForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = sendNotifForm.title.value.trim();
        const message = sendNotifForm.message.value.trim();

        if (!title || !message) {
          notifError.textContent = 'Title and message are required.';
          notifError.style.display = 'block';
          return;
        }

        try {
          const res = await fetch(`${API_BASE}/api/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': localStorage.getItem('token'),
            },
            body: JSON.stringify({ title, message }),
          });

          const data = await res.json();
          if (!res.ok) {
            notifError.textContent = data.error || 'Failed to send notification.';
            notifError.style.display = 'block';
            return;
          }

          notifError.style.display = 'none';
          sendNotifForm.reset();
          closeModal('send-notification-modal');
          alert('Notice sent successfully to all coordinators!');
        } catch (err) {
          notifError.textContent = err.message || 'Failed to send notification.';
          notifError.style.display = 'block';
        }
      });
    }
  }

  async function loadCoordinatorRoster() {
    renderStats();

    try {
      const response = await authenticatedRequest(`${API_BASE}/api/hod/coordinators`);
      const coordinators = await response.json();

      state.coordinators = coordinators.map((coordinator) => ({
        name: coordinator.name || 'Unnamed Coordinator',
        email: normalizeEmail(coordinator.email),
        prnNumber: normalizeText(coordinator.prnNumber || (coordinator.profileData && coordinator.profileData.PRN)),
        division: normalizeDivision(coordinator.division),
        originalDivision: normalizeDivision(coordinator.division),
      }));

      sortCoordinators();
      state.lastSyncAt = new Date();
      state.pendingReports = buildPendingReports();
      renderAll();
    } catch (error) {
      renderAll();
    }
  }

  async function handleManualCoordinatorSubmit(event) {
    event.preventDefault();
    clearManualCoordinatorMessages();

    const name = normalizeText(elements.manualCoordinatorName.value);
    const email = normalizeEmail(elements.manualCoordinatorEmail.value);
    const prnNumber = normalizeText(elements.manualCoordinatorPrn.value);
    const division = normalizeDivision(elements.manualCoordinatorDivision.value);

    if (!name || !email || !prnNumber || !division) {
      showManualCoordinatorError('Please complete name, email, PRN, and allocated division.');
      return;
    }

    if (!isValidEmail(email)) {
      showManualCoordinatorError('Please enter a valid coordinator email address.');
      return;
    }

    const originalButtonMarkup = elements.manualCoordinatorSubmit.innerHTML;
    elements.manualCoordinatorSubmit.disabled = true;
    elements.manualCoordinatorSubmit.innerHTML = '<span>Adding...</span>';
    renderStats();

    try {
      await authenticatedJsonRequest(`${API_BASE}/api/hod/coordinators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token'),
        },
        body: JSON.stringify({
          name,
          email,
          prnNumber,
          division,
        }),
      });

      elements.manualCoordinatorForm.reset();
      populateDivisionSelect(elements.manualCoordinatorDivision, '', 'Choose division');
      showManualCoordinatorSuccess(`Coordinator added successfully. Initial sign-in password is set to PRN ${prnNumber}.`);
      await loadCoordinatorRoster();
    } catch (error) {
      showManualCoordinatorError(error.message || 'The coordinator could not be added right now.');
      renderAll();
    } finally {
      elements.manualCoordinatorSubmit.disabled = false;
      elements.manualCoordinatorSubmit.innerHTML = originalButtonMarkup;
      lucide.createIcons();
    }
  }

  function handleCoordinatorRosterSearch(event) {
    state.rosterSearchQuery = event.target.value.trim().toLowerCase();
    renderCoordinatorRoster();
  }

  function handleRosterDivisionChange(event) {
    const select = event.target.closest('[data-division-email]');
    if (!select) {
      return;
    }

    updateCoordinatorDivision(select.getAttribute('data-division-email'), normalizeDivision(select.value));
  }

  function updateCoordinatorDivision(email, division) {
    const coordinator = state.coordinators.find((item) => item.email === email);
    if (!coordinator) {
      return;
    }

    const previousDivision = coordinator.division;
    if (previousDivision === division) {
      return;
    }

    coordinator.division = division;
    state.pendingReports = buildPendingReports();

    sortCoordinators();
    renderAll();
  }

  async function deleteCoordinator(email) {
    const hodPassword = prompt('Enter your HOD password to confirm deletion:');
    if (!hodPassword) {
      return;
    }

    try {
      await authenticatedJsonRequest(`${API_BASE}/api/hod/delete-coordinator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token'),
        },
        body: JSON.stringify({
          email,
          hodPassword,
        }),
      });

      await loadCoordinatorRoster();
    } catch (error) {
      alert(`Failed to delete coordinator: ${error.message || 'Unknown error'}`);
    }
  }

  function getAssignedCoordinators() {
    return state.coordinators
      .filter((coordinator) => coordinator.division)
      .sort((first, second) => {
        const divisionDiff = first.division.localeCompare(second.division);
        return divisionDiff || first.name.localeCompare(second.name);
      });
  }

  function getUnassignedCoordinators() {
    return state.coordinators
      .filter((coordinator) => !coordinator.division)
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  function getPendingChangeCount() {
    return state.coordinators.filter((coordinator) => coordinator.division !== coordinator.originalDivision).length;
  }

  function getActiveDivisionCount() {
    return new Set(
      state.coordinators
        .map((coordinator) => coordinator.division)
        .filter((division) => DIVISIONS.includes(division))
    ).size;
  }

  function buildPendingReports() {
    return [];
  }

  function setSyncStatus(mode, label, help) {
    state.syncMode = mode;
    state.syncLabel = label;
    state.syncHelp = help;
  }

  function renderAll() {
    renderStats();
    renderCoordinatorRoster();
    renderAllocationTable();
    renderReports();
    renderPayloadSummary();
  }

  function renderStats() {
    elements.totalFaculty.textContent = String(state.coordinators.length);
    elements.divisionsAssigned.textContent = String(getActiveDivisionCount());
    elements.pendingReviews.textContent = String(state.pendingReports.length);
  }

  function renderCoordinatorRoster() {
    elements.coordinatorRosterChip.textContent = `${state.coordinators.length} total`;

    const filteredCoordinators = state.coordinators.filter((coordinator) => {
      if (!state.rosterSearchQuery) {
        return true;
      }

      const haystack = `${coordinator.name} ${coordinator.email} ${coordinator.prnNumber} ${coordinator.division}`.toLowerCase();
      return haystack.includes(state.rosterSearchQuery);
    });

    if (!filteredCoordinators.length) {
      elements.coordinatorRosterBody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state empty-state-inline">
              <strong>No coordinators match the current search.</strong>
              <span>Try a different name, email, PRN, or division keyword.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    elements.coordinatorRosterBody.innerHTML = filteredCoordinators.map((coordinator) => `
      <tr>
        <td>
          <div class="table-person">
            <strong>${escapeHtml(coordinator.name)}</strong>
          </div>
        </td>
        <td>${escapeHtml(coordinator.email)}</td>
          <td>${escapeHtml(coordinator.prnNumber || '................................')}</td>
        <td>
          <select class="form-input form-select table-select" data-division-email="${escapeHtml(coordinator.email)}">
            ${buildDivisionOptionsMarkup(coordinator.division, 'Unassigned')}
          </select>
        </td>
        <td>
          <span class="panel-chip table-chip ${getCoordinatorStatusClassName(coordinator)}">${escapeHtml(getCoordinatorStatusLabel(coordinator))}</span>
        </td>
        <td>
          <button type="button" class="btn-delete-coordinator" data-coordinator-email="${escapeHtml(coordinator.email)}" title="Delete coordinator">
            <i data-lucide="trash-2" class="icon-sm"></i>
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-delete-coordinator').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = btn.getAttribute('data-coordinator-email');
        if (confirm(`Are you sure you want to delete this coordinator? This action cannot be undone.`)) {
          deleteCoordinator(email);
        }
      });
    });
  }

  function renderAllocationTable() {
    const assigned = getAssignedCoordinators();
    elements.allocationTableChip.textContent = `${assigned.length} assigned`;

    if (!assigned.length) {
      elements.allocationTableBody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state empty-state-inline">
              <strong>No division mappings yet.</strong>
              <span>Add a coordinator manually or assign a division from the full coordinator roster.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    elements.allocationTableBody.innerHTML = assigned.map((coordinator) => `
      <tr>
        <td>
          <div class="table-person">
            <strong>${escapeHtml(coordinator.name)}</strong>
            <span>${escapeHtml(coordinator.email)}</span>
          </div>
        </td>
          <td>${escapeHtml(coordinator.prnNumber || '................................')}</td>
        <td><span class="division-badge">Division ${escapeHtml(coordinator.division)}</span></td>
      </tr>
    `).join('');
  }

  function renderActivity() {
    const items = state.activity.slice(0, 8);

    if (!items.length) {
      elements.pulseTimeline.innerHTML = `
        <div class="empty-state empty-state-compact">
          <strong>No recent activity yet.</strong>
          <span>Add a coordinator manually or update a division to build the department pulse.</span>
        </div>
      `;
      return;
    }

    elements.pulseTimeline.innerHTML = items.map((item) => `
      <div class="timeline-item">
        <span class="timeline-marker ${getTimelineMarkerClass(item.kind)}"></span>
        <div class="timeline-copy">
          <strong>${escapeHtml(item.message)}</strong>
          <span>${formatRelative(item.timestamp)}</span>
        </div>
      </div>
    `).join('');
  }

  function renderReports() {
    elements.reportChip.textContent = `${state.pendingReports.length} pending`;

    if (!state.pendingReports.length) {
      elements.reportList.innerHTML = `
        <div class="empty-state">
          <strong>No pending review backlog for the active divisions.</strong>
          <span>Once divisions are mapped, oversight-ready student review items will appear here.</span>
        </div>
      `;
      return;
    }

    elements.reportList.innerHTML = state.pendingReports.map((report) => `
      <article class="report-item">
        <div class="report-item-top">
          <strong>${escapeHtml(report.student)}</strong>
          <span class="division-badge division-badge-soft">Division ${escapeHtml(report.division)}</span>
        </div>
        <p>${escapeHtml(report.title)}</p>
      </article>
    `).join('');
  }

  function renderPayloadSummary() {
    const pendingChanges = getPendingChangeCount();
    const unassigned = getUnassignedCoordinators().length;
    const assigned = getAssignedCoordinators().length;

    elements.payloadSummary.innerHTML = `
      <strong>${pendingChanges} pending change(s)</strong>
      <span>${assigned} assigned coordinator(s), ${unassigned} unassigned coordinator(s), and ${getActiveDivisionCount()} active division lane(s) will be represented in the next payload.</span>
    `;
  }

  function buildPayload() {
    const coordinators = [...state.coordinators]
      .sort((first, second) => first.name.localeCompare(second.name))
      .map((coordinator) => ({
        name: coordinator.name,
        email: coordinator.email,
        prnNumber: coordinator.prnNumber || '',
        division: coordinator.division || '',
      }));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalFaculty: state.coordinators.length,
        divisionsAssigned: getActiveDivisionCount(),
        unassignedCoordinators: getUnassignedCoordinators().length,
        pendingReviewCount: state.pendingReports.length,
        pendingSyncChanges: getPendingChangeCount(),
      },
      coordinators,
    };
  }

  function openPayloadPreview() {
    const payload = buildPayload();
    elements.payloadPreview.textContent = JSON.stringify(payload, null, 2);
    elements.payloadModal.style.display = 'flex';
    lucide.createIcons();
  }

  function closePayloadPreview() {
    elements.payloadModal.style.display = 'none';
  }

  async function syncAllocations() {
    const updatedExisting = state.coordinators.filter(
      (coordinator) => coordinator.division !== coordinator.originalDivision
    );

    if (!updatedExisting.length) {
      closePayloadPreview();
      setSyncStatus(
        'live',
        'No pending changes to sync.',
        state.lastSyncAt ? `Last synced ${formatClock(state.lastSyncAt)}.` : 'The workspace is already aligned with the database.'
      );
      renderAll();
      return;
    }

    elements.confirmSyncBtn.disabled = true;
    setSyncStatus('saving', 'Saving updated division assignments...', `Preparing ${updatedExisting.length} coordinator change(s) for live sync.`);
    renderAll();

    try {
      for (const coordinator of updatedExisting) {
        await authenticatedJsonRequest(`${API_BASE}/api/hod/update-division`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token'),
          },
          body: JSON.stringify({
            email: coordinator.email,
            division: coordinator.division || '',
          }),
        });
      }

      state.lastSyncAt = new Date();
      closePayloadPreview();
      await loadCoordinatorRoster();
    } catch (error) {
      renderAll();
    } finally {
      elements.confirmSyncBtn.disabled = false;
    }
  }

  async function authenticatedRequest(url, options) {
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

  async function authenticatedJsonRequest(url, options) {
    const response = await authenticatedRequest(url, options);
    return response.json().catch(() => ({}));
  }

  function addActivity(message, kind) {
    state.activity.unshift({
      message,
      kind,
      timestamp: Date.now(),
    });
  }

  function sortCoordinators() {
    state.coordinators.sort((first, second) => first.name.localeCompare(second.name));
  }

  function populateDivisionSelect(selectElement, selectedDivision, blankLabel) {
    if (!selectElement) {
      return;
    }

    selectElement.innerHTML = buildDivisionOptionsMarkup(selectedDivision, blankLabel);
  }

  function buildDivisionOptionsMarkup(selectedDivision, blankLabel) {
    const options = [];
    const normalizedSelected = normalizeDivision(selectedDivision);

    if (blankLabel) {
      options.push(`<option value=""${normalizedSelected ? '' : ' selected'}>${escapeHtml(blankLabel)}</option>`);
    }

    DIVISIONS.forEach((division) => {
      options.push(
        `<option value="${division}"${division === normalizedSelected ? ' selected' : ''}>Division ${division}</option>`
      );
    });

    return options.join('');
  }

  function getCoordinatorStatusLabel(coordinator) {
    if (coordinator.division !== coordinator.originalDivision) {
      return 'Pending Save';
    }

    if (!coordinator.division) {
      return 'Unassigned';
    }

    return 'Synced';
  }

  function getCoordinatorStatusClassName(coordinator) {
    if (coordinator.division !== coordinator.originalDivision) {
      return 'panel-chip-info';
    }

    if (!coordinator.division) {
      return 'panel-chip-neutral';
    }

    return 'panel-chip-success';
  }

  function clearManualCoordinatorMessages() {
    elements.manualCoordinatorError.style.display = 'none';
    elements.manualCoordinatorError.textContent = '';
    elements.manualCoordinatorSuccess.style.display = 'none';
    elements.manualCoordinatorSuccess.textContent = '';
  }

  function showManualCoordinatorError(message) {
    elements.manualCoordinatorSuccess.style.display = 'none';
    elements.manualCoordinatorError.textContent = message;
    elements.manualCoordinatorError.style.display = 'block';
  }

  function showManualCoordinatorSuccess(message) {
    elements.manualCoordinatorError.style.display = 'none';
    elements.manualCoordinatorSuccess.textContent = message;
    elements.manualCoordinatorSuccess.style.display = 'block';
  }

  function summarizeStatusValue(mode) {
    if (mode === 'saving') {
      return 'Syncing';
    }

    if (mode === 'dirty') {
      return 'Pending Save';
    }

    if (mode === 'error') {
      return 'Attention';
    }

    if (mode === 'loading') {
      return 'Loading';
    }

    return 'Live';
  }

  function getStatusDotClass(mode) {
    if (mode === 'saving') {
      return 'status-dot-syncing';
    }

    if (mode === 'dirty') {
      return 'status-dot-warning';
    }

    if (mode === 'error') {
      return 'status-dot-error';
    }

    return 'status-dot-live';
  }

  function getTimelineMarkerClass(kind) {
    if (kind === 'sync') {
      return 'timeline-marker-sync';
    }

    if (kind === 'error') {
      return 'timeline-marker-error';
    }

    if (kind === 'warning') {
      return 'timeline-marker-warning';
    }

    return 'timeline-marker-default';
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function normalizeDivision(division) {
    const normalized = String(division || '').trim().toUpperCase();
    return DIVISIONS.includes(normalized) ? normalized : '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function formatClock(date) {
    if (!date) {
      return 'just now';
    }

    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function formatRelative(timestamp) {
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  document.addEventListener('DOMContentLoaded', init);
}());
