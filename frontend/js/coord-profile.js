// Coordinator profile management

let coordinatorProfile = {};

async function loadCoordinatorProfile() {
  try {
    const response = await fetch(API_BASE + '/api/coordinator/profile', {
      headers: { 'x-auth-token': localStorage.getItem('token') },
    });
    if (response.ok) {
      const data = await response.json();
      coordinatorProfile = data.profileData || {};
      // Populate form fields
      const ay = document.getElementById('academic-year');
      const mn = document.getElementById('mentor-name');
      const ms = document.getElementById('mentor-school');
      const md = document.getElementById('mentor-department');
      const mc = document.getElementById('mentor-contact');
      const me = document.getElementById('mentor-email');
      const mcnt = document.getElementById('mentee-count');
      const mcls = document.getElementById('mentee-class');

      const feYear = document.getElementById('official-fe-year');
      const seYear = document.getElementById('official-se-year');
      const teYear = document.getElementById('official-te-year');
      const beYear = document.getElementById('official-be-year');

      if (ay) ay.value = coordinatorProfile.AcademicYear || coordinatorProfile.academic_year || '';
      if (mn) mn.value = coordinatorProfile.MentorName || coordinatorProfile.mentor_name || '';
      if (ms) ms.value = coordinatorProfile.MentorSchool || coordinatorProfile.mentor_school || '';
      if (md) md.value = coordinatorProfile.MentorDepartment || coordinatorProfile.mentor_department || '';
      if (mc) mc.value = coordinatorProfile.MentorContact || coordinatorProfile.mentor_contact || '';
      if (me) me.value = coordinatorProfile.MentorEmail || coordinatorProfile.mentor_email || '';
      if (mcnt) mcnt.value = coordinatorProfile.MenteeCount || coordinatorProfile.mentee_count || '';
      if (mcls) mcls.value = coordinatorProfile.MenteeClass || coordinatorProfile.mentee_class || '';

      if (feYear) feYear.value = coordinatorProfile.OfficialUse_FE_Year || '';
      if (seYear) seYear.value = coordinatorProfile.OfficialUse_SE_Year || '';
      if (teYear) teYear.value = coordinatorProfile.OfficialUse_TE_Year || '';
      if (beYear) beYear.value = coordinatorProfile.OfficialUse_BE_Year || '';
    }
  } catch (err) {
    console.error('Failed to load coordinator profile:', err);
  }
}

async function saveCoordinatorProfile(isAyTab = false) {
  const profileData = {
    AcademicYear: document.getElementById('academic-year')?.value.trim(),
    MentorName: document.getElementById('mentor-name')?.value.trim(),
    MentorSchool: document.getElementById('mentor-school')?.value.trim(),
    MentorDepartment: document.getElementById('mentor-department')?.value.trim(),
    MentorContact: document.getElementById('mentor-contact')?.value.trim(),
    MentorEmail: document.getElementById('mentor-email')?.value.trim(),
    MenteeCount: document.getElementById('mentee-count')?.value.trim(),
    MenteeClass: document.getElementById('mentee-class')?.value.trim(),
    
    OfficialUse_FE_Year: document.getElementById('official-fe-year')?.value.trim(),
    OfficialUse_SE_Year: document.getElementById('official-se-year')?.value.trim(),
    OfficialUse_TE_Year: document.getElementById('official-te-year')?.value.trim(),
    OfficialUse_BE_Year: document.getElementById('official-be-year')?.value.trim(),
  };

  const errorEl = document.getElementById(isAyTab ? 'ay-error' : 'profile-error');
  const successEl = document.getElementById(isAyTab ? 'ay-success' : 'profile-success');
  const btn = document.getElementById(isAyTab ? 'save-ay-btn' : 'save-profile-btn');
  const originalBtnHtml = btn.innerHTML;

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  try {
    btn.disabled = true;
    btn.innerHTML = '<span>Saving...</span>';

    const response = await fetch(API_BASE + '/api/coordinator/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
      body: JSON.stringify({ profileData }),
    });

    const data = await response.json();
    if (!response.ok) {
      errorEl.textContent = data.error || 'Failed to save.';
      errorEl.style.display = 'block';
      return;
    }

    coordinatorProfile = data.profileData;
    successEl.textContent = 'Saved successfully!';
    successEl.style.display = 'block';
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to save.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
    lucide.createIcons();
  }
}