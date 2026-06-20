const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { ensureAppSchema } = require('../utils/schema');
const {
  mergeProfileData,
  normalizeDateOfBirth,
  normalizeDivision,
  normalizeEmail,
  normalizeText,
  sanitizeRecord,
} = require('../utils/normalizers');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireCoordinator(req, res) {
  if (!req.user || req.user.role !== 'coordinator') {
    res.status(403).json({ error: 'Coordinator access is required for this action.' });
    return false;
  }

  return true;
}

async function getCoordinator(req) {
  const result = await db.query(
    `SELECT id, name, email, division, department, profile_data
     FROM users
     WHERE id = $1 AND role = 'coordinator'`,
    [req.user.id]
  );

  return result.rows[0] || null;
}

function buildStudentProfileData(student, coordinator) {
  return mergeProfileData(student.profileData, {
    Name: student.name,
    Email: student.email,
    PRN: student.prnNumber,
    Division: coordinator.division,
    Department: coordinator.department,
    DOB: student.dob,
  });
}

router.get('/dashboard', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) {
      return;
    }

    const coordinator = await getCoordinator(req);

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator profile not found.' });
    }

    if (!coordinator.division) {
      return res.json({
        coordinator: {
          id: coordinator.id,
          name: coordinator.name,
          email: coordinator.email,
          division: '',
          department: coordinator.department || '',
        },
        summary: {
          studentCount: 0,
          fasCount: 0,
          studentsMissingFas: 0,
        },
        students: [],
        fasRecords: [],
      });
    }

    const result = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.prn_number,
         u.division,
         u.department,
         u.profile_data,
         u.created_at,
         f.id AS fas_id,
         f.uploaded_file_name,
         f.form_data,
         f.updated_at AS fas_updated_at
       FROM users u
       LEFT JOIN fas_records f ON f.student_user_id = u.id
       WHERE u.role = 'student' AND u.division = $1
       ORDER BY LOWER(COALESCE(u.name, u.email)) ASC`,
      [coordinator.division]
    );

    const students = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      prnNumber: row.prn_number || '',
      division: row.division || '',
      department: row.department || '',
      profileData: row.profile_data || {},
      hasFas: Boolean(row.fas_id),
      fasUpdatedAt: row.fas_updated_at,
    }));

    const fasRecords = result.rows
      .filter((row) => row.fas_id)
      .map((row) => ({
        studentId: row.id,
        studentName: row.name,
        studentEmail: row.email,
        division: row.division || '',
        uploadedFileName: row.uploaded_file_name || '',
        updatedAt: row.fas_updated_at,
        data: row.form_data || {},
      }));

    res.json({
      coordinator: {
        id: coordinator.id,
        name: coordinator.name,
        email: coordinator.email,
        division: coordinator.division || '',
        department: coordinator.department || '',
      },
      summary: {
        studentCount: students.length,
        fasCount: fasRecords.length,
        studentsMissingFas: students.filter((student) => !student.hasFas).length,
      },
      students,
      fasRecords,
    });
  } catch (error) {
    console.error('Coordinator dashboard error:', error);
    res.status(500).json({ error: 'Failed to load coordinator dashboard data.' });
  }
});

router.post('/sync-students', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) {
      return;
    }

    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'Invalid student sheet data.' });
    }

    const coordinator = await getCoordinator(req);

    if (!coordinator || !coordinator.division) {
      return res.status(400).json({ error: 'Division must be assigned by the HOD before students can be synced.' });
    }

    const results = [];

    for (const studentRow of students) {
      const name = normalizeText(studentRow.name);
      const email = normalizeEmail(studentRow.email);
      const dob = normalizeDateOfBirth(studentRow.dob);
      const prnNumber = normalizeText(studentRow.prnNumber);
      const requestedDivision = normalizeDivision(studentRow.division || coordinator.division);
      const profileData = sanitizeRecord(studentRow.profileData);

      if (!name || !email || !dob) {
        results.push({ email: email || 'unknown', action: 'skipped', reason: 'Missing Name, Email, or DOB' });
        continue;
      }

      if (requestedDivision && requestedDivision !== coordinator.division) {
        results.push({ email, action: 'skipped', reason: `Row division ${requestedDivision} does not match your division ${coordinator.division}` });
        continue;
      }

      const existing = await db.query(
        'SELECT id, role FROM users WHERE email = $1',
        [email]
      );

      if (existing.rows[0] && existing.rows[0].role !== 'student') {
        results.push({ email, action: 'skipped', reason: `Email already belongs to ${existing.rows[0].role}` });
        continue;
      }

      const hashedPassword = await bcrypt.hash(dob, 10);
      const mergedProfile = buildStudentProfileData(
        { name, email, prnNumber, dob, profileData },
        coordinator
      );

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE users
           SET name = $1,
               password = $2,
               prn_number = $3,
               division = $4,
               department = $5,
               profile_data = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $7`,
          [
            name,
            hashedPassword,
            prnNumber || null,
            coordinator.division,
            coordinator.department || '',
            mergedProfile,
            email,
          ]
        );

        await db.query(
          `UPDATE fas_records
           SET division = $1,
               coordinator_user_id = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE student_user_id = $3`,
          [coordinator.division, coordinator.id, existing.rows[0].id]
        );

        results.push({ email, action: 'updated' });
      } else {
        const insertResult = await db.query(
          `INSERT INTO users (name, email, password, role, prn_number, division, department, profile_data, updated_at)
           VALUES ($1, $2, $3, 'student', $4, $5, $6, $7, CURRENT_TIMESTAMP)
           RETURNING id`,
          [
            name,
            email,
            hashedPassword,
            prnNumber || null,
            coordinator.division,
            coordinator.department || '',
            mergedProfile,
          ]
        );

        results.push({ email, action: 'created', studentId: insertResult.rows[0].id });
      }
    }

    res.json({
      message: 'Student roster sync complete',
      counts: {
        created: results.filter((item) => item.action === 'created').length,
        updated: results.filter((item) => item.action === 'updated').length,
        skipped: results.filter((item) => item.action === 'skipped').length,
      },
      summary: results,
    });
  } catch (error) {
    console.error('Student sync error:', error);
    res.status(500).json({ error: 'Failed to sync student records.' });
  }
});

router.post('/sync-fas', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) {
      return;
    }

    const { records, sourceFileName } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid FAS sheet data.' });
    }

    const coordinator = await getCoordinator(req);

    if (!coordinator || !coordinator.division) {
      return res.status(400).json({ error: 'Division must be assigned by the HOD before FAS records can be uploaded.' });
    }

    const results = [];

    for (const record of records) {
      const studentEmail = normalizeEmail(record.studentEmail);
      const payload = sanitizeRecord(record.data);

      if (!studentEmail) {
        results.push({ email: 'unknown', action: 'skipped', reason: 'Missing student email' });
        continue;
      }

      const studentResult = await db.query(
        `SELECT id, name, email
         FROM users
         WHERE role = 'student' AND email = $1 AND division = $2`,
        [studentEmail, coordinator.division]
      );
      const student = studentResult.rows[0];

      if (!student) {
        results.push({ email: studentEmail, action: 'skipped', reason: `Student is not in division ${coordinator.division}` });
        continue;
      }

      await db.query(
        `INSERT INTO fas_records (student_user_id, division, coordinator_user_id, uploaded_file_name, form_data, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (student_user_id)
         DO UPDATE
         SET division = EXCLUDED.division,
             coordinator_user_id = EXCLUDED.coordinator_user_id,
             uploaded_file_name = EXCLUDED.uploaded_file_name,
             form_data = EXCLUDED.form_data,
             updated_at = CURRENT_TIMESTAMP`,
        [
          student.id,
          coordinator.division,
          coordinator.id,
          normalizeText(sourceFileName),
          payload,
        ]
      );

      results.push({ email: student.email, action: 'upserted' });
    }

    res.json({
      message: 'FAS records synced successfully',
      counts: {
        upserted: results.filter((item) => item.action === 'upserted').length,
        skipped: results.filter((item) => item.action === 'skipped').length,
      },
      summary: results,
    });
  } catch (error) {
    console.error('FAS sync error:', error);
    res.status(500).json({ error: 'Failed to sync FAS records.' });
  }
});

router.get('/students', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) {
      return;
    }

    const coordinator = await getCoordinator(req);

    if (!coordinator || !coordinator.division) {
      return res.json([]);
    }

    const result = await db.query(
      `SELECT id, name, email, prn_number
       FROM users
       WHERE role = 'student' AND division = $1
       ORDER BY LOWER(COALESCE(name, email)) ASC`,
      [coordinator.division]
    );

    res.json(result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      prn_number: row.prn_number || '',
    })));
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.post('/upload-students', auth, upload.single('file'), async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) {
      return;
    }

    const coordinator = await getCoordinator(req);

    if (!coordinator || !coordinator.division) {
      return res.status(400).json({ error: 'Division must be assigned by the HOD before students can be uploaded.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    let createdCount = 0;
    let updatedCount = 0;

for (const row of rows) {
      // Handle flexible column name variations - prioritize exact column names from the data
      const name = normalizeText(
        row.student_name || row['Student Name'] || row.name || row.Name || 
        row['Full Name'] || row['full_name'] || row.StudentName || row.prn || row.PRN
      );
      const email = normalizeEmail(
        row.email || row.Email || row['Student Email'] || row['student_email'] || 
        row['E-mail'] || row['e-mail']
      );
      const prnNumber = normalizeText(
        row.prn || row.PRN || row.prnNumber || row['PRN Number'] || 
        row['Roll No'] || row['Roll Number'] || row['Enrollment Number'] || 
        row['enrollment_number'] || row['Student ID'] || row['student_id']
      );

      if (!name || !email) {
        continue;
      }

      const hashedPassword = await bcrypt.hash(prnNumber || 'student', 10);
      
      // Build comprehensive profile data from all available fields with exact column name mapping
      const additionalProfileData = {
        // Basic info
        SchoolName: row.SchoolName || row.schoolName || row['School Name'],
        DepartmentName: row.DepartmentName || row.departmentName || row['Department Name'],
        HostelerDayScholar: row.HostelerDayScholar || row.hosteler || row['Hosteler Day Scholar'],
        Programme: row.Programme || row.programme || row['Program'],
        Yearofadmission: row.Yearofadmission || row.yearofadmission || row['Year of Admission'],
        
        // Contact info
        dob: row.dob || row.DOB || row['Date of Birth'] || row.dateofbirth,
        mobile_number: row.mobile_number || row.MobileNumber || row['Mobile Number'] || row.phone,
        PostalAddress: row.PostalAddress || row.postaladdress || row['Postal Address'],
        
        // Address details
        PermanentAddress: row.PermanentAddress || row.permanentaddress || row['Permanent Address'],
        PermanentPincode: row.PermanentPincode || row.permanentpincode || row['Permanent Pincode'],
        PresentAddress: row.PresentAddress || row.presentaddress || row['Present Address'],
        PresentPincode: row.PresentPincode || row.presentpincode || row['Present Pincode'],
        
        // Parent mobile numbers - handle both naming conventions
        FatherMobile1: row.FatherMobileNumber1 || row.FatherMobile1 || row.fathermobile1 || row['Father Mobile Number 1'] || row['Father Mobile 1'],
        FatherMobile2: row.FatherMobileNumber2 || row.FatherMobile2 || row.fathermobile2 || row['Father Mobile Number 2'] || row['Father Mobile 2'],
        MotherMobile1: row.MotherMobileNumber1 || row.MotherMobile1 || row.mothermobile1 || row['Mother Mobile Number 1'] || row['Mother Mobile 1'],
        MotherMobile2: row.MotherMobileNumber2 || row.MotherMobile2 || row.mothermobile2 || row['Mother Mobile Number 2'] || row['Mother Mobile 2'],
        
        // Guardian details
        LocalGuardianName: row.GuardianName || row['Guardian Name'] || row['Local Guardian Name'],
        LocalGuardianAddress: row.GuardianAddress || row['Guardian Address'] || row['Local Guardian Address'],
        LocalGuardianMobile: row.GuardianMobile || row['Guardian Mobile'] || row['Local Guardian Mobile'],
        
        // Education - SSC
        SSC_Board: row.SSCBoard || row.SSC_Board || row['SSC Board'],
        SSC_Year: row.SSCYear || row.SSC_Year || row['SSC Year'],
        SSC_Grade: row.SSCPercentage || row.SSC_Grade || row['SSC Percentage'] || row.SSCGrade,
        
        // Education - HSC
        HSSC_Board: row.HSCBoard || row.HSSC_Board || row['HSC Board'] || row.HSCBoard,
        HSSC_Year: row.HSCYear || row.HSSC_Year || row['HSC Year'],
        HSSC_Grade: row.HSCPercentage || row.HSSC_Grade || row['HSC Percentage'] || row.HSCGrade,
        
        // Education - Diploma
        Diploma_Board: row.DiplomaCollege || row.Diploma_Board || row['Diploma College'],
        Diploma_Year: row.DiplomaYear || row.Diploma_Year || row['Diploma Year'],
        Diploma_Grade: row.DiplomaPercentage || row.Diploma_Grade || row['Diploma Percentage'],
        
        // Family details - Father
        FatherName: row.FatherName,
        Family_Father_Name: row.FatherName || row.Family_Father_Name || row['Father Name'],
        Family_Father_Age: row.FatherAge || row.Family_Father_Age || row['Father Age'],
        Family_Father_Qual: row.FatherQualificationOccupation || row.Family_Father_Qual || row['Father Qualification Occupation'],
        
        // Family details - Mother
        MotherName: row.MotherName,
        Family_Mother_Name: row.MotherName || row.Family_Mother_Name || row['Mother Name'],
        Family_Mother_Age: row.MotherAge || row.Family_Mother_Age || row['Mother Age'],
        Family_Mother_Qual: row.MotherQualificationOccupation || row.Family_Mother_Qual || row['Mother Qualification Occupation'],
        
        // Family details - Sibling 1
        Family_Sib1_Name: row.Sibling1Name || row.Family_Sib1_Name || row['Sibling 1 Name'],
        Family_Sib1_Age: row.Sibling1Age || row.Family_Sib1_Age || row['Sibling 1 Age'],
        Family_Sib1_Qual: row.Sibling1QualificationOccupation || row.Family_Sib1_Qual || row['Sibling 1 Qualification Occupation'],
        
        // Family details - Sibling 2
        Family_Sib2_Name: row.Sibling2Name || row.Family_Sib2_Name || row['Sibling 2 Name'],
        Family_Sib2_Age: row.Sibling2Age || row.Family_Sib2_Age || row['Sibling 2 Age'],
        Family_Sib2_Qual: row.Sibling2QualificationOccupation || row.Family_Sib2_Qual || row['Sibling 2 Qualification Occupation'],
        
        // Hobbies and activities
        Hobbies: row.HobbiesInterest || row.Hobbies || row['Hobbies Interest'] || row.hobbiesinterest,
        CoCurricularActivities: row.CoCurricularActivities || row['Co-Curricular Activities'],
        Achievements: row.Achievements,
        
        // Semester results
        CGPA_Sem1: row.Sem1CGPA || row['Sem 1 CGPA'],
        Grade_Sem1: row.Sem1Grade || row['Sem 1 Grade'],
        Remarks_Sem1: row.Sem1Remarks || row['Sem 1 Remarks'],
        CGPA_Sem2: row.Sem2CGPA || row['Sem 2 CGPA'],
        Grade_Sem2: row.Sem2Grade || row['Sem 2 Grade'],
        Remarks_Sem2: row.Sem2Remarks || row['Sem 2 Remarks'],
        CGPA_Sem3: row.Sem3CGPA || row['Sem 3 CGPA'],
        Grade_Sem3: row.Sem3Grade || row['Sem 3 Grade'],
        Remarks_Sem3: row.Sem3Remarks || row['Sem 3 Remarks'],
        CGPA_Sem4: row.Sem4CGPA || row['Sem 4 CGPA'],
        Grade_Sem4: row.Sem4Grade || row['Sem 4 Grade'],
        Remarks_Sem4: row.Sem4Remarks || row['Sem 4 Remarks'],
        CGPA_Sem5: row.Sem5CGPA || row['Sem 5 CGPA'],
        Grade_Sem5: row.Sem5Grade || row['Sem 5 Grade'],
        Remarks_Sem5: row.Sem5Remarks || row['Sem 5 Remarks'],
        CGPA_Sem6: row.Sem6CGPA || row['Sem 6 CGPA'],
        Grade_Sem6: row.Sem6Grade || row['Sem 6 Grade'],
        Remarks_Sem6: row.Sem6Remarks || row['Sem 6 Remarks'],
        CGPA_Sem7: row.Sem7CGPA || row['Sem 7 CGPA'],
        Grade_Sem7: row.Sem7Grade || row['Sem 7 Grade'],
        Remarks_Sem7: row.Sem7Remarks || row['Sem 7 Remarks'],
        CGPA_Sem8: row.Sem8CGPA || row['Sem 8 CGPA'],
        Grade_Sem8: row.Sem8Grade || row['Sem 8 Grade'],
        Remarks_Sem8: row.Sem8Remarks || row['Sem 8 Remarks'],
        CGPA_Cons: row.ConsolidatedCGPA || row['Consolidated CGPA'],
        Grade_Cons: row.ConsolidatedGrade || row['Consolidated Grade'],
        Remarks_Cons: row.ConsolidatedRemarks || row['Consolidated Remarks'],
        
        // Date and signature
        Academic_Date: row.Date || row['Date'],
        Academic_Signature: row.StudentSignatureName || row['Student Signature Name'] || row.signature,
      };
      
      const profileData = buildStudentProfileData(
        { name, email, prnNumber, dob: row.dob || '', profileData: additionalProfileData },
        coordinator
      );

      const existing = await db.query(
        'SELECT id, role FROM users WHERE email = $1',
        [email]
      );

      if (existing.rows[0] && existing.rows[0].role !== 'student') {
        continue;
      }

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE users
           SET name = $1,
               password = $2,
               prn_number = $3,
               division = $4,
               department = $5,
               profile_data = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $7`,
          [
            name,
            hashedPassword,
            prnNumber || null,
            coordinator.division,
            coordinator.department || '',
            profileData,
            email,
          ]
        );
        updatedCount++;
      } else {
        await db.query(
          `INSERT INTO users (name, email, password, role, prn_number, division, department, profile_data, updated_at)
           VALUES ($1, $2, $3, 'student', $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            name,
            email,
            hashedPassword,
            prnNumber || null,
            coordinator.division,
            coordinator.department || '',
            profileData,
          ]
        );
        createdCount++;
      }
    }

    res.json({
      message: 'Students uploaded successfully',
      count: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
    });
  } catch (error) {
    console.error('Upload students error:', error);
    res.status(500).json({ error: 'Failed to upload students' });
  }
});

// ── GET /students/by-prn/:prn ───────────────────────────────────────────────
router.get('/students/by-prn/:prn', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    if (!coordinator.division) {
      return res.status(400).json({ error: 'Division must be assigned by the HOD before student lookup is available.' });
    }

    const prnNumber = normalizeText(req.params.prn);
    if (!prnNumber) {
      return res.status(400).json({ error: 'PRN number is required.' });
    }

    const result = await db.query(
      `SELECT id, name, email, prn_number, division, department, profile_data
       FROM users
       WHERE prn_number = $1 AND role = 'student' AND division = $2`,
      [prnNumber, coordinator.division]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'No student with this PRN was found in your division.' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      prnNumber: row.prn_number || '',
      division: row.division || '',
      department: row.department || '',
      profileData: row.profile_data || {},
    });
  } catch (error) {
    console.error('Get student by PRN error:', error);
    res.status(500).json({ error: 'Failed to fetch student by PRN.' });
  }
});

// ── GET /students/:id/profile ──────────────────────────────────────────────
router.get('/students/:id/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    const result = await db.query(
      `SELECT id, name, email, prn_number, division, department, profile_data
       FROM users
       WHERE id = $1 AND role = 'student'`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Student not found.' });

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      prnNumber: row.prn_number || '',
      division: row.division || '',
      department: row.department || '',
      profileData: row.profile_data || {},
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ error: 'Failed to fetch student profile.' });
  }
});

// ── PATCH /students/:id/meeting ────────────────────────────────────────────
router.patch('/students/:id/meeting', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    const { profileData } = req.body;
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({ error: 'profileData object is required.' });
    }

    // Fetch existing profile_data and merge
    const existing = await db.query(
      `SELECT id, profile_data FROM users WHERE id = $1 AND role = 'student'`,
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Student not found.' });

    const merged = { ...(existing.rows[0].profile_data || {}), ...profileData };

    await db.query(
      `UPDATE users SET profile_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [merged, req.params.id]
    );

    res.json({ message: 'Meeting report updated.', profileData: merged });
  } catch (error) {
    console.error('Patch meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting report.' });
  }
});

// ── PATCH /students/:id/profile ─────────────────────────────────────────────
router.patch('/students/:id/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    const { profileData } = req.body;
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({ error: 'profileData object is required.' });
    }

    const existing = await db.query(
      `SELECT id, profile_data FROM users WHERE id = $1 AND role = 'student'`,
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Student not found.' });

    const merged = { ...(existing.rows[0].profile_data || {}), ...profileData };

    await db.query(
      `UPDATE users SET profile_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [merged, req.params.id]
    );

    res.json({ message: 'Student profile updated.', profileData: merged });
  } catch (error) {
    console.error('Coordinator update student profile error:', error);
    res.status(500).json({ error: 'Failed to update student profile.' });
  }
});

// ── DELETE /students/:id ───────────────────────────────────────────────────
router.delete('/students/:id', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    // Only allow deleting students in this coordinator's division
    const check = await db.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'student' AND division = $2`,
      [req.params.id, coordinator.division]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Student not found in your division.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// ── Coordinator Profile Endpoints ────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const coordinator = await getCoordinator(req);
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found.' });

    res.json({
      id: coordinator.id,
      name: coordinator.name,
      email: coordinator.email,
      division: coordinator.division || '',
      profileData: coordinator.profile_data || {},
    });
  } catch (error) {
    console.error('Get coordinator profile error:', error);
    res.status(500).json({ error: 'Failed to fetch coordinator profile.' });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireCoordinator(req, res)) return;

    const { profileData } = req.body;
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({ error: 'profileData object is required.' });
    }

    const existing = await db.query(
      `SELECT profile_data FROM users WHERE id = $1 AND role = 'coordinator'`,
      [req.user.id]
    );

    const merged = { ...(existing.rows[0]?.profile_data || {}), ...profileData };

    await db.query(
      `UPDATE users SET profile_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [merged, req.user.id]
    );

    res.json({ message: 'Coordinator profile saved.', profileData: merged });
  } catch (error) {
    console.error('Update coordinator profile error:', error);
    res.status(500).json({ error: 'Failed to save coordinator profile.' });
  }
});

module.exports = router;
