// Shared FAS handbook PDF generation - Sandip University printable layout

function escapePdfHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function profileGetter(profileData) {
  const record = profileData || {};

  return (...keys) => {
    for (const key of keys) {
      if (record[key] && String(record[key]).trim()) {
        return String(record[key]).trim();
      }

      const found = Object.keys(record).find((field) => field.toLowerCase() === String(key).toLowerCase());
      if (found && record[found] && String(record[found]).trim()) {
        return String(record[found]).trim();
      }
    }

    return '';
  };
}

function sandipLogoSvg(compact) {
  const height = compact ? 42 : 52;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 ${height}" class="su-logo-svg" aria-hidden="true">
    <circle cx="26" cy="${height / 2}" r="22" fill="none" stroke="#111" stroke-width="1.2"/>
    <circle cx="26" cy="${height / 2}" r="16" fill="#f5e6c8" stroke="#111" stroke-width="0.8"/>
    <text x="26" y="${height / 2 + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#8b4513" font-family="Times New Roman,serif">SU</text>
    <text x="56" y="${height / 2 - 2}" font-size="15" font-weight="700" fill="#b91c1c" font-family="Times New Roman,serif">SANDIP</text>
    <text x="56" y="${height / 2 + 12}" font-size="10" font-weight="700" fill="#111" font-family="Times New Roman,serif">UNIVERSITY</text>
    ${compact ? '' : `<text x="56" y="${height / 2 + 24}" font-size="7.5" fill="#111" font-family="Times New Roman,serif">UGC Recognised</text>`}
  </svg>`;
}

async function imageToDataUrl(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Image not found: ${path}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildFasHandbookHtml(student, opts = {}) {
  const studentRecord = student || {};
  const profile = profileGetter(studentRecord.profileData);
  const coordinator = profileGetter(opts.coordinatorProfile || {});
  const campusSrc = opts.campusSrc || 'public/images/sandip-cover-source.png';
  const dots = '........................................................';

  const raw = (value) => String(value || '').trim();
  const safe = (value) => escapePdfHtml(raw(value));
  const valueOrDots = (value, fallback = dots) => safe(value) || fallback;
  const profileValue = (...keys) => profile(...keys);
  const coordinatorValue = (...keys) => coordinator(...keys);

  const studentName = raw(studentRecord.name);
  const prnNumber = raw(studentRecord.prnNumber || studentRecord.prn_number);
  const department = raw(studentRecord.department) || profileValue('DepartmentName', 'Department', 'department');
  const school = profileValue('SchoolName', 'School', 'school_name');
  const programme = profileValue('Programme', 'Program', 'program', 'Course');
  const academicYear = profileValue('AcademicYear', 'academic_year');

  const dotted = (label, value) => `
    <div class="dotted-row">
      <span class="dotted-label">${escapePdfHtml(label)}:</span>
      <span class="dotted-value">${valueOrDots(value)}</span>
    </div>`;

  const tableCell = (value) => safe(value) || '&nbsp;';

  const mentorRows = [
    ['Mentor Name', coordinatorValue('MentorName', 'mentor_name', 'Mentor')],
    ['School', coordinatorValue('MentorSchool', 'mentor_school', 'SchoolName')],
    ['Department', coordinatorValue('MentorDepartment', 'mentor_department', 'Department')],
    ['Contact Details', coordinatorValue('MentorContact', 'mentor_contact', 'MentorPhone')],
    ['Email ID', coordinatorValue('MentorEmail', 'mentor_email')],
    ['No of Mentee Allocated', coordinatorValue('MenteeCount', 'mentee_count', 'NoOfMentee')],
    ['Class of a Mentee', coordinatorValue('MenteeClass', 'mentee_class', 'ClassOfMentee')],
  ];

  const mentorBlock = () => `
    <div class="mentor-block">
      <div class="mentor-block-title">Mentor Information Academic Year ${valueOrDots(academicYear)}</div>
      <table class="form-table">
        <tbody>
          ${mentorRows.map(([label, value]) => `<tr><td class="label-cell">${escapePdfHtml(label)}</td><td>${valueOrDots(value)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  const educationRows = [
    ['10th SSC', profileValue('SSC_Board', 'SSCBoard'), profileValue('SSC_Year', 'SSCYear'), profileValue('SSC_Grade', 'SSCPercentage', 'SSCGrade')],
    ['12th (10+2) HSSC', profileValue('HSSC_Board', 'HSCBoard'), profileValue('HSSC_Year', 'HSCYear'), profileValue('HSSC_Grade', 'HSCPercentage', 'HSCGrade')],
    ['Diploma (for Lateral Entry)', profileValue('Diploma_Board', 'DiplomaCollege'), profileValue('Diploma_Year', 'DiplomaYear'), profileValue('Diploma_Grade', 'DiplomaPercentage')],
    ['', '', '', ''],
    ['', '', '', ''],
  ].map(([exam, board, year, grade]) => `
    <tr>
      <td>${tableCell(exam)}</td>
      <td>${tableCell(board)}</td>
      <td>${tableCell(year)}</td>
      <td>${tableCell(grade)}</td>
    </tr>`).join('');

  const familyRows = [
    ['Father', 'Family_Father_Name', 'Family_Father_Age', 'Family_Father_Qual'],
    ['Mother', 'Family_Mother_Name', 'Family_Mother_Age', 'Family_Mother_Qual'],
    ['Brother/Sister', 'Family_Sib1_Name', 'Family_Sib1_Age', 'Family_Sib1_Qual'],
    ['Brother/Sister', 'Family_Sib2_Name', 'Family_Sib2_Age', 'Family_Sib2_Qual'],
    ['Brother/Sister', 'Family_Sib3_Name', 'Family_Sib3_Age', 'Family_Sib3_Qual'],
  ].map(([relation, nameKey, ageKey, qualKey], index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${tableCell(profileValue(nameKey))}</td>
      <td>${escapePdfHtml(relation)}</td>
      <td>${tableCell(profileValue(ageKey))}</td>
      <td>${tableCell(profileValue(qualKey))}</td>
    </tr>`).join('');

  const activityRows = Array.from({ length: 8 }, (_, index) => index + 1).map((rowNumber) => `
    <tr>
      <td>${tableCell(profileValue(`Activity_Sem_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Activity_Name_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Activity_Achievement_${rowNumber}`))}</td>
    </tr>`).join('');

  const semesterRows = [
    ['1st', 'CGPA_Sem1', 'Grade_Sem1', 'Remarks_Sem1'],
    ['2nd', 'CGPA_Sem2', 'Grade_Sem2', 'Remarks_Sem2'],
    ['3rd', 'CGPA_Sem3', 'Grade_Sem3', 'Remarks_Sem3'],
    ['4th', 'CGPA_Sem4', 'Grade_Sem4', 'Remarks_Sem4'],
    ['5th', 'CGPA_Sem5', 'Grade_Sem5', 'Remarks_Sem5'],
    ['6th', 'CGPA_Sem6', 'Grade_Sem6', 'Remarks_Sem6'],
    ['7th', 'CGPA_Sem7', 'Grade_Sem7', 'Remarks_Sem7'],
    ['8th', 'CGPA_Sem8', 'Grade_Sem8', 'Remarks_Sem8'],
    ['Consolidated', 'CGPA_Cons', 'Grade_Cons', 'Remarks_Cons'],
  ].map(([semester, cgpaKey, gradeKey, remarksKey]) => `
    <tr>
      <td>${escapePdfHtml(semester)}</td>
      <td>${tableCell(profileValue(cgpaKey))}</td>
      <td>${tableCell(profileValue(gradeKey))}</td>
      <td>${tableCell(profileValue(remarksKey))}</td>
    </tr>`).join('');

  const meetingRows = Array.from({ length: 9 }, (_, index) => index + 1).map((rowNumber) => `
    <tr>
      <td>${tableCell(profileValue(`Meeting_No_${rowNumber}`) || rowNumber)}</td>
      <td>${tableCell(profileValue(`Meeting_Date_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Meeting_Discussion_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Meeting_StudentSign_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Meeting_Action_${rowNumber}`))}</td>
      <td>${tableCell(profileValue(`Meeting_MentorSign_${rowNumber}`))}</td>
    </tr>`).join('');

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

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#111;background:#fff}
    .page{width:210mm;min-height:297mm;padding:12mm;position:relative;background:#fff;page-break-after:always;break-after:page}
    .page:last-child{page-break-after:auto;break-after:auto}
    .border-box{border:1pt solid #111;min-height:273mm;padding:10mm 12mm;display:flex;flex-direction:column}
    .simple-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16pt}
    .simple-header-logo{width:38%}
    .simple-header-title{flex:1;text-align:right;font-size:18pt;font-weight:700;padding-top:4pt}
    .su-logo-svg{display:block;width:100%;max-width:180px;height:auto}
    .cover-titles{text-align:center;margin:12pt 0 14pt}
    .cover-main{font-size:18pt;font-weight:700;margin-bottom:7pt}
    .cover-sub{font-size:13pt;font-weight:700}
    .campus-wrap{text-align:center;margin:14pt 0 20pt}
    .campus-photo{width:78%;max-height:54mm;object-fit:cover;object-position:center;border:0.5pt solid #aaa}
    .dotted-row{display:flex;align-items:baseline;margin-bottom:11pt;font-size:12pt;line-height:1.45}
    .dotted-label{white-space:nowrap;margin-right:5pt}
    .dotted-value{flex:1;overflow:hidden}
    .mentor-block{margin-bottom:24pt}
    .mentor-block-title{text-align:center;font-size:12pt;font-weight:700;margin-bottom:8pt}
    .form-table,.grid-table{width:100%;border-collapse:collapse;margin-bottom:8pt;font-size:10.5pt}
    .form-table td,.grid-table th,.grid-table td{border:1pt solid #111;padding:5pt 7pt;vertical-align:middle}
    .grid-table th{text-align:center;font-weight:700}
    .label-cell{width:42%;font-weight:700}
    .index-heading{text-align:center;font-size:16pt;font-weight:700;margin:12pt 0 10pt}
    .fas-header{display:flex;align-items:flex-start;gap:10pt;margin-bottom:10pt;border-bottom:0.5pt solid #999;padding-bottom:8pt}
    .fas-header-logo{width:34%}
    .fas-header-info{flex:1;text-align:center;font-size:10pt;line-height:1.45;padding-top:2pt}
    .fas-main-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:8pt 0 4pt}
    .fas-sub-title{text-align:center;font-size:12pt;font-weight:700;text-decoration:underline;margin-bottom:10pt}
    .section-title{font-size:12pt;font-weight:700;margin:10pt 0 6pt}
    .section-title.underlined{text-decoration:underline}
    .address-box{border:1pt solid #111;margin-bottom:8pt}
    .address-cols{display:flex}
    .address-col{flex:1;border-right:1pt solid #111;padding:6pt 7pt;min-height:55pt}
    .address-col:last-child{border-right:none}
    .address-col-label{font-weight:700;margin-bottom:26pt}
    .address-pin{font-weight:700;margin-top:8pt}
    .parents-box{border:1pt solid #111;margin-bottom:8pt;display:flex}
    .parents-col{flex:1;padding:6pt 7pt;border-right:1pt solid #111;min-height:38pt}
    .parents-col:last-child{border-right:none}
    .parents-line{margin-bottom:8pt}
    .guardian-lines,.hobby-lines{margin:6pt 0 10pt;line-height:2}
    .guardian-line,.hobby-line{border-bottom:1pt dotted #555;min-height:18pt;margin-bottom:6pt}
    .sig-row{display:flex;justify-content:space-between;gap:12pt;margin-top:16pt;font-weight:700}
    .official-section{margin-top:14pt}
    .official-title{font-weight:700;text-decoration:underline;margin-bottom:8pt}
    .official-row{display:flex;justify-content:space-between;gap:12pt;margin-bottom:8pt;font-weight:700}
    .page-footer{position:absolute;right:12mm;bottom:12mm;font-size:11pt;font-weight:700}
    .meeting-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:10pt 0 8pt}
    .meeting-table{font-size:9.2pt}
    .meeting-footer{display:flex;justify-content:space-between;gap:16pt;margin-top:28pt;font-weight:700}
    .vm-wrap{border:1pt solid #111}
    .vm-table{width:100%;border-collapse:collapse;font-size:10.5pt}
    .vm-table td{border:1pt solid #111;padding:6pt 8pt;vertical-align:top}
    .vm-header{background:#c5d9a1;text-align:center;font-weight:700;text-transform:uppercase}
    .vm-code{width:12%;text-align:center;font-weight:700}
    .vm-text{width:88%}
    .vm-body{line-height:1.55}
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>
    <div class="page">
      <div class="border-box">
        ${simpleHeader}
        <div class="cover-titles">
          <div class="cover-main">Mentor-Mentee Handbook</div>
          <div class="cover-sub">Faculty Advisor System- (FAS)</div>
        </div>
        <div class="campus-wrap">
          <img src="${escapePdfHtml(campusSrc)}" class="campus-photo" alt="Sandip University Campus">
        </div>
        <div class="cover-fields">
          ${dotted('Student Name', studentName)}
          ${dotted('School Name', school)}
          ${dotted('Department', department)}
          ${dotted('Programme', programme)}
          ${dotted('PRN', prnNumber)}
          ${dotted('Year of Admission', profileValue('Yearofadmission', 'YearOfAdmission'))}
        </div>
      </div>
    </div>

    <div class="page">
      <div class="border-box">
        ${simpleHeader}
        ${mentorBlock()}
        ${mentorBlock()}
      </div>
    </div>

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

    <div class="page">
      ${fasHeader}
      <div class="fas-main-title">FACULTY ADVISOR SYSTEM (FAS)</div>
      <div class="fas-sub-title">Student Details</div>
      <table class="form-table">
        <tbody>
          <tr><td class="label-cell">School Name</td><td>${tableCell(school)}</td></tr>
          <tr><td class="label-cell">Department Name</td><td>${tableCell(department)}</td></tr>
          <tr><td class="label-cell">Hosteler/ Day-scholar:</td><td>${tableCell(profileValue('HostelerDayScholar', 'hosteler'))}</td></tr>
          <tr><td class="label-cell">Programme:</td><td>${tableCell(programme)}</td></tr>
          <tr><td class="label-cell">Year of admission (First Year):</td><td>${tableCell(profileValue('Yearofadmission', 'YearOfAdmission'))}</td></tr>
          <tr><td class="label-cell">Student Name:</td><td>${tableCell(studentName)}</td></tr>
          <tr><td class="label-cell">PRN:</td><td>${tableCell(prnNumber)}</td></tr>
          <tr><td class="label-cell">Date of Birth:</td><td>${tableCell(profileValue('dob', 'DOB', 'DateOfBirth'))}</td></tr>
          <tr><td class="label-cell">Mobile Number</td><td>${tableCell(profileValue('mobile_number', 'MobileNumber', 'mobile', 'phone'))}</td></tr>
        </tbody>
      </table>
      <div class="section-title">Postal Address:</div>
      <div class="address-box">
        <div class="address-cols">
          <div class="address-col">
            <div class="address-col-label">Permanent Address:</div>
            <div>${tableCell(profileValue('PermanentAddress', 'permanent_address'))}</div>
            <div class="address-pin">Pincode: ${valueOrDots(profileValue('PermanentPincode', 'permanent_pincode'))}</div>
          </div>
          <div class="address-col">
            <div class="address-col-label">Present Address:</div>
            <div>${tableCell(profileValue('PresentAddress', 'present_address'))}</div>
            <div class="address-pin">Pincode: ${valueOrDots(profileValue('PresentPincode', 'present_pincode'))}</div>
          </div>
        </div>
      </div>
      <div class="section-title">Parents Contact details:</div>
      <div class="parents-box">
        <div class="parents-col">
          <div class="parents-line"><strong>Mother Mobile Number: 1:</strong> ${valueOrDots(profileValue('MotherMobile1', 'MotherMobileNumber1', 'mother_mobile1'))}</div>
          <div class="parents-line"><strong>Father Mobile Number: 1:</strong> ${valueOrDots(profileValue('FatherMobile1', 'FatherMobileNumber1', 'father_mobile1'))}</div>
        </div>
        <div class="parents-col">
          <div class="parents-line"><strong>Mother Mobile Number: 2:</strong> ${valueOrDots(profileValue('MotherMobile2', 'MotherMobileNumber2', 'mother_mobile2'))}</div>
          <div class="parents-line"><strong>Father Mobile Number: 2:</strong> ${valueOrDots(profileValue('FatherMobile2', 'FatherMobileNumber2', 'father_mobile2'))}</div>
        </div>
      </div>
      <div class="section-title">Local Guardian Name and Address:</div>
      <div class="guardian-lines">
        <div class="guardian-line">${safe(`${profileValue('LocalGuardianName', 'GuardianName')} ${profileValue('LocalGuardianAddress', 'GuardianAddress')}`)}</div>
        <div class="guardian-line"></div>
        <div class="guardian-line"></div>
      </div>
      <div class="section-title">Local Guardian Mobile Number: ${valueOrDots(profileValue('LocalGuardianMobile', 'GuardianMobile'))}</div>
      <div class="page-footer">Page 1 of 3</div>
    </div>

    <div class="page">
      ${fasHeader}
      <div class="section-title underlined">Educational Details:</div>
      <table class="grid-table">
        <thead><tr><th>Examination</th><th>Board /College</th><th>Year</th><th>Grade/Percentage</th></tr></thead>
        <tbody>${educationRows}</tbody>
      </table>
      <div class="section-title">Family Details:</div>
      <table class="grid-table">
        <thead><tr><th>Sr No</th><th>Name</th><th>Relationship</th><th>Age(years)</th><th>Qualification/Occupation</th></tr></thead>
        <tbody>${familyRows}</tbody>
      </table>
      <div class="section-title">Hobbies and Interest:</div>
      <div class="hobby-lines">
        <div class="hobby-line">${safe(profileValue('Hobbies', 'hobbies', 'HobbiesAndInterest'))}</div>
        <div class="hobby-line"></div>
      </div>
      <div class="section-title">Participation in Co-curricular and extracurricular activities:</div>
      <table class="grid-table">
        <thead><tr><th>Semester(s)</th><th>Activity(s)</th><th>Achievement(s)</th></tr></thead>
        <tbody>${activityRows}</tbody>
      </table>
      <div class="page-footer">Page 2 of 3</div>
    </div>

    <div class="page">
      ${fasHeader}
      <div class="section-title">Academic Progress:</div>
      <table class="grid-table">
        <thead><tr><th>Semester</th><th>CGPA</th><th>Grade</th><th>Remarks</th></tr></thead>
        <tbody>${semesterRows}</tbody>
      </table>
      <div class="sig-row">
        <div>Date: ${valueOrDots(profileValue('Academic_Date', 'Date'))}</div>
        <div>Mentee Name and Signature: ${valueOrDots(profileValue('Academic_Signature', 'StudentSignatureName'))}</div>
      </div>
      <div class="official-section">
        <div class="official-title">For Official Use (To be Filled by Mentor):</div>
        <div class="official-row"><span>Admitted in Class: FE</span><span>Academic Year: ${valueOrDots(profileValue('OfficialUse_FE_Year'))}</span></div>
        <div class="official-row"><span>Admitted in Class: SE/DSE</span><span>Academic Year: ${valueOrDots(profileValue('OfficialUse_SE_Year'))}</span></div>
        <div class="official-row"><span>Admitted in Class: TE</span><span>Academic Year: ${valueOrDots(profileValue('OfficialUse_TE_Year'))}</span></div>
        <div class="official-row"><span>Admitted in Class: BE</span><span>Academic Year: ${valueOrDots(profileValue('OfficialUse_BE_Year'))}</span></div>
      </div>
      <div class="page-footer">Page 3 of 3</div>
    </div>

    <div class="page">
      <div class="border-box">
        ${simpleHeader}
        <div class="meeting-title">Mentor-Mentee Meeting Report</div>
        <table class="grid-table meeting-table">
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
          <tbody>${meetingRows}</tbody>
        </table>
        <div class="meeting-footer">
          <div>Name and Sign of the Head of the Department ${safe(profileValue('Meeting_HOD_Sign'))}</div>
          <div>Dean ${safe(profileValue('Meeting_Dean_Sign'))}</div>
        </div>
      </div>
    </div>

    <div class="page">
      <div class="vm-wrap">
        <table class="vm-table">
          <tbody>
            <tr><td class="vm-header" colspan="2">UNIVERSITY VISION</td></tr>
            <tr><td class="vm-body" colspan="2">To be one of the most preferred learning place to nurture future global leaders congenial to society.</td></tr>
            <tr><td class="vm-header" colspan="2">UNIVERSITY MISSION (UM)</td></tr>
            <tr><td class="vm-body" colspan="2">We, at Sandip University envisage the sustainable growth of stake holders:</td></tr>
            <tr><td class="vm-code">UM1</td><td class="vm-text">To be a globally prominent university.</td></tr>
            <tr><td class="vm-code">UM2</td><td class="vm-text">To provide learning through Cutting Edge Technologies Facilitated by the world class infrastructure to empower our students to converge into capable leaders and responsible citizens bearing high ethical values.</td></tr>
            <tr><td class="vm-code">UM3</td><td class="vm-text">To be a global leader in education and human development to bloom as a center of excellence in teaching, research and entrepreneurship.</td></tr>
            <tr><td class="vm-code">UM4</td><td class="vm-text">Be the most preferred choice of students, parents, guardians, faculty and industry.</td></tr>
            <tr><td class="vm-code">UM5</td><td class="vm-text">Be in the Best top 10 preferred university in every discipline of education health sciences, engineering and management.</td></tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr><td class="vm-header" colspan="2">VISION OF School of Computer Sciences and Engineering</td></tr>
            <tr><td class="vm-body" colspan="2">To be the prominent institution for teaching-learning and research for the computer application and engineering.</td></tr>
            <tr><td class="vm-header" colspan="2">MISSION of School of Computer Sciences and Engineering</td></tr>
            <tr><td class="vm-code">M1</td><td class="vm-text">To impart in-depth technical knowledge.</td></tr>
            <tr><td class="vm-code">M2</td><td class="vm-text">To provide environment for research, innovation, and entrepreneurship.</td></tr>
            <tr><td class="vm-code">M3</td><td class="vm-text">To imbibe strong social and cultural values.</td></tr>
            <tr><td colspan="2">&nbsp;</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </body></html>`;
}

window.generateFasPDFFromStudent = async function generateFasPDFFromStudent(student, options = {}) {
  if (typeof html2pdf === 'undefined') {
    throw new Error('PDF library is not loaded.');
  }

  const studentRecord = student || {};
  const button = options.buttonEl || null;
  const message = options.msgEl || null;
  const buttonDefaultHtml = options.btnDefaultHtml || '<span>Download FAS PDF</span>';
  const buttonLoadingHtml = options.btnLoadingHtml || '<span>Generating PDF...</span>';

  if (button) {
    button.disabled = true;
    button.innerHTML = buttonLoadingHtml;
  }
  if (message) {
    message.innerHTML = '';
  }

  try {
    let campusSrc = 'public/images/sandip-cover-source.png';
    try {
      campusSrc = await imageToDataUrl(campusSrc);
    } catch (_) {
      // Keep the relative path fallback for local/offline generation.
    }

    const html = buildFasHandbookHtml(studentRecord, {
      campusSrc,
      coordinatorProfile: options.coordinatorProfile || {},
    });
    const name = rawFilePart(studentRecord.name || 'student');
    const prn = rawFilePart(studentRecord.prnNumber || studentRecord.prn_number || 'FAS');

    await html2pdf().set({
      margin: 0,
      filename: `FAS_${name}_${prn}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(html).save();

    if (message) {
      message.innerHTML = '<div class="form-success" style="margin-bottom:0">PDF downloaded successfully.</div>';
      setTimeout(() => {
        if (message) {
          message.innerHTML = '';
        }
      }, 3000);
    }
  } catch (error) {
    if (message) {
      message.innerHTML = '<div class="form-error" style="margin-bottom:0">Failed to generate PDF. Please try again.</div>';
    }
    throw error;
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = buttonDefaultHtml;
    }
  }
};

function rawFilePart(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '') || 'FAS';
}
