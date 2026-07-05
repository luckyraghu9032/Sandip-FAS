// Coordinator Handbook Viewer

const COORD_HANDBOOK_SECTIONS = ['handbook', 'index', 'profile', 'academic', 'mentor-info', 'meeting', 'vision'];

let coordHandbookStudent = null;

function showHandbookSection(id) {
  COORD_HANDBOOK_SECTIONS.forEach(s => {
    const el = document.getElementById(`ch-section-${s}`);
    if (el) el.style.display = s === id ? '' : 'none';
  });
  document.querySelectorAll('.ch-nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === id);
  });
}

function chField(label, value) {
  const display = value || '';
  return `<div class="fas-field">
    <span class="fas-field-label">${label}</span>
    <span class="fas-field-value ${display ? '' : 'fas-field-empty'}">${display || '................................'}</span>
  </div>`;
}

function chG(pd, ...keys) {
  for (const k of keys) {
    if (pd[k] && String(pd[k]).trim()) return String(pd[k]).trim();
    const found = Object.keys(pd).find(f => f.toLowerCase() === k.toLowerCase());
    if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
  }
  return '';
}

function renderCoordHandbook(s) {
  const pd = s.profileData || {};
  const g = (...keys) => chG(pd, ...keys);
  const name = s.name || ''; const prn = s.prnNumber || '';
  const prog = g('Programme','program'); const school = g('SchoolName','School');

  document.getElementById('ch-section-handbook').innerHTML = `
    <div class="handbook-title-page">
      <div class="handbook-logo-row"><img src="public/favicon.svg" style="width:3.5rem;height:3.5rem;opacity:0.85" alt="logo"></div>
      <div class="handbook-main-title">Mentor-Mentee Handbook</div>
      <div class="handbook-sub-title">Faculty Advisor System &nbsp;—&nbsp; (FAS)</div>
      <div class="handbook-divider"></div>
      <div class="handbook-meta">
        ${name   ? `<div><strong>${name}</strong></div>` : ''}
        ${prn    ? `<div>PRN: ${prn}</div>` : ''}
        ${prog   ? `<div>${prog}</div>` : ''}
        ${school ? `<div>${school}</div>` : ''}
      </div>
    </div>`;
}

function renderCoordIndex() {
  const items = ['Mentor Information','Mentor-Mentee Policy','Student Details','Meeting Report','Vision-Mission'];
  document.getElementById('ch-section-index').innerHTML = `
    <div class="section-page-title">Index</div>
    <div class="handbook-card">
      <table class="index-table">
        <thead><tr><th>Sr. No.</th><th>Particulars</th></tr></thead>
        <tbody>${items.map((t,i) => `<tr><td>${i+1}</td><td>${t}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderCoordProfile(s, editMode = false) {
  const pd = s.profileData || {};
  const g = (...keys) => chG(pd, ...keys);
  const escStr = (val) => String(val || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  const editInput = (k, v, ph) => `<input name="${k}" value="${escStr(v)}" class="edit-input" placeholder="${ph}" style="width:100%;box-sizing:border-box">`;
  const card = (title, flds, mt) => `<div class="handbook-card"${mt?' style="margin-top:1rem"':''}>
    ${title ? `<div class="handbook-card-title">${title}</div>` : ''}<div class="field-grid">${flds.map(f => 
      editMode 
        ? `<div class="fas-field"><label class="fas-field-label">${f.l}</label>${editInput(f.k, f.v, f.l)}</div>`
        : chField(f.l, f.v)
    ).join('')}</div></div>`;
  
  const semRows = [
    {label:'10th SSC',bk:'SSC_Board',yk:'SSC_Year',gk:'SSC_Grade'},
    {label:'12th (10+2) HSSC',bk:'HSSC_Board',yk:'HSSC_Year',gk:'HSSC_Grade'},
    {label:'Diploma (Lateral Entry)',bk:'Diploma_Board',yk:'Diploma_Year',gk:'Diploma_Grade'},
  ];
  const famRows = [
    {rel:'Father',nk:'Family_Father_Name',ak:'Family_Father_Age',qk:'Family_Father_Qual'},
    {rel:'Mother',nk:'Family_Mother_Name',ak:'Family_Mother_Age',qk:'Family_Mother_Qual'},
    {rel:'Brother/Sister',nk:'Family_Sib1_Name',ak:'Family_Sib1_Age',qk:'Family_Sib1_Qual'},
    {rel:'Brother/Sister',nk:'Family_Sib2_Name',ak:'Family_Sib2_Age',qk:'Family_Sib2_Qual'},
    {rel:'Brother/Sister',nk:'Family_Sib3_Name',ak:'Family_Sib3_Age',qk:'Family_Sib3_Qual'},
  ];
  const actRows = Array.from({length:5},(_,i)=>({sk:`Activity_Sem_${i+1}`,ak:`Activity_Name_${i+1}`,ck:`Activity_Achievement_${i+1}`}));
  
  const editBtn = `<button class="btn btn-dark" onclick="toggleCoordProfileEdit(${s.id})"><span>✏️ Edit Details</span></button>`;
  const saveBtn = `<button class="btn btn-primary" onclick="saveCoordProfile(${s.id})"><span>Save</span></button>
                   <button class="btn btn-dark" onclick="loadCoordHandbook(${s.id})" style="margin-left:0.5rem"><span>Cancel</span></button>`;

  const profileFields = [
    {k:'SchoolName', l:'School Name', v:g('SchoolName','School')},
    {k:'DepartmentName', l:'Department', v:s.department||g('DepartmentName','department')},
    {k:'Programme', l:'Programme', v:g('Programme','program')},
    {k:'Yearofadmission', l:'Year of Admission', v:g('Yearofadmission','YearOfAdmission')},
    {k:'dob', l:'Date of Birth', v:g('dob','DOB')},
    {k:'mobile_number', l:'Mobile', v:g('mobile_number','mobile')},
  ];
  
  const addrFields = [
    {k:'PresentAddress', l:'Present Address', v:g('PresentAddress')},
    {k:'PresentCity', l:'City', v:g('PresentCity')},
    {k:'PresentState', l:'State', v:g('PresentState')},
    {k:'PresentPincode', l:'Pincode', v:g('PresentPincode')},
    {k:'PostalAddress', l:'Postal Address', v:g('PostalAddress')},
  ];
  
  const permAddrFields = [
    {k:'PermanentAddress', l:'Permanent Address', v:g('PermanentAddress')},
    {k:'PermanentCity', l:'City', v:g('PermanentCity')},
    {k:'PermanentState', l:'State', v:g('PermanentState')},
    {k:'PermanentPincode', l:'Pincode', v:g('PermanentPincode')},
  ];
  
  const parentFields = [
    {k:'FatherName', l:"Father's Name", v:g('FatherName')},
    {k:'FatherMobile1', l:"Father's Mobile 1", v:g('FatherMobile1')},
    {k:'FatherMobile2', l:"Father's Mobile 2", v:g('FatherMobile2')},
    {k:'MotherName', l:"Mother's Name", v:g('MotherName')},
    {k:'MotherMobile1', l:"Mother's Mobile 1", v:g('MotherMobile1')},
    {k:'MotherMobile2', l:"Mother's Mobile 2", v:g('MotherMobile2')},
    {k:'HostelerDayScholar', l:'Hosteler / Day Scholar', v:g('HostelerDayScholar')},
  ];
  
  const guardianFields = [
    {k:'LocalGuardianName', l:'Name', v:g('LocalGuardianName')},
    {k:'LocalGuardianAddress', l:'Address', v:g('LocalGuardianAddress')},
    {k:'LocalGuardianMobile', l:'Mobile', v:g('LocalGuardianMobile')},
  ];

  const cv = (k) => {
    const val = g(k);
    return val ? `<span style="color:var(--uni-blue-dark)">${val}</span>` : `<span class="fas-field-empty">—</span>`;
  };

  document.getElementById('ch-section-profile').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.5rem">
      <div class="section-page-title" style="margin-bottom:0">Student Details - ${s.name||''}</div>
      <div>${editMode ? saveBtn : editBtn}</div>
    </div>
    <div id="coord-profile-save-msg"></div>
    <form id="coord-profile-form" onsubmit="return false" data-student-id="${s.id}">
      ${card('', [
        {l:'Student Name',v:s.name||''},{l:'PRN',v:s.prnNumber||''},{l:'Email',v:s.email||''},{l:'Division',v:s.division||''},
      ])}
      ${card('Programme Details', profileFields, true)}
      ${card('Present Address Details', addrFields, true)}
      ${card('Permanent Address Details', permAddrFields, true)}
      ${card('Parent Contact Details', parentFields, true)}
      ${card('Local Guardian', guardianFields, true)}
    </form>
    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Family Details</div>
      <div class="table-shell"><table class="allocation-table">
        <thead><tr><th>Sr.</th><th>Name</th><th>Relationship</th><th>Age</th><th>Qualification / Occupation</th></tr></thead>
        <tbody>${famRows.map((r,i)=>`<tr><td>${i+1}</td><td>${cv(r.nk)}</td><td><strong>${r.rel}</strong></td><td>${cv(r.ak)}</td><td>${cv(r.qk)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Educational Details</div>
      <div class="table-shell"><table class="allocation-table">
        <thead><tr><th>Examination</th><th>Board / College</th><th>Year</th><th>Grade / %</th></tr></thead>
        <tbody>${semRows.map(r=>`<tr><td><strong>${r.label}</strong></td><td>${cv(r.bk)}</td><td>${cv(r.yk)}</td><td>${cv(r.gk)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function renderCoordAcademic(s, editMode = false) {
  const pd = s.profileData || {};
  const g = (...keys) => chG(pd, ...keys);
  const cv = k => g(k) ? `<span style="color:var(--uni-blue-dark);font-weight:600">${g(k)}</span>` : `<span class="fas-field-empty">—</span>`;
  const sems = [
    {l:'1st',c:'CGPA_Sem1',gr:'Grade_Sem1',r:'Remarks_Sem1'},
    {l:'2nd',c:'CGPA_Sem2',gr:'Grade_Sem2',r:'Remarks_Sem2'},
    {l:'3rd',c:'CGPA_Sem3',gr:'Grade_Sem3',r:'Remarks_Sem3'},
    {l:'4th',c:'CGPA_Sem4',gr:'Grade_Sem4',r:'Remarks_Sem4'},
    {l:'5th',c:'CGPA_Sem5',gr:'Grade_Sem5',r:'Remarks_Sem5'},
    {l:'6th',c:'CGPA_Sem6',gr:'Grade_Sem6',r:'Remarks_Sem6'},
    {l:'7th',c:'CGPA_Sem7',gr:'Grade_Sem7',r:'Remarks_Sem7'},
    {l:'8th',c:'CGPA_Sem8',gr:'Grade_Sem8',r:'Remarks_Sem8'},
    {l:'Consolidated',c:'CGPA_Cons',gr:'Grade_Cons',r:'Remarks_Cons'},
  ];

  const officialClasses = [
    { label: 'Admitted in Class: FE',    k: 'OfficialUse_FE_Year' },
    { label: 'Admitted in Class: SE/DSE',k: 'OfficialUse_SE_Year' },
    { label: 'Admitted in Class: TE',    k: 'OfficialUse_TE_Year' },
    { label: 'Admitted in Class: BE',    k: 'OfficialUse_BE_Year' },
  ];

  document.getElementById('ch-section-academic').innerHTML = `
    <div class="section-page-title">Academic Progress</div>
    <div class="handbook-card">
      <div class="table-shell"><table class="allocation-table">
        <thead><tr><th>Semester</th><th>CGPA</th><th>Grade</th><th>Remarks</th></tr></thead>
        <tbody>${sems.map(s => `<tr><td><strong>${s.l}</strong></td><td>${cv(s.c)}</td><td>${cv(s.gr)}</td><td>${cv(s.r)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="handbook-card" style="margin-top:1rem">
      <div class="field-grid">
        ${chField('Date', g('Academic_Date'))}
        ${chField('Academic Year', (typeof coordinatorProfile !== 'undefined' && coordinatorProfile.AcademicYear) || g('AcademicYear', 'academic_year'))}
        ${chField('Mentor Name & Signature', (typeof coordinatorProfile !== 'undefined' && (coordinatorProfile.MentorName || coordinatorProfile.mentor_name)) || '')}
      </div>
    </div>
    <div style="margin:1.25rem 0 0.5rem">
      <div style="font-weight:700;color:var(--blue-600);font-size:0.95rem">For Official Use <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted)">(Filled by Mentor — read only)</span></div>
    </div>
    <div class="handbook-card" style="border:2px solid rgba(37,99,235,0.18);background:rgba(239,246,255,0.6)">
      <div class="field-grid">
        ${officialClasses.map(c => {
          const val = (typeof coordinatorProfile !== 'undefined' && coordinatorProfile[c.k]) || '';
          return `<div class="fas-field">
            <span class="fas-field-label">${c.label}</span>
            <span class="fas-field-value ${val ? '' : 'fas-field-empty'}">Academic Year: ${val || '................................'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

window.toggleCoordAcademicEdit = async function(studentId) {
  const res = await fetch(`${API_BASE}/api/coordinator/students/${studentId}/profile`, {
    headers: { 'x-auth-token': localStorage.getItem('token') },
  });
  const student = await res.json();
  renderCoordAcademic(student, true);
};

window.saveCoordAcademic = async function(studentId) {
  const form = document.getElementById('coord-academic-form');
  if (!form) return;
  const profileData = {};
  form.querySelectorAll('input[name]').forEach(inp => { if (inp.name) profileData[inp.name] = inp.value.trim(); });
  const msgEl = document.getElementById('coord-academic-save-msg');
  msgEl.innerHTML = '<span class="text-muted" style="font-size:0.88rem">Saving…</span>';
  try {
    const res = await fetch(`${API_BASE}/api/coordinator/students/${studentId}/meeting`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
      body: JSON.stringify({ profileData }),
    });
    const data = await res.json();
    if (!res.ok) { msgEl.innerHTML = `<span style="color:#b91c1c;font-size:0.88rem">${data.error || 'Failed.'}</span>`; return; }
    coordHandbookStudent.profileData = { ...coordHandbookStudent.profileData, ...data.profileData };
    renderCoordAcademic(coordHandbookStudent, false);
    msgEl.innerHTML = '<span style="color:var(--emerald-600);font-size:0.88rem">Saved!</span>';
    setTimeout(() => { if (msgEl) msgEl.innerHTML = ''; }, 2000);
  } catch (err) {
    msgEl.innerHTML = `<span style="color:#b91c1c;font-size:0.88rem">${err.message || 'Failed.'}</span>`;
  }
};

function renderCoordMentorInfo(s) {
  const pd = s.profileData || {};
  const g = (...keys) => chG(pd, ...keys);
  
  const cg = (...keys) => {
    if (typeof coordinatorProfile !== 'undefined') {
      for (const k of keys) {
        if (coordinatorProfile[k] && String(coordinatorProfile[k]).trim() !== '') {
          return String(coordinatorProfile[k]).trim();
        }
      }
    }
    return g(...keys);
  };

  const acadYear = cg('AcademicYear','academic_year');
  document.getElementById('ch-section-mentor-info').innerHTML = `
    <div class="section-page-title">Mentor Information</div>
    ${acadYear ? `<div class="handbook-badge" style="margin-bottom:1rem">Academic Year: ${acadYear}</div>` : ''}
    <div class="handbook-card">
      <div class="field-grid">
        ${chField('Mentor Name', cg('MentorName','mentor_name','Mentor'))}
        ${chField('School', cg('MentorSchool','mentor_school','SchoolName'))}
        ${chField('Department', cg('MentorDepartment','mentor_department'))}
        ${chField('Contact Details', cg('MentorContact','mentor_contact'))}
        ${chField('Email ID', cg('MentorEmail','mentor_email'))}
        ${chField('No. of Mentees Allocated', cg('MenteeCount','mentee_count'))}
        ${chField('Class of Mentee', cg('MenteeClass','mentee_class'))}
      </div>
    </div>`;
}

function renderCoordMeeting(s) {
  const pd = s.profileData || {};
  const g = k => (pd[k] && String(pd[k]).trim()) ? String(pd[k]).trim() : '';
  const rows = Array.from({length:6},(_,i)=>({
    no:`Meeting_No_${i+1}`, date:`Meeting_Date_${i+1}`, disc:`Meeting_Discussion_${i+1}`,
    ssign:`Meeting_StudentSign_${i+1}`, action:`Meeting_Action_${i+1}`, msign:`Meeting_MentorSign_${i+1}`,
  }));
  const cv = (k, color) => g(k)
    ? `<span style="color:${color||'var(--uni-blue-dark)'};font-weight:500">${g(k)}</span>`
    : `<span class="fas-field-empty">—</span>`;
  const pending = k => g(k)
    ? `<span style="color:var(--emerald-600);font-weight:600">${g(k)}</span>`
    : `<span style="color:#f59e0b;font-size:0.82rem;font-weight:600">Pending</span>`;

  document.getElementById('ch-section-meeting').innerHTML = `
    <div class="section-page-title">Meeting Report</div>
    <div class="handbook-card">
      <div class="table-shell"><table class="allocation-table">
        <thead><tr><th>Meeting No.</th><th>Meeting Date</th><th>Discussions / Suggestions / Problems</th><th>Student Sign</th><th>Action Taken by Mentor</th><th>Sign of Mentor</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${cv(r.no)}</td><td>${cv(r.date)}</td><td>${cv(r.disc)}</td><td>${cv(r.ssign)}</td>
          <td>${pending(r.action)}</td><td>${pending(r.msign)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="handbook-card" style="margin-top:1rem">
      <div class="handbook-card-title">Signatures</div>
      <div class="field-grid">
        ${chField('Name & Sign of Head of Department', g('Meeting_HOD_Sign'))}
        ${chField('Name & Sign of Dean', g('Meeting_Dean_Sign'))}
      </div>
    </div>`;
}

function renderCoordVision() {
  document.getElementById('ch-section-vision').innerHTML = `
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

function renderAllCoordHandbook(student, editMode = false) {
  coordHandbookStudent = student;
  renderCoordHandbook(student);
  renderCoordIndex();
  renderCoordProfile(student, editMode);
  renderCoordAcademic(student, false);
  renderCoordMentorInfo(student);
  renderCoordMeeting(student);
  renderCoordVision();
  showHandbookSection('handbook');
}

window.toggleCoordProfileEdit = async function(studentId) {
  const res = await fetch(`${API_BASE}/api/coordinator/students/${studentId}/profile`, {
    headers: { 'x-auth-token': localStorage.getItem('token') },
  });
  const student = await res.json();
  renderAllCoordHandbook(student, true);
};

window.saveCoordProfile = async function(studentId) {
  const form = document.getElementById('coord-profile-form');
  if (!form) return;
  const profileData = {};
  form.querySelectorAll('input[name]').forEach(inp => {
    if (inp.name) profileData[inp.name] = inp.value.trim();
  });
  const msgEl = document.getElementById('coord-profile-save-msg');
  msgEl.innerHTML = '<span class="text-muted" style="font-size:0.88rem">Saving…</span>';
  try {
    const res = await fetch(`${API_BASE}/api/coordinator/students/${studentId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
      body: JSON.stringify({ profileData }),
    });
    const data = await res.json();
    if (!res.ok) { msgEl.innerHTML = `<span style="color:#b91c1c;font-size:0.88rem">${data.error || 'Failed.'}</span>`; return; }
    coordHandbookStudent.profileData = { ...coordHandbookStudent.profileData, ...data.profileData };
    renderAllCoordHandbook(coordHandbookStudent, false);
    msgEl.innerHTML = '<span style="color:var(--emerald-600);font-size:0.88rem">Saved!</span>';
    setTimeout(() => { if (msgEl) msgEl.innerHTML = ''; }, 2000);
  } catch (err) {
    msgEl.innerHTML = `<span style="color:#b91c1c;font-size:0.88rem">${err.message || 'Failed.'}</span>`;
  }
};

window.loadCoordHandbook = async function(studentId) {
  const area = document.getElementById('handbook-content-area');
  const nav  = document.getElementById('handbook-section-nav');
  if (!studentId) { area.innerHTML = ''; nav.style.display = 'none'; return; }

  area.innerHTML = '<p class="text-muted" style="padding:1rem">Loading...</p>';
  nav.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/coordinator/students/${studentId}/profile`, {
      headers: { 'x-auth-token': localStorage.getItem('token') },
    });
    if (res.status === 401) { window.location.href = '/'; return; }
    const student = await res.json();
    nav.style.display = 'flex';
    renderAllCoordHandbook(student);
  } catch (err) {
    area.innerHTML = `<div class="form-error">${err.message || 'Failed to load.'}</div>`;
  }
};
