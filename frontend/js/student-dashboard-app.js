// Student Dashboard App

let studentData = null;
let fasData = null;
let coordinatorProfile = null;

// â”€â”€ Section navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SECTIONS = ['handbook', 'index', 'profile', 'academic', 'mentor-info', 'meeting', 'vision', 'fas'];

function showSection(id) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`).style.display = s === id ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.section === id);
  });
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Try multiple key variants from profile_data (case-insensitive fuzzy match)
function pval(...keys) {
  const pd = studentData?.profileData || {};
  for (const key of keys) {
    // exact match first
    if (pd[key] && String(pd[key]).trim()) return String(pd[key]).trim();
    // case-insensitive match
    const found = Object.keys(pd).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
  }
  return '';
}

function fval(...keys) {
  const fd = fasData?.data || {};
  for (const key of keys) {
    if (fd[key] && String(fd[key]).trim()) return String(fd[key]).trim();
    const found = Object.keys(fd).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && fd[found] && String(fd[found]).trim()) return String(fd[found]).trim();
  }
  return '';
}

function renderField(label, value) {
  const display = value || '';
  return `<div class="fas-field">
    <span class="fas-field-label">${label}</span>
    <span class="fas-field-value ${display ? '' : 'fas-field-empty'}">${display || '................................'}</span>
  </div>`;
}

// â”€â”€ Sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderHandbook() {
  const s = studentData || {};
  const name   = s.name || '';
  const prn    = s.prnNumber || '';
  const prog   = pval('Programme', 'program', 'course');
  const school = pval('SchoolName', 'school_name', 'School', 'school');
  document.getElementById('section-handbook').innerHTML = `
    <div class="handbook-title-page">
      <div class="handbook-logo-row">
        <img src="public/favicon.svg" style="width:3.5rem;height:3.5rem;opacity:0.85" alt="logo">
      </div>
      <div class="handbook-main-title">Mentor-Mentee Handbook</div>
      <div class="handbook-sub-title">Faculty Advisor System &nbsp;â€”&nbsp; (FAS)</div>
      <div class="handbook-divider"></div>
      <div class="handbook-meta">
        ${name  ? `<div><strong>${name}</strong></div>` : ''}
        ${prn   ? `<div>PRN: ${prn}</div>` : ''}
        ${prog  ? `<div>${prog}</div>` : ''}
        ${school? `<div>${school}</div>` : ''}
      </div>
    </div>`;
}

function renderIndex() {
  const items = [
    { sr: 1, title: 'Mentor Information' },
    { sr: 2, title: 'Mentor-Mentee Policy' },
    { sr: 3, title: 'Student Details' },
    { sr: 4, title: 'Meeting Report' },
    { sr: 5, title: 'Vision-Mission' },
  ];
  document.getElementById('section-index').innerHTML = `
    <div class="section-page-title">Index</div>
    <div class="handbook-card">
      <table class="index-table">
        <thead><tr><th>Sr. No.</th><th>Particulars</th></tr></thead>
        <tbody>${items.map(i => `<tr><td>${i.sr}</td><td>${i.title}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderProfile(editMode = false) {
  const s = studentData || {};
  const pd = s.profileData || {};

  // Read helpers with fallback across key variants
  const g = (...keys) => {
    for (const k of keys) {
      if (pd[k] && String(pd[k]).trim()) return String(pd[k]).trim();
      const found = Object.keys(pd).find(f => f.toLowerCase() === k.toLowerCase());
      if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
    }
    return '';
  };

  const fields = [
    { k: 'StudentName',    label: 'Student Name',      val: s.name || '',                                     ro: true },
    { k: 'SchoolName',     label: 'School Name',       val: g('SchoolName','School'),                         ro: true, co: true },
    { k: 'DepartmentName', label: 'Department',        val: s.department || g('DepartmentName','department'), ro: true },
    { k: 'Programme',      label: 'Programme',         val: g('Programme','program'),                         ro: true, co: true },
    { k: 'PRN',            label: 'PRN',               val: s.prnNumber || '',                                ro: true },
    { k: 'Yearofadmission',label: 'Year of Admission', val: g('Yearofadmission','YearOfAdmission'),           ro: true, co: true },
    { k: 'dob',            label: 'Date of Birth',     val: g('dob','DOB'),                                   ro: true, co: true },
    { k: 'Email',          label: 'Email',             val: s.email || '',                                    ro: true },
    { k: 'mobile_number',  label: 'Mobile Number',     val: g('mobile_number','mobile','phone'),              ro: true, co: true },
    { k: 'Division',       label: 'Division',          val: s.division || '',                                 ro: true },
  ];

const addressFields = [
    { k: 'PresentAddress',  label: 'Present Address',  val: g('PresentAddress','presentaddress'), ro: true, co: true },
    { k: 'PresentCity',     label: 'City',             val: g('PresentCity','presentcity'), ro: true, co: true },
    { k: 'PresentState',    label: 'State',            val: g('PresentState','presentstate'), ro: true, co: true },
    { k: 'PresentPincode',  label: 'Pincode',          val: g('PresentPincode','presentpincode'), ro: true, co: true },
    { k: 'PostalAddress',   label: 'Postal Address',   val: g('PostalAddress','postaladdress'), ro: true, co: true },
  ];

  const permanentAddressFields = [
    { k: 'PermanentAddress', label: 'Permanent Address', val: g('PermanentAddress','permanentaddress'), ro: true, co: true },
    { k: 'PermanentCity',    label: 'City',              val: g('PermanentCity','permanentcity'), ro: true, co: true },
    { k: 'PermanentState',   label: 'State',             val: g('PermanentState','permanentstate'), ro: true, co: true },
    { k: 'PermanentPincode', label: 'Pincode',           val: g('PermanentPincode','permanentpincode'), ro: true, co: true },
  ];

  const guardianFields = [
    { k: 'LocalGuardianName',    label: 'Local Guardian Name',    val: g('LocalGuardianName','GuardianName','guardianname'), ro: true, co: true },
    { k: 'LocalGuardianAddress', label: 'Local Guardian Address', val: g('LocalGuardianAddress','GuardianAddress','guardianaddress'), ro: true, co: true },
    { k: 'LocalGuardianMobile',  label: 'Local Guardian Mobile',    val: g('LocalGuardianMobile','GuardianMobile','guardianmobile'), ro: true, co: true },
  ];

  const familyFields = [
    { k: 'FatherName',    label: "Father's Name",          val: g('FatherName','father_name'),        ro: true, co: true },
    { k: 'FatherMobile1', label: "Father's Mobile 1",      val: g('FatherMobile1','FatherMobileNumber1','fathermobile1','father_mobile'), ro: true, co: true },
    { k: 'FatherMobile2', label: "Father's Mobile 2",      val: g('FatherMobile2','FatherMobileNumber2','fathermobile2','father_mobile2'), ro: true, co: true },
    { k: 'MotherName',    label: "Mother's Name",          val: g('MotherName','mother_name'),        ro: true, co: true },
    { k: 'MotherMobile1', label: "Mother's Mobile 1",      val: g('MotherMobile1','MotherMobileNumber1','mothermobile1','mother_mobile'), ro: true, co: true },
    { k: 'MotherMobile2', label: "Mother's Mobile 2",      val: g('MotherMobile2','MotherMobileNumber2','mothermobile2','mother_mobile2'), ro: true, co: true },
    { k: 'HostelerDayScholar', label: 'Hosteler / Day Scholar', val: g('HostelerDayScholar','hosteler'), ro: true, co: true },
  ];

  const familyTableRows = [
    { relation: 'Father',          nk: 'Family_Father_Name',    ak: 'Family_Father_Age',    qk: 'Family_Father_Qual' },
    { relation: 'Mother',          nk: 'Family_Mother_Name',    ak: 'Family_Mother_Age',    qk: 'Family_Mother_Qual' },
    { relation: 'Brother/Sister',  nk: 'Family_Sib1_Name',      ak: 'Family_Sib1_Age',      qk: 'Family_Sib1_Qual' },
    { relation: 'Brother/Sister',  nk: 'Family_Sib2_Name',      ak: 'Family_Sib2_Age',      qk: 'Family_Sib2_Qual' },
    { relation: 'Brother/Sister',  nk: 'Family_Sib3_Name',      ak: 'Family_Sib3_Age',      qk: 'Family_Sib3_Qual' },
  ];

  const educationFields = [
    { k: 'SSC_Board',       label: '10th SSC â€” Board/College',      val: g('SSC_Board','SSCBoard','ssc_board'), ro: true, co: true },
    { k: 'SSC_Year',        label: '10th SSC â€” Year',               val: g('SSC_Year','SSCYear','ssc_year'), ro: true, co: true },
    { k: 'SSC_Grade',       label: '10th SSC â€” Grade/Percentage',   val: g('SSC_Grade','SSCPercentage','ssc_grade','ssc_percentage'), ro: true, co: true },
    { k: 'HSSC_Board',      label: '12th HSSC â€” Board/College',     val: g('HSSC_Board','HSCBoard','hssc_board'), ro: true, co: true },
    { k: 'HSSC_Year',       label: '12th HSSC â€” Year',              val: g('HSSC_Year','HSCYear','hssc_year'), ro: true, co: true },
    { k: 'HSSC_Grade',      label: '12th HSSC â€” Grade/Percentage',  val: g('HSSC_Grade','HSCPercentage','hssc_grade','hssc_percentage'), ro: true, co: true },
    { k: 'Diploma_Board',   label: 'Diploma â€” Board/College',       val: g('Diploma_Board','DiplomaCollege','diploma_board'), ro: true, co: true },
    { k: 'Diploma_Year',    label: 'Diploma â€” Year',                val: g('Diploma_Year','DiplomaYear','diploma_year'), ro: true, co: true },
    { k: 'Diploma_Grade',   label: 'Diploma â€” Grade/Percentage',   val: g('Diploma_Grade','DiplomaPercentage','diploma_grade','diploma_percentage'), ro: true, co: true },
  ];

  function viewField(f) {
    const display = f.val || '';
    const coOnlyNote = f.co ? ` <span style="font-weight:400;font-size:0.7rem;color:var(--text-muted)">(Coordinator only)</span>` : '';
    return `<div class="fas-field">
      <span class="fas-field-label">${f.label}${coOnlyNote}</span>
      <span class="fas-field-value ${display ? '' : 'fas-field-empty'}">${display || '................................'}</span>
    </div>`;
  }

  function editField(f) {
    if (f.ro) {
      const readonlyLabel = f.co ? '(Coordinator only â€” read-only)' : '(read-only)';
      return `<div class="fas-field">
        <label class="fas-field-label">${f.label} <span style="color:var(--text-muted);font-weight:400;font-size:0.7rem">${readonlyLabel}</span></label>
        <input name="${f.k}" value="${escStr(f.val)}" readonly class="edit-input edit-input-readonly">
      </div>`;
    }
    return `<div class="fas-field">
      <label class="fas-field-label" for="ef-${f.k}">${f.label}</label>
      <input id="ef-${f.k}" name="${f.k}" value="${escStr(f.val)}" class="edit-input" placeholder="${f.label}">
    </div>`;
  }

  function renderActivities(isEdit) {
    const rowCount = 5;
    const rows = Array.from({ length: rowCount }, (_, i) => ({
      sk: `Activity_Sem_${i + 1}`,
      ak: `Activity_Name_${i + 1}`,
      ck: `Activity_Achievement_${i + 1}`,
    }));
    // Activities are coordinator-uploaded, always read-only for students
    const cell = (k, placeholder) => `<span class="${g(k) ? '' : 'fas-field-empty'}">${g(k) || '...............'}</span>`;
    return `<div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Participation in Co-curricular and Extracurricular Activities <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem">(Coordinator only)</span></div>
      <div class="table-shell">
        <table class="allocation-table">
          <thead>
            <tr><th>Sr. No.</th><th>Semester(s)</th><th>Activity(s)</th><th>Achievement(s)</th></tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td>${cell(r.sk, 'Semester')}</td>
              <td>${cell(r.ak, 'Activity')}</td>
              <td>${cell(r.ck, 'Achievement')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderHobbies(isEdit) {
    const val = g('Hobbies', 'hobbies', 'HobbiesAndInterest', 'hobbies_interest');
    // Hobbies from Excel is coordinator-uploaded, but students can add their own
    const content = isEdit
      ? `<textarea name="Hobbies" class="edit-input" rows="3" placeholder="Enter hobbies and interests..." style="resize:vertical;width:100%;padding:0.6rem 0.85rem">${escStr(val)}</textarea>`
      : `<p class="${val ? '' : 'fas-field-empty'}" style="line-height:2.2;word-break:break-word">${val || '................................................................................................................................................................\n......................................................................................................................................................................................'}</p>`;
    return `<div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Hobbies and Interest</div>
      ${content}
    </div>`;
  }

  function renderFamilyTable(rows, isEdit) {
    // Family details are coordinator-uploaded, always read-only for students
    const cell = (k, placeholder) => `<span class="${g(k) ? '' : 'fas-field-empty'}">${g(k) || '...............'}</span>`;
    return `<div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Family Details <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem">(Coordinator only)</span></div>
      <div class="table-shell">
        <table class="allocation-table">
          <thead>
            <tr><th>Sr. No.</th><th>Name</th><th>Relationship</th><th>Age (years)</th><th>Qualification / Occupation</th></tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td>${cell(r.nk, 'Name')}</td>
              <td><strong>${r.relation}</strong></td>
              <td>${cell(r.ak, 'Age')}</td>
              <td>${cell(r.qk, 'Qualification / Occupation')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderEducation(eduFields, isEdit) {
    const rows = [
      { label: '10th SSC',                   bk: 'SSC_Board',     yk: 'SSC_Year',     gk: 'SSC_Grade' },
      { label: '12th (10+2) HSSC',           bk: 'HSSC_Board',    yk: 'HSSC_Year',    gk: 'HSSC_Grade' },
      { label: 'Diploma (for Lateral Entry)', bk: 'Diploma_Board', yk: 'Diploma_Year', gk: 'Diploma_Grade' },
    ];
    const getField = k => { const f = eduFields.find(x => x.k === k); return f ? f : { k, val: '', ro: false }; };
    const cell = (k, placeholder) => {
      const field = getField(k);
      if (field.ro) {
        return `<span class="${field.val ? '' : 'fas-field-empty'}">${field.val || '...............'}</span>`;
      }
      return isEdit
        ? `<input name="${k}" value="${escStr(field.val)}" class="edit-input" placeholder="${placeholder}" style="min-width:7rem">`
        : `<span class="${field.val ? '' : 'fas-field-empty'}">${field.val || '...............'}</span>`;
    };
    return `<div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Educational Details <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem">(Editable by coordinator)</span></div>
      <div class="table-shell">
        <table class="allocation-table">
          <thead>
            <tr><th>Examination</th><th>Board / College</th><th>Year</th><th>Grade / Percentage</th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td><strong>${r.label}</strong></td>
              <td>${cell(r.bk, 'Board / College')}</td>
              <td>${cell(r.yk, 'Year')}</td>
              <td>${cell(r.gk, 'Grade / %')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  const renderCard = (title, flds, coOnly) => {
    const titleSuffix = coOnly ? ` <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted)">(Coordinator only)</span>` : '';
    return editMode
      ? `<div class="handbook-card" style="margin-top:1rem">
          ${ title ? `<div class="handbook-card-title">${title}${titleSuffix}</div>` : '' }
          <div class="field-grid">${flds.map(editField).join('')}</div>
         </div>`
      : `<div class="handbook-card" style="margin-top:1rem">
          ${ title ? `<div class="handbook-card-title">${title}${titleSuffix}</div>` : '' }
          <div class="field-grid">${flds.map(viewField).join('')}</div>
         </div>`;
  };

  const firstCard = editMode
    ? `<div class="handbook-card"><div class="field-grid">${fields.map(editField).join('')}</div></div>`
    : `<div class="handbook-card"><div class="field-grid">${fields.map(viewField).join('')}</div></div>`;

  const editBtn = `<button class="btn btn-dark" onclick="toggleProfileEdit()"><span>âœï¸ Edit Details</span></button>`;
  const saveBtn = `<button class="btn btn-primary" onclick="saveProfile()"><span>Save Changes</span></button>
                   <button class="btn btn-dark" onclick="toggleProfileEdit()" style="margin-left:0.5rem"><span>Cancel</span></button>`;

  document.getElementById('section-profile').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
      <div class="section-page-title" style="margin-bottom:0">Student Details</div>
      <div>${editMode ? saveBtn : editBtn}</div>
    </div>
    <div id="profile-save-msg"></div>
    <form id="profile-edit-form" onsubmit="return false">
      ${firstCard}
      ${renderCard('Present Address Details', addressFields, true)}
      ${renderCard('Permanent Address Details', permanentAddressFields, true)}
      ${renderCard('Parent Contact Details', familyFields, true)}
      ${renderCard('Local Guardian', guardianFields, true)}
      ${renderFamilyTable(familyTableRows, editMode)}
      ${renderEducation(educationFields, editMode)}
      ${renderHobbies(editMode)}
      ${renderActivities(editMode)}
    </form>`;
}

function escStr(val) {
  return String(val || '')
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let profileEditMode = false;

window.toggleProfileEdit = function() {
  profileEditMode = !profileEditMode;
  renderProfile(profileEditMode);
  if (!profileEditMode) profileEditMode = false;
};

window.saveProfile = async function() {
  const form = document.getElementById('profile-edit-form');
  if (!form) return;

  const profileData = {};
  form.querySelectorAll('input[name], textarea[name]').forEach(inp => {
    if (inp.name && !inp.hasAttribute('readonly')) profileData[inp.name] = inp.value.trim();
  });

  const msgEl = document.getElementById('profile-save-msg');
  msgEl.innerHTML = '<p class="text-muted" style="margin-bottom:0.75rem">Savingâ€¦</p>';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
      body: JSON.stringify({ profileData }),
    });

    const data = await res.json();

    if (!res.ok) {
      msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${data.error || 'Failed to save.'}</div>`;
      return;
    }

    studentData.profileData = { ...studentData.profileData, ...data.profileData };
    profileEditMode = false;
    renderProfile(false);

    const msg = document.createElement('div');
    msg.className = 'form-success';
    msg.style.marginBottom = '1rem';
    msg.textContent = 'Profile updated successfully!';
    document.getElementById('section-profile').prepend(msg);
    setTimeout(() => msg.remove(), 3000);
  } catch (err) {
    msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${err.message || 'Failed to save.'}</div>`;
  }
};

function renderAcademic(editMode = false) {
  const pd = studentData?.profileData || {};
  const g = (...keys) => {
    for (const k of keys) {
      if (pd[k] && String(pd[k]).trim()) return String(pd[k]).trim();
      const found = Object.keys(pd).find(f => f.toLowerCase() === k.toLowerCase());
      if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
    }
    return '';
  };

  const semesters = [
    { label: '1st',          ck: 'CGPA_Sem1',  gk: 'Grade_Sem1',  rk: 'Remarks_Sem1' },
    { label: '2nd',          ck: 'CGPA_Sem2',  gk: 'Grade_Sem2',  rk: 'Remarks_Sem2' },
    { label: '3rd',          ck: 'CGPA_Sem3',  gk: 'Grade_Sem3',  rk: 'Remarks_Sem3' },
    { label: '4th',          ck: 'CGPA_Sem4',  gk: 'Grade_Sem4',  rk: 'Remarks_Sem4' },
    { label: '5th',          ck: 'CGPA_Sem5',  gk: 'Grade_Sem5',  rk: 'Remarks_Sem5' },
    { label: '6th',          ck: 'CGPA_Sem6',  gk: 'Grade_Sem6',  rk: 'Remarks_Sem6' },
    { label: '7th',          ck: 'CGPA_Sem7',  gk: 'Grade_Sem7',  rk: 'Remarks_Sem7' },
    { label: '8th',          ck: 'CGPA_Sem8',  gk: 'Grade_Sem8',  rk: 'Remarks_Sem8' },
    { label: 'Consolidated',   ck: 'CGPA_Cons',  gk: 'Grade_Cons',  rk: 'Remarks_Cons' },
  ];

  const cell = (k, placeholder) => editMode
    ? `<input name="${k}" value="${escStr(g(k))}" class="edit-input" placeholder="${placeholder}" style="min-width:5rem">`
    : `<span class="${g(k) ? '' : 'fas-field-empty'}">${g(k) || '................................'}</span>`;

  const officialUseHTML = () => {
    const classes = [
      { label: 'Admitted in Class: FE',        yk: 'OfficialUse_FE_Year' },
      { label: 'Admitted in Class: SE/DSE',     yk: 'OfficialUse_SE_Year' },
      { label: 'Admitted in Class: TE',         yk: 'OfficialUse_TE_Year' },
      { label: 'Admitted in Class: BE',         yk: 'OfficialUse_BE_Year' },
    ];
    return `<div class="handbook-card" style="margin-top:1rem;border:2px solid rgba(37,99,235,0.18);background:rgba(239,246,255,0.6)">
      <div class="handbook-card-title" style="color:var(--blue-600)">For Official Use &nbsp;<span style="font-weight:400;font-size:0.78rem;color:var(--text-muted)">(Filled by Mentor â€” read only)</span></div>
      <div class="field-grid">
        ${classes.map(c => `<div class="fas-field">
          <span class="fas-field-label">${c.label}</span>
          <span class="fas-field-value ${g(c.yk) ? '' : 'fas-field-empty'}">Academic Year: ${g(c.yk) || '................................'}</span>
        </div>`).join('')}
      </div>
    </div>`;
  };

  const editBtn = `<button class="btn btn-dark" onclick="toggleAcademicEdit()"><span>âœï¸ Edit</span></button>`;
  const saveBtn = `<button class="btn btn-primary" onclick="saveAcademic()"><span>Save Changes</span></button>
                   <button class="btn btn-dark" onclick="toggleAcademicEdit()" style="margin-left:0.5rem"><span>Cancel</span></button>`;

  document.getElementById('section-academic').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
      <div class="section-page-title" style="margin-bottom:0">Academic Progress</div>
      <div>${editMode ? saveBtn : editBtn}</div>
    </div>
    <div id="academic-save-msg"></div>
    <form id="academic-edit-form" onsubmit="return false">
      <div class="handbook-card">
        <div class="table-shell">
          <table class="allocation-table">
            <thead>
              <tr><th>Semester</th><th>CGPA</th><th>Grade</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              ${semesters.map(s => `<tr>
                <td><strong>${s.label}</strong></td>
                <td>${cell(s.ck, 'CGPA')}</td>
                <td>${cell(s.gk, 'Grade')}</td>
                <td>${cell(s.rk, 'Remarks')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="handbook-card" style="margin-top:1rem">
        <div class="field-grid">
          <div class="fas-field">
            <span class="fas-field-label">Date</span>
            ${editMode
              ? `<input name="Academic_Date" value="${escStr(g('Academic_Date'))}" class="edit-input" placeholder="DD/MM/YYYY">`
              : `<span class="fas-field-value ${g('Academic_Date') ? '' : 'fas-field-empty'}">${g('Academic_Date') || '................................'}</span>`}
          </div>
          <div class="fas-field">
            <span class="fas-field-label">Mentee Name &amp; Signature</span>
            ${editMode
              ? `<input name="Academic_Signature" value="${escStr(g('Academic_Signature'))}" class="edit-input" placeholder="Name / Signature">`
              : `<span class="fas-field-value ${g('Academic_Signature') ? '' : 'fas-field-empty'}">${g('Academic_Signature') || '................................'}</span>`}
          </div>
        </div>
      </div>
      ${officialUseHTML()}
    </form>`;
}

let academicEditMode = false;

window.toggleAcademicEdit = function() {
  academicEditMode = !academicEditMode;
  renderAcademic(academicEditMode);
};

window.saveAcademic = async function() {
  const form = document.getElementById('academic-edit-form');
  if (!form) return;

  const profileData = {};
  form.querySelectorAll('input[name]').forEach(inp => {
    if (inp.name) profileData[inp.name] = inp.value.trim();
  });

  const msgEl = document.getElementById('academic-save-msg');
  msgEl.innerHTML = '<p class="text-muted" style="margin-bottom:0.75rem">Savingâ€¦</p>';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/student/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ profileData }),
    });
    const data = await res.json();
    if (!res.ok) {
      msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${data.error || 'Failed to save.'}</div>`;
      return;
    }
    studentData.profileData = { ...studentData.profileData, ...data.profileData };
    academicEditMode = false;
    renderAcademic(false);
    const msg = document.createElement('div');
    msg.className = 'form-success';
    msg.style.marginBottom = '1rem';
    msg.textContent = 'Academic progress saved successfully!';
    document.getElementById('section-academic').prepend(msg);
    setTimeout(() => msg.remove(), 3000);
  } catch (err) {
    msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${err.message || 'Failed to save.'}</div>`;
  }
};

function renderMentorInfo() {
  // Helper for coordinator profile
  const cval = (...keys) => {
    if (!coordinatorProfile) return '';
    for (const k of keys) {
      if (coordinatorProfile[k] && String(coordinatorProfile[k]).trim()) return String(coordinatorProfile[k]).trim();
      const found = Object.keys(coordinatorProfile).find(f => f.toLowerCase() === k.toLowerCase());
      if (found && coordinatorProfile[found]) return String(coordinatorProfile[found]).trim();
    }
    return '';
  };
  // Mentor info from coordinator profile (primary), then from profile_data or fas form_data
  const mentorName  = cval('MentorName','mentor_name') || pval('MentorName','mentor_name','Mentor','mentor') || fval('MentorName','mentor_name');
  const mentorSchool= cval('MentorSchool','mentor_school','SchoolName') || pval('MentorSchool','mentor_school') || fval('MentorSchool','mentor_school') || pval('SchoolName','School');
  const mentorDept  = cval('MentorDepartment','mentor_department') || pval('MentorDepartment','mentor_department','MentorDept') || fval('MentorDepartment','mentor_dept');
  const mentorPhone = cval('MentorContact','mentor_contact') || pval('MentorContact','mentor_contact','MentorPhone') || fval('MentorContact','mentor_phone');
  const mentorEmail = cval('MentorEmail','mentor_email') || pval('MentorEmail','mentor_email') || fval('MentorEmail','mentor_email');
  const menteeCount = cval('MenteeCount','mentee_count') || pval('MenteeCount','mentee_count','NoOfMentee') || fval('MenteeCount','mentee_count');
  const menteeClass = cval('MenteeClass','mentee_class') || pval('MenteeClass','mentee_class','ClassOfMentee') || fval('MenteeClass','mentee_class');
  const acadYear    = cval('AcademicYear','academic_year') || pval('AcademicYear','academic_year') || fval('AcademicYear','academic_year');

  document.getElementById('section-mentor-info').innerHTML = `
    <div class="section-page-title">Mentor Information</div>
    ${acadYear ? `<div class="handbook-badge">Academic Year: ${acadYear}</div>` : ''}
    <div class="handbook-card" ${acadYear ? 'style="margin-top:1rem"' : ''}>
      <div class="field-grid">
        ${renderField('Mentor Name', mentorName)}
        ${renderField('School', mentorSchool)}
        ${renderField('Department', mentorDept)}
        ${renderField('Contact Details', mentorPhone)}
        ${renderField('Email ID', mentorEmail)}
        ${renderField('No. of Mentees Allocated', menteeCount)}
        ${renderField('Class of Mentee', menteeClass)}
      </div>
    </div>`;
}

function renderMeeting(editMode = false) {
  const pd = studentData?.profileData || {};
  const g = (...keys) => {
    for (const k of keys) {
      if (pd[k] && String(pd[k]).trim()) return String(pd[k]).trim();
      const found = Object.keys(pd).find(f => f.toLowerCase() === k.toLowerCase());
      if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
    }
    return '';
  };

  const rowCount = 6;
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    no:    `Meeting_No_${i+1}`,
    date:  `Meeting_Date_${i+1}`,
    disc:  `Meeting_Discussion_${i+1}`,
    ssign: `Meeting_StudentSign_${i+1}`,
    action:`Meeting_Action_${i+1}`,
    msign: `Meeting_MentorSign_${i+1}`,
  }));

  // Student editable cell
  const sCell = (k, placeholder, wide) => editMode
    ? `<input name="${k}" value="${escStr(g(k))}" class="edit-input" placeholder="${placeholder}" style="min-width:${wide || '5rem'}">`
    : `<span class="${g(k) ? '' : 'fas-field-empty'}">${g(k) || '................................'}</span>`;

  // Coordinator-only cell (always read-only for student)
  const cCell = (k) => {
    const val = g(k);
      return val
        ? `<span style="color:var(--emerald-600);font-weight:600">${val}</span>`
        : `<span class="fas-field-empty" style="font-size:0.82rem">................................</span>`;
  };

  const editBtn = `<button class="btn btn-dark" onclick="toggleMeetingEdit()"><span>âœï¸ Edit</span></button>`;
  const saveBtn = `<button class="btn btn-primary" onclick="saveMeeting()"><span>Save Changes</span></button>
                   <button class="btn btn-dark" onclick="toggleMeetingEdit()" style="margin-left:0.5rem"><span>Cancel</span></button>`;

  document.getElementById('section-meeting').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
      <div class="section-page-title" style="margin-bottom:0">Meeting Report</div>
      <div>${editMode ? saveBtn : editBtn}</div>
    </div>
    <div class="handbook-badge" style="margin-bottom:1rem">
      â„¹ï¸ Your entries: Meeting No, Date, Discussion, Student Sign. Mentor fills Action &amp; Sign.
    </div>
    <div id="meeting-save-msg"></div>
    <form id="meeting-edit-form" onsubmit="return false">
      <div class="handbook-card">
        <div class="table-shell">
          <table class="allocation-table">
            <thead>
              <tr>
                <th>Meeting No.</th>
                <th>Meeting Date</th>
                <th>Discussions / Suggestions / Problems</th>
                <th>Student Sign</th>
                <th>Action Taken by Mentor</th>
                <th>Sign of Mentor</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `<tr>
                <td>${sCell(r.no,    'No.',       '3rem')}</td>
                <td>${sCell(r.date,  'DD/MM/YYYY','7rem')}</td>
                <td>${sCell(r.disc,  'Discussion','10rem')}</td>
                <td>${sCell(r.ssign, 'Sign',      '5rem')}</td>
                <td>${cCell(r.action)}</td>
                <td>${cCell(r.msign)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="handbook-card" style="margin-top:1rem">
        <div class="handbook-card-title">Signatures</div>
        <div class="field-grid">
          <div class="fas-field">
            <span class="fas-field-label">Name &amp; Sign of Head of Department</span>
            <span class="fas-field-value ${g('Meeting_HOD_Sign') ? '' : 'fas-field-empty'}">${g('Meeting_HOD_Sign') || '................................'}</span>
          </div>
          <div class="fas-field">
            <span class="fas-field-label">Name &amp; Sign of Dean</span>
            <span class="fas-field-value ${g('Meeting_Dean_Sign') ? '' : 'fas-field-empty'}">${g('Meeting_Dean_Sign') || '................................'}</span>
          </div>
        </div>
      </div>
    </form>`;
}

let meetingEditMode = false;

window.toggleMeetingEdit = function() {
  meetingEditMode = !meetingEditMode;
  renderMeeting(meetingEditMode);
};

window.saveMeeting = async function() {
  const form = document.getElementById('meeting-edit-form');
  if (!form) return;

  const profileData = {};
  form.querySelectorAll('input[name]').forEach(inp => {
    if (inp.name) profileData[inp.name] = inp.value.trim();
  });

  const msgEl = document.getElementById('meeting-save-msg');
  msgEl.innerHTML = '<p class="text-muted" style="margin-bottom:0.75rem">Savingâ€¦</p>';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/student/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ profileData }),
    });
    const data = await res.json();
    if (!res.ok) {
      msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${data.error || 'Failed to save.'}</div>`;
      return;
    }
    studentData.profileData = { ...studentData.profileData, ...data.profileData };
    meetingEditMode = false;
    renderMeeting(false);
    const msg = document.createElement('div');
    msg.className = 'form-success';
    msg.style.marginBottom = '1rem';
    msg.textContent = 'Meeting report saved successfully!';
    document.getElementById('section-meeting').prepend(msg);
    setTimeout(() => msg.remove(), 3000);
  } catch (err) {
    msgEl.innerHTML = `<div class="form-error" style="margin-bottom:0.75rem">${err.message || 'Failed to save.'}</div>`;
  }
};

function renderVision() {
  document.getElementById('section-vision').innerHTML = `
    <div class="section-page-title">Vision &amp; Mission</div>

    <div class="handbook-card">
      <div class="handbook-card-title" style="color:var(--uni-blue-dark);font-size:1.05rem">UNIVERSITY VISION</div>
      <p class="text-muted" style="line-height:1.9">To be one of the most preferred learning place to nurture future global leaders congenial to society.</p>
    </div>

    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title" style="color:var(--uni-blue-dark);font-size:1.05rem">UNIVERSITY MISSION (UM)</div>
      <p class="text-muted" style="line-height:1.9;margin-bottom:1rem">We, at Sandip University envisage the sustainable growth of stake holders:</p>
      <div class="vision-mission-list">
        <div class="vm-row"><span class="vm-code">UM1</span><span>To be a globally prominent university.</span></div>
        <div class="vm-row"><span class="vm-code">UM2</span><span>To provide learning through Cutting Edge Technologies Facilitated by the world class infrastructure to empower our students to converge into capable leaders &amp; responsible citizens bearing high ethical values.</span></div>
        <div class="vm-row"><span class="vm-code">UM3</span><span>To be a global leader in education &amp; human development to bloom as a center of excellence in teaching, research &amp; entrepreneurship.</span></div>
        <div class="vm-row"><span class="vm-code">UM4</span><span>Be the most preferred choice of students, parents, gardeners, faculty and industry.</span></div>
        <div class="vm-row"><span class="vm-code">UM5</span><span>Be in the Best top 10 preferred university in every discipline of education health sciences, engineering and management.</span></div>
      </div>
    </div>

    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title" style="color:var(--uni-blue-dark);font-size:1.05rem">VISION OF School of Computer Sciences and Engineering</div>
      <p class="text-muted" style="line-height:1.9">To be the prominent institution for teaching-learning and research for the computer application and engineering.</p>
    </div>

    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title" style="color:var(--uni-blue-dark);font-size:1.05rem">MISSION of School of Computer Sciences and Engineering</div>
      <div class="vision-mission-list" style="margin-top:0.5rem">
        <div class="vm-row"><span class="vm-code">M1</span><span>To impart in-depth technical knowledge.</span></div>
        <div class="vm-row"><span class="vm-code">M2</span><span>To provide environment for research, innovation, and entrepreneurship.</span></div>
        <div class="vm-row"><span class="vm-code">M3</span><span>To imbibe strong social and cultural values.</span></div>
      </div>
    </div>`;
}

function renderAll() {
  renderHandbook();
  renderIndex();
  renderProfile();
  renderAcademic();
  renderMentorInfo();
  renderMeeting();
  renderVision();
  renderFasDownload();
}

// â”€â”€ FAS PDF Download Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderFasDownload() {
  const sections = [
    { step: '01', label: 'Cover Page', desc: 'University header, campus image, student identity fields' },
    { step: '02', label: 'Mentor Information', desc: 'Coordinator mentor details in the template table' },
    { step: '03', label: 'Index', desc: 'Template table of contents' },
    { step: '04', label: 'Student Details', desc: 'Personal, address, family, education and academic pages' },
    { step: '05', label: 'Meeting Report', desc: 'Nine-row mentor-mentee meeting sheet' },
    { step: '06', label: 'Vision-Mission', desc: 'University and school mission table' },
  ];

  document.getElementById('section-fas').innerHTML = `
    <div class="section-page-title">Download FAS Handbook</div>
    <div class="handbook-card" style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:2px solid rgba(124,58,237,0.18)">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
        <div style="width:3.5rem;height:3.5rem;border-radius:1rem;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-weight:800">
          PDF
        </div>
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--uni-blue-dark)">Mentor-Mentee Handbook PDF</div>
          <div style="font-size:0.88rem;color:var(--text-muted);margin-top:0.15rem">Complete 8-page FAS handbook in the official template structure, ready to print or submit</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.65rem;margin-bottom:1.5rem">
        ${sections.map(sec => `
          <div style="display:flex;align-items:flex-start;gap:0.65rem;padding:0.75rem 1rem;background:rgba(255,255,255,0.7);border:1px solid rgba(226,232,240,0.9);border-radius:0.85rem">
            <span style="min-width:2rem;height:2rem;border-radius:999px;background:rgba(37,99,235,0.1);color:var(--blue-600);display:inline-flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;flex-shrink:0">${sec.step}</span>
            <div>
              <div style="font-size:0.88rem;font-weight:700;color:var(--uni-blue-dark)">${sec.label}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.1rem">${sec.desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <div id="fas-pdf-msg" style="margin-bottom:0.75rem"></div>
      <button id="fas-download-btn" class="btn btn-primary" onclick="generateFasPDF()" style="background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;padding:0.85rem 2rem;font-size:1rem">
        <span>Download FAS PDF</span>
      </button>
      <div style="margin-top:1rem;padding:0.85rem 1rem;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:0.75rem;font-size:0.82rem;color:#92400e">
        Fill in your profile, academic and meeting details first for a complete PDF. Empty fields will appear as dotted lines.
      </div>
    </div>`;
}

window.generateFasPDF = async function() {
  await generateFasPDFFromStudent(studentData, {
    buttonEl: document.getElementById('fas-download-btn'),
    msgEl: document.getElementById('fas-pdf-msg'),
    btnDefaultHtml: '<span>Download FAS PDF</span>',
    btnLoadingHtml: '<span>Generating PDF...</span>',
    coordinatorProfile: coordinatorProfile,
  });
};

// â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadStudentData() {
  const loadingEl = document.getElementById('student-loading');
  const errorEl   = document.getElementById('student-error');
  try {
    const data  = await authenticatedJsonFetch(`${API_BASE}/api/student/me`);
    studentData = data.student;
    fasData     = data.fasRecord;
    coordinatorProfile = data.coordinatorProfile || {};
    renderAll();
    if (loadingEl) loadingEl.style.display = 'none';
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) { errorEl.textContent = err.message || 'Failed to load profile.'; errorEl.style.display = 'block'; }
  }
}

// â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSection(link.dataset.section);
      if (window.innerWidth <= 768) toggleSidebar(false);
    });
  });
  showSection('handbook');
  loadStudentData();
});
