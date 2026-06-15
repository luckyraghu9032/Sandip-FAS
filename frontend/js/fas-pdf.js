// Shared FAS handbook PDF generation — Sandip University official layout

function profileGetter(profileData) {
  const pd = profileData || {};
  return (...keys) => {
    for (const k of keys) {
      if (pd[k] && String(pd[k]).trim()) return String(pd[k]).trim();
      const found = Object.keys(pd).find((f) => f.toLowerCase() === k.toLowerCase());
      if (found && pd[found] && String(pd[found]).trim()) return String(pd[found]).trim();
    }
    return '';
  };
}

function sandipLogoSvg(compact) {
  const h = compact ? 42 : 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 ${h}" class="su-logo-svg" aria-hidden="true">
    <circle cx="26" cy="${h / 2}" r="22" fill="none" stroke="#111" stroke-width="1.2"/>
    <circle cx="26" cy="${h / 2}" r="16" fill="#f5e6c8" stroke="#111" stroke-width="0.8"/>
    <text x="26" y="${h / 2 + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#8b4513" font-family="Times New Roman,serif">SU</text>
    <text x="56" y="${h / 2 - 2}" font-size="15" font-weight="700" fill="#b91c1c" font-family="Times New Roman,serif">SANDIP</text>
    <text x="56" y="${h / 2 + 12}" font-size="10" font-weight="700" fill="#111" font-family="Times New Roman,serif">UNIVERSITY</text>
    ${compact ? '' : `<text x="56" y="${h / 2 + 24}" font-size="7.5" fill="#111" font-family="Times New Roman,serif">— UGC Recognised —</text>`}
  </svg>`;
}

async function imageToDataUrl(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Image not found: ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildFasHandbookHtml(student, opts = {}) {
  const s = student || {};
  const campusSrc = opts.campusSrc || 'public/images/sandip-cover-source.png';
  const g = profileGetter(s.profileData);
  const dots = '........................................................';
  const blank = (v) => (v ? String(v) : '');
  const dotted = (label, value) =>
    `<div class="dotted-row"><span class="dotted-label">${label}:</span><span class="dotted-value">${blank(value) || dots}</span></div>`;

  const meetRows = Array.from({ length: 9 }, (_, i) => i + 1).map((i) => `
    <tr>
      <td>${blank(g(`Meeting_No_${i}`))}</td>
      <td>${blank(g(`Meeting_Date_${i}`))}</td>
      <td>${blank(g(`Meeting_Discussion_${i}`))}</td>
      <td>${blank(g(`Meeting_StudentSign_${i}`))}</td>
      <td>${blank(g(`Meeting_Action_${i}`))}</td>
      <td>${blank(g(`Meeting_MentorSign_${i}`))}</td>
    </tr>`).join('');

  const sems = [
    { l: '1st', c: 'CGPA_Sem1', gr: 'Grade_Sem1', r: 'Remarks_Sem1' },
    { l: '2nd', c: 'CGPA_Sem2', gr: 'Grade_Sem2', r: 'Remarks_Sem2' },
    { l: '3rd', c: 'CGPA_Sem3', gr: 'Grade_Sem3', r: 'Remarks_Sem3' },
    { l: '4th', c: 'CGPA_Sem4', gr: 'Grade_Sem4', r: 'Remarks_Sem4' },
    { l: '5th', c: 'CGPA_Sem5', gr: 'Grade_Sem5', r: 'Remarks_Sem5' },
    { l: '6th', c: 'CGPA_Sem6', gr: 'Grade_Sem6', r: 'Remarks_Sem6' },
    { l: '7th', c: 'CGPA_Sem7', gr: 'Grade_Sem7', r: 'Remarks_Sem7' },
    { l: '8th', c: 'CGPA_Sem8', gr: 'Grade_Sem8', r: 'Remarks_Sem8' },
    { l: 'Consolidated', c: 'CGPA_Cons', gr: 'Grade_Cons', r: 'Remarks_Cons' },
  ];
  const semRows = sems.map((sem) => `
    <tr>
      <td class="lbl"><strong>${sem.l}</strong></td>
      <td>${blank(g(sem.c))}</td>
      <td>${blank(g(sem.gr))}</td>
      <td>${blank(g(sem.r))}</td>
    </tr>`).join('');

  const familyRows = [
    { rel: 'Father', nk: 'Family_Father_Name', ak: 'Family_Father_Age', qk: 'Family_Father_Qual' },
    { rel: 'Mother', nk: 'Family_Mother_Name', ak: 'Family_Mother_Age', qk: 'Family_Mother_Qual' },
    { rel: 'Brother/Sister', nk: 'Family_Sib1_Name', ak: 'Family_Sib1_Age', qk: 'Family_Sib1_Qual' },
    { rel: 'Brother/Sister', nk: 'Family_Sib2_Name', ak: 'Family_Sib2_Age', qk: 'Family_Sib2_Qual' },
    { rel: 'Brother/Sister', nk: 'Family_Sib3_Name', ak: 'Family_Sib3_Age', qk: 'Family_Sib3_Qual' },
  ].map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${blank(g(r.nk))}</td>
      <td><strong>${r.rel}</strong></td>
      <td>${blank(g(r.ak))}</td>
      <td>${blank(g(r.qk))}</td>
    </tr>`).join('');

  const eduRows = [
    { label: '10th SSC', bk: 'SSC_Board', yk: 'SSC_Year', gk: 'SSC_Grade' },
    { label: '12th (10+2) HSSC', bk: 'HSSC_Board', yk: 'HSSC_Year', gk: 'HSSC_Grade' },
    { label: 'Diploma (for Lateral Entry)', bk: 'Diploma_Board', yk: 'Diploma_Year', gk: 'Diploma_Grade' },
  ].map((r) => `
    <tr>
      <td><strong>${r.label}</strong></td>
      <td>${blank(g(r.bk))}</td>
      <td>${blank(g(r.yk))}</td>
      <td>${blank(g(r.gk))}</td>
    </tr>`).join('');

  const actRows = Array.from({ length: 8 }, (_, i) => i + 1).map((i) => `
    <tr>
      <td>${blank(g(`Activity_Sem_${i}`))}</td>
      <td>${blank(g(`Activity_Name_${i}`))}</td>
      <td>${blank(g(`Activity_Achievement_${i}`))}</td>
    </tr>`).join('');

  const mentorBlock = (academicYear) => `
    <div class="mentor-block">
      <div class="mentor-block-title">Mentor Information Academic Year ${academicYear || dots}</div>
      <table class="form-table">
        <tr><td class="lbl"><strong>Mentor Name</strong></td><td>${blank(g('MentorName', 'mentor_name'))}</td></tr>
        <tr><td class="lbl"><strong>School</strong></td><td>${blank(g('MentorSchool', 'mentor_school', 'SchoolName'))}</td></tr>
        <tr><td class="lbl"><strong>Department</strong></td><td>${blank(g('MentorDepartment', 'mentor_department'))}</td></tr>
        <tr><td class="lbl"><strong>Contact Details</strong></td><td>${blank(g('MentorContact', 'mentor_contact'))}</td></tr>
        <tr><td class="lbl"><strong>Email ID</strong></td><td>${blank(g('MentorEmail', 'mentor_email'))}</td></tr>
        <tr><td class="lbl"><strong>No of Mentee Allocated</strong></td><td>${blank(g('MenteeCount', 'mentee_count'))}</td></tr>
        <tr><td class="lbl"><strong>Class of a Mentee</strong></td><td>${blank(g('MenteeClass', 'mentee_class'))}</td></tr>
      </table>
    </div>`;

  const acadYear = blank(g('AcademicYear', 'academic_year'));
  const hobbies = blank(g('Hobbies', 'hobbies', 'HobbiesAndInterest'));

  const simpleHeader = `
    <div class="simple-header">
      <div class="simple-header-logo">${sandipLogoSvg(true)}</div>
      <div class="simple-header-title">Sandip University Nashik</div>
    </div>`;

  const fasHeader = `
    <div class="fas-header">
      <div class="fas-header-logo">${sandipLogoSvg(false)}</div>
      <div class="fas-header-info">
        <div><strong>Sandip University, Nashik (MS), India</strong></div>
        <div>At Post Mahiravani, Trimbak Road, Nashik-422213, Maharashtra</div>
        <div>https://www.sandipuniversity.edu.in</div>
      </div>
    </div>`;

  const CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',Times,serif;font-size:11pt;color:#111;background:#fff}
    .page{width:210mm;min-height:297mm;padding:12mm;page-break-after:always;position:relative}
    .page:last-child{page-break-after:auto}
    .border-box{border:1pt solid #111;min-height:273mm;padding:10mm 12mm;display:flex;flex-direction:column}
    .simple-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14pt}
    .simple-header-logo{width:38%}
    .simple-header-title{font-size:18pt;font-weight:700;text-align:right;flex:1;padding-top:4pt}
    .su-logo-svg{display:block;height:auto;width:100%;max-width:180px}
    .fas-header{display:flex;align-items:flex-start;gap:10pt;margin-bottom:10pt;border-bottom:0.5pt solid #ccc;padding-bottom:8pt}
    .fas-header-logo{width:34%}
    .fas-header-info{flex:1;text-align:center;font-size:10pt;line-height:1.45;padding-top:2pt}
    .center-title{text-align:center;font-size:16pt;font-weight:700;margin:8pt 0 4pt}
    .center-subtitle{text-align:center;font-size:13pt;font-weight:700;margin-bottom:12pt}
    .cover-titles{text-align:center;margin:10pt 0}
    .cover-main{font-size:17pt;font-weight:700;margin-bottom:6pt}
    .cover-sub{font-size:13pt;font-weight:700}
    .campus-wrap{text-align:center;margin:14pt 0 18pt}
    .campus-photo{width:78%;max-height:52mm;object-fit:cover;object-position:50% 42%;border:0.5pt solid #ccc}
    .dotted-row{display:flex;align-items:baseline;margin-bottom:10pt;font-size:12pt;line-height:1.5}
    .dotted-label{white-space:nowrap;margin-right:4pt}
    .dotted-value{flex:1;overflow:hidden}
    .index-heading{text-align:center;font-size:16pt;font-weight:700;margin:12pt 0 10pt}
    .form-table,.grid-table{width:100%;border-collapse:collapse;margin-bottom:8pt;font-size:10.5pt}
    .form-table td,.grid-table th,.grid-table td{border:1pt solid #111;padding:5pt 7pt;vertical-align:middle}
    .grid-table th{font-weight:700;text-align:center}
    .form-table td.lbl{width:42%;font-weight:700}
    .form-table td:last-child{min-height:22pt}
    .section-title{font-size:12pt;font-weight:700;margin:10pt 0 6pt}
    .section-title.u{text-decoration:underline}
    .fas-main-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:8pt 0 4pt}
    .fas-sub-title{text-align:center;font-size:12pt;font-weight:700;text-decoration:underline;margin-bottom:10pt}
    .address-box{border:1pt solid #111;margin-bottom:8pt}
    .address-box-title{font-weight:700;padding:4pt 7pt;border-bottom:1pt solid #111}
    .address-cols{display:flex}
    .address-col{flex:1;border-right:1pt solid #111;padding:6pt 7pt;min-height:52pt}
    .address-col:last-child{border-right:none}
    .address-col-label{font-weight:700;margin-bottom:28pt}
    .address-pin{font-weight:700;margin-top:8pt}
    .parents-box{border:1pt solid #111;margin-bottom:8pt;display:flex}
    .parents-col{flex:1;padding:6pt 7pt;border-right:1pt solid #111;min-height:36pt}
    .parents-col:last-child{border-right:none}
    .parents-line{margin-bottom:8pt}
    .guardian-lines{margin:6pt 0 8pt;line-height:2.2}
    .guardian-line{border-bottom:1pt dotted #555;min-height:16pt;margin-bottom:4pt}
    .hobby-lines{margin:6pt 0 10pt;line-height:2.4}
    .hobby-line{border-bottom:1pt dotted #555;min-height:18pt;margin-bottom:6pt}
    .sig-row{display:flex;justify-content:space-between;margin-top:16pt;font-weight:700}
    .official-section{margin-top:12pt}
    .official-title{font-weight:700;text-decoration:underline;margin-bottom:8pt}
    .official-row{display:flex;justify-content:space-between;margin-bottom:8pt;font-weight:700}
    .official-year{white-space:nowrap}
    .page-footer{position:absolute;bottom:12mm;right:12mm;font-weight:700;font-size:11pt}
    .mentor-block{margin-bottom:22pt}
    .mentor-block-title{text-align:center;font-weight:700;font-size:12pt;margin-bottom:8pt}
    .meeting-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:10pt 0 8pt}
    .meeting-footer{display:flex;justify-content:space-between;margin-top:28pt;font-weight:700;font-size:11pt}
    .vm-table{width:100%;border-collapse:collapse;margin-bottom:0;font-size:10.5pt}
    .vm-table td,.vm-table th{border:1pt solid #111;padding:6pt 8pt;vertical-align:top}
    .vm-header{background:#c5d9a1;font-weight:700;text-align:center;text-transform:uppercase}
    .vm-code{width:12%;text-align:center;font-weight:700}
    .vm-text{width:88%}
    .vm-body{line-height:1.55}
    .vm-wrap{border:1pt solid #111;margin-bottom:0}
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>

  <!-- Cover Page -->
  <div class="page">
    <div class="border-box">
      ${simpleHeader}
      <div class="cover-titles">
        <div class="cover-main">Mentor-Mentee Handbook</div>
        <div class="cover-sub">Faculty Advisor System- (FAS)</div>
      </div>
      <div class="campus-wrap">
        <img src="${campusSrc}" class="campus-photo" alt="Sandip University Campus">
      </div>
      <div class="cover-fields">
        ${dotted('Student Name', s.name)}
        ${dotted('School Name', g('SchoolName', 'School'))}
        ${dotted('Department', s.department || g('DepartmentName', 'department'))}
        ${dotted('Programme', g('Programme', 'program'))}
        ${dotted('PRN', s.prnNumber)}
        ${dotted('Year of Admission', g('Yearofadmission', 'YearOfAdmission'))}
      </div>
    </div>
  </div>

  <!-- Mentor Information -->
  <div class="page">
    <div class="border-box">
      ${simpleHeader}
      ${mentorBlock(acadYear)}
      ${mentorBlock(acadYear)}
    </div>
  </div>

  <!-- Index -->
  <div class="page">
    <div class="border-box">
      ${simpleHeader}
      <div class="cover-titles">
        <div class="cover-main">Mentor-Mentee Handbook</div>
        <div class="cover-sub">Faculty Advisor System- (FAS)</div>
      </div>
      <div class="index-heading">Index</div>
      <table class="grid-table">
        <thead><tr><th style="width:18%">Sr No</th><th>Particulars</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Mentor Information</td></tr>
          <tr><td>2</td><td>Mentor-Mentee Policy</td></tr>
          <tr><td>3</td><td>Student details</td></tr>
          <tr><td>4</td><td>Meeting Report</td></tr>
          <tr><td>5</td><td>Vision-Mission</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Student Details — Page 1 of 3 -->
  <div class="page">
    ${fasHeader}
    <div class="fas-main-title">FACULTY ADVISOR SYSTEM (FAS)</div>
    <div class="fas-sub-title">Student Details</div>
    <table class="form-table">
      <tr><td class="lbl"><strong>School Name</strong></td><td>${blank(g('SchoolName', 'School'))}</td></tr>
      <tr><td class="lbl"><strong>Department Name</strong></td><td>${blank(s.department || g('DepartmentName', 'department'))}</td></tr>
      <tr><td class="lbl"><strong>Hosteler/ Day-scholar:</strong></td><td>${blank(g('HostelerDayScholar', 'hosteler'))}</td></tr>
      <tr><td class="lbl"><strong>Programme:</strong></td><td>${blank(g('Programme', 'program'))}</td></tr>
      <tr><td class="lbl"><strong>Year of admission (First Year):</strong></td><td>${blank(g('Yearofadmission', 'YearOfAdmission'))}</td></tr>
      <tr><td class="lbl"><strong>Student Name:</strong></td><td>${blank(s.name)}</td></tr>
      <tr><td class="lbl"><strong>PRN :</strong></td><td>${blank(s.prnNumber)}</td></tr>
      <tr><td class="lbl"><strong>Date of Birth:</strong></td><td>${blank(g('dob', 'DOB'))}</td></tr>
      <tr><td class="lbl"><strong>Mobile Number</strong></td><td>${blank(g('mobile_number', 'mobile', 'phone'))}</td></tr>
    </table>
    <div class="section-title"><strong>Postel Address:</strong></div>
    <div class="address-box">
      <div class="address-cols">
        <div class="address-col">
          <div class="address-col-label">Permanent Address:</div>
          <div>${blank(g('PermanentAddress', 'permanent_address'))}</div>
          <div class="address-pin">Pincode: ${blank(g('PermanentPincode', 'permanent_pincode')) || dots}</div>
        </div>
        <div class="address-col">
          <div class="address-col-label">Present Address:</div>
          <div>${blank(g('PresentAddress', 'present_address'))}</div>
          <div class="address-pin">Pincode: ${blank(g('PresentPincode', 'present_pincode')) || dots}</div>
        </div>
      </div>
    </div>
    <div class="section-title"><strong>Parents Contact details:</strong></div>
    <div class="parents-box">
      <div class="parents-col">
        <div class="parents-line"><strong>Mother Mobile Number: 1:</strong> ${blank(g('MotherMobile1', 'mother_mobile1', 'mother_mobile')) || dots}</div>
        <div class="parents-line"><strong>Father Mobile Number: 1:</strong> ${blank(g('FatherMobile1', 'father_mobile1', 'father_mobile')) || dots}</div>
      </div>
      <div class="parents-col">
        <div class="parents-line"><strong>Mother Mobile Number: 2:</strong> ${blank(g('MotherMobile2', 'mother_mobile2')) || dots}</div>
        <div class="parents-line"><strong>Father Mobile Number: 2:</strong> ${blank(g('FatherMobile2', 'father_mobile2')) || dots}</div>
      </div>
    </div>
    <div class="section-title"><strong>Local Guardian Name and Address:</strong></div>
    <div class="guardian-lines">
      <div class="guardian-line">${blank(g('LocalGuardianName', 'local_guardian_name'))} ${blank(g('LocalGuardianAddress', 'local_guardian_address'))}</div>
      <div class="guardian-line"></div>
      <div class="guardian-line"></div>
    </div>
    <div class="section-title"><strong>Local Guardian Mobile Number:</strong> ${blank(g('LocalGuardianMobile', 'local_guardian_mobile')) || dots}</div>
    <div class="page-footer">Page 1 of 3</div>
  </div>

  <!-- Student Details — Page 2 of 3 -->
  <div class="page">
    ${fasHeader}
    <div class="section-title u"><strong>Educational Details:</strong></div>
    <table class="grid-table">
      <thead><tr><th>Examination</th><th>Board /College</th><th>Year</th><th>Grade/Percentage</th></tr></thead>
      <tbody>${eduRows}<tr><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr></tbody>
    </table>
    <div class="section-title"><strong>Family Details:</strong></div>
    <table class="grid-table">
      <thead><tr><th>Sr No</th><th>Name</th><th>Relationship</th><th>Age(years)</th><th>Qualification/Occupation</th></tr></thead>
      <tbody>${familyRows}</tbody>
    </table>
    <div class="section-title"><strong>Hobbies and Interest:</strong></div>
    <div class="hobby-lines">
      <div class="hobby-line">${hobbies}</div>
      <div class="hobby-line"></div>
    </div>
    <div class="section-title"><strong>Participation in Co-curricular and extracurricular activities:</strong></div>
    <table class="grid-table">
      <thead><tr><th>Semester(s)</th><th>Activity(s)</th><th>Achievement(s)</th></tr></thead>
      <tbody>${actRows}</tbody>
    </table>
    <div class="page-footer">Page 2 of 3</div>
  </div>

  <!-- Student Details — Page 3 of 3 -->
  <div class="page">
    ${fasHeader}
    <div class="section-title"><strong>Academic Progress :</strong></div>
    <table class="grid-table">
      <thead><tr><th>Semester</th><th>CGPA</th><th>Grade</th><th>Remarks</th></tr></thead>
      <tbody>${semRows}</tbody>
    </table>
    <div class="sig-row">
      <div><strong>Date:</strong> ${blank(g('Academic_Date')) || dots}</div>
      <div><strong>Mentee Name and Signature:</strong> ${blank(g('Academic_Signature')) || dots}</div>
    </div>
    <div class="official-section">
      <div class="official-title">For Official Use (To be Filled by Mentor):</div>
      <div class="official-row"><span><strong>Admitted in Class: FE</strong></span><span class="official-year"><strong>Academic Year:</strong> ${blank(g('OfficialUse_FE_Year')) || dots}</span></div>
      <div class="official-row"><span><strong>Admitted in Class: SE/DSE</strong></span><span class="official-year"><strong>Academic Year:</strong> ${blank(g('OfficialUse_SE_Year')) || dots}</span></div>
      <div class="official-row"><span><strong>Admitted in Class: TE</strong></span><span class="official-year"><strong>Academic Year:</strong> ${blank(g('OfficialUse_TE_Year')) || dots}</span></div>
      <div class="official-row"><span><strong>Admitted in Class: BE</strong></span><span class="official-year"><strong>Academic Year:</strong> ${blank(g('OfficialUse_BE_Year')) || dots}</span></div>
    </div>
    <div class="page-footer">Page 3 of 3</div>
  </div>

  <!-- Meeting Report -->
  <div class="page">
    <div class="border-box">
      ${simpleHeader}
      <div class="meeting-title">Mentor-Mentee Meeting Report</div>
      <table class="grid-table" style="font-size:9.5pt">
        <thead>
          <tr>
            <th>Meeting No</th>
            <th>Meeting Date</th>
            <th>Discussions/Suggestions/Problems</th>
            <th>Student Sign</th>
            <th>Action Taken by Mentor</th>
            <th>Sign of Mentor</th>
          </tr>
        </thead>
        <tbody>${meetRows}</tbody>
      </table>
      <div class="meeting-footer">
        <div><strong>Name and Sign of the Head of the Department</strong> ${blank(g('Meeting_HOD_Sign')) ? ` — ${blank(g('Meeting_HOD_Sign'))}` : ''}</div>
        <div><strong>Dean</strong> ${blank(g('Meeting_Dean_Sign')) ? ` — ${blank(g('Meeting_Dean_Sign'))}` : ''}</div>
      </div>
    </div>
  </div>

  <!-- Vision-Mission -->
  <div class="page">
    <div class="vm-wrap">
      <table class="vm-table">
        <tr><td class="vm-header" colspan="2">UNIVERSITY VISION</td></tr>
        <tr><td class="vm-body" colspan="2">To be one of the most preferred learning place to nurture future global leaders congenial to society.</td></tr>
        <tr><td class="vm-header" colspan="2">UNIVERSITY MISSION (UM)</td></tr>
        <tr><td class="vm-body" colspan="2">We, at Sandip University envisage the sustainable growth of stake holders:</td></tr>
        <tr><td class="vm-code"><strong>UM1</strong></td><td class="vm-text">To be a globally prominent university.</td></tr>
        <tr><td class="vm-code"><strong>UM2</strong></td><td class="vm-text">To provide learning through Cutting Edge Technologies Facilitated by the world class infrastructure to empower our students to converge into capable leaders &amp; responsible citizens bearing high ethical values.</td></tr>
        <tr><td class="vm-code"><strong>UM3</strong></td><td class="vm-text">To be a global leader in education &amp; human development to bloom as a center of excellence in teaching, research &amp; entrepreneurship.</td></tr>
        <tr><td class="vm-code"><strong>UM4</strong></td><td class="vm-text">Be the most preferred choice of students, parents, gardeners, faculty and industry.</td></tr>
        <tr><td class="vm-code"><strong>UM5</strong></td><td class="vm-text">Be in the Best top 10 preferred university in every discipline of education health sciences, engineering and management.</td></tr>
        <tr><td colspan="2">&nbsp;</td></tr>
        <tr><td class="vm-header" colspan="2">VISION OF School of Computer Sciences and Engineering</td></tr>
        <tr><td class="vm-body" colspan="2">To be the prominent institution for teaching-learning and research for the computer application and engineering.</td></tr>
        <tr><td class="vm-header" colspan="2">MISSION of School of Computer Sciences and Engineering</td></tr>
        <tr><td class="vm-code"><strong>M1</strong></td><td class="vm-text">To impart in-depth technical knowledge.</td></tr>
        <tr><td class="vm-code"><strong>M2</strong></td><td class="vm-text">To provide environment for research, innovation, and entrepreneurship.</td></tr>
        <tr><td class="vm-code"><strong>M3</strong></td><td class="vm-text">To imbibe strong social and cultural values.</td></tr>
        <tr><td colspan="2">&nbsp;</td></tr>
      </table>
    </div>
  </div>

</body></html>`;
}

window.generateFasPDFFromStudent = async function generateFasPDFFromStudent(student, options = {}) {
  if (typeof html2pdf === 'undefined') {
    throw new Error('PDF library is not loaded.');
  }

  const s = student || {};
  const btn = options.buttonEl || null;
  const msg = options.msgEl || null;
  const btnDefaultHtml = options.btnDefaultHtml || '<span>📥 Download FAS PDF</span>';
  const btnLoadingHtml = options.btnLoadingHtml || '<span>⏳ Generating PDF…</span>';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = btnLoadingHtml;
  }
  if (msg) msg.innerHTML = '';

  try {
    let campusSrc = 'public/images/sandip-cover-source.png';
    try {
      campusSrc = await imageToDataUrl(campusSrc);
    } catch (_) { /* use relative path fallback */ }
    const html = buildFasHandbookHtml(s, { campusSrc });
    const name = (s.name || 'student').replace(/\s+/g, '_');
    const prn = s.prnNumber || 'FAS';

    await html2pdf().set({
      margin: 0,
      filename: `FAS_${name}_${prn}.pdf`,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(html).save();

    if (msg) {
      msg.innerHTML = '<div class="form-success" style="margin-bottom:0">✅ PDF downloaded successfully!</div>';
      setTimeout(() => { if (msg) msg.innerHTML = ''; }, 3000);
    }
  } catch (err) {
    if (msg) {
      msg.innerHTML = '<div class="form-error" style="margin-bottom:0">Failed to generate PDF. Please try again.</div>';
    }
    throw err;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btnDefaultHtml;
    }
  }
};
