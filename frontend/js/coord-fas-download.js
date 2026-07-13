// Coordinator FAS download by PRN

window.downloadCoordFasByPrn = async function downloadCoordFasByPrn() {
  const prnInput = document.getElementById('fas-prn-input');
  const errorEl = document.getElementById('fas-download-error');
  const successEl = document.getElementById('fas-download-success');
  const previewEl = document.getElementById('fas-student-preview');
  const btn = document.getElementById('fas-download-btn');

  const prn = (prnInput?.value || '').trim();
  errorEl.style.display = 'none';
  successEl.style.display = 'none';
  previewEl.innerHTML = '';

  if (!prn) {
    errorEl.textContent = 'Please enter a student PRN number.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span>Looking up student…</span>';

    const response = await fetch(API_BASE + '/api/coordinator/students/by-prn/' + encodeURIComponent(prn), {
      headers: { 'x-auth-token': localStorage.getItem('token') },
    });

    if (response.status === 401) {
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      errorEl.textContent = data.error || 'Student not found in your division.';
      errorEl.style.display = 'block';
      return;
    }

    previewEl.innerHTML = '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem 1rem;background:rgba(5,150,105,0.08);border:1px solid rgba(5,150,105,0.2);border-radius:0.75rem;margin-bottom:1rem"><span style="font-size:1.25rem">Student:</span><div><div style="font-weight:700;color:#003366">' + escapeHtml(data.name) + '</div><div style="font-size:0.88rem;color:#666">PRN: ' + escapeHtml(data.prnNumber || prn) + '</div></div></div>';

    btn.innerHTML = '<span>Generating PDF…</span>';
    await generateFasPDFFromStudent(data, {
      buttonEl: btn,
      msgEl: document.getElementById('fas-pdf-msg'),
      btnDefaultHtml: '<span>Download FAS PDF</span>',
      btnLoadingHtml: '<span>Generating PDF…</span>',
      coordinatorProfile: coordinatorProfile || {},
      hodProfile: data.hodProfile || {},
    });

    successEl.textContent = 'FAS handbook downloaded for ' + data.name + '.';
    successEl.style.display = 'block';
  } catch (err) {
    if (errorEl.style.display !== 'block') {
      errorEl.textContent = err.message || 'Failed to download FAS form.';
      errorEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Download FAS PDF</span>';
  }
};

(function initCoordFasDownload() {
  const input = document.getElementById('fas-prn-input');
  if (!input) return;
  input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      downloadCoordFasByPrn();
    }
  });
})();