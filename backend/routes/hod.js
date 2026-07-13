const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
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

function requireHod(req, res) {
  if (!req.user || req.user.role !== 'hod') {
    res.status(403).json({ error: 'HOD access is required for this action.' });
    return false;
  }

  return true;
}

function buildCoordinatorProfileData(coord) {
  return mergeProfileData(coord.profileData, {
    Name: coord.name,
    Email: coord.email,
    PRN: coord.prnNumber,
    Department: coord.department,
    Division: coord.division,
    DOB: coord.dob,
  });
}

router.post('/coordinators', auth, async (req, res) => {
  const name = normalizeText(req.body.name);
  const email = normalizeEmail(req.body.email);
  const prnNumber = normalizeText(req.body.prnNumber);
  const division = normalizeDivision(req.body.division);

  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    if (!name || !email || !prnNumber || !division) {
      return res.status(400).json({ error: 'Name, email, PRN, and allocated division are required.' });
    }

    const existing = await db.query(
      `SELECT email, prn_number, role
       FROM users
       WHERE email = $1 OR prn_number = $2
       LIMIT 1`,
      [email, prnNumber]
    );

    const duplicate = existing.rows[0];
    if (duplicate) {
      if (duplicate.role !== 'coordinator') {
        return res.status(409).json({ error: `${duplicate.email === email ? 'Email' : 'PRN'} already belongs to ${duplicate.role}.` });
      }

      return res.status(409).json({ error: 'A coordinator with this email or PRN already exists.' });
    }

    const hashedPassword = await bcrypt.hash(prnNumber, 10);
    const profileData = buildCoordinatorProfileData({
      name,
      email,
      prnNumber,
      department: '',
      division,
      dob: '',
      profileData: {},
    });

    const insertResult = await db.query(
      `INSERT INTO users (name, email, password, role, prn_number, division, department, profile_data, updated_at)
       VALUES ($1, $2, $3, 'coordinator', $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING name, email, prn_number, division, department, profile_data`,
      [name, email, hashedPassword, prnNumber, division, '', profileData]
    );

    const coordinator = insertResult.rows[0];

    res.status(201).json({
      message: 'Coordinator added successfully.',
      coordinator: {
        name: coordinator.name,
        email: coordinator.email,
        prnNumber: coordinator.prn_number || '',
        division: coordinator.division || '',
        department: coordinator.department || '',
        profileData: coordinator.profile_data || {},
      },
    });
  } catch (error) {
    console.error('Create coordinator error:', error);
    res.status(500).json({ error: 'Failed to add coordinator.' });
  }
});

// Sync coordinators from bulk upload
router.post('/sync-coordinators', auth, async (req, res) => {
  console.log('Sync coordinators request received');
  const { coordinators } = req.body;

  if (!Array.isArray(coordinators)) {
    return res.status(400).json({ error: 'Invalid coordinators data' });
  }

  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    const results = [];
    
    for (const coord of coordinators) {
      const name = normalizeText(coord.name);
      const email = normalizeEmail(coord.email);
      const prnNumber = normalizeText(coord.prnNumber);
      const dob = normalizeDateOfBirth(coord.dob);
      const division = normalizeDivision(coord.division);
      const department = normalizeText(coord.department);
      const profileData = sanitizeRecord(coord.profileData);

      if (!name || !email || !dob) {
        results.push({ email: email || 'unknown', action: 'skipped', reason: 'Missing Name, Email, or DOB' });
        continue;
      }

      console.log(`Processing coordinator: ${email}`);
      
      const existing = await db.query('SELECT id, role FROM users WHERE email = $1', [email]);

      if (existing.rows[0] && existing.rows[0].role !== 'coordinator') {
        results.push({ email, action: 'skipped', reason: `Email already belongs to ${existing.rows[0].role}` });
        continue;
      }
      
      if (existing.rows.length > 0) {
        const hashedPassword = await bcrypt.hash(dob, 10);
        await db.query(
          `UPDATE users
           SET name = $1,
               division = $2,
               department = $3,
               password = $4,
               prn_number = $5,
               profile_data = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $7`,
          [
            name,
            division || '',
            department || '',
            hashedPassword,
            prnNumber || null,
            buildCoordinatorProfileData({ name, email, prnNumber, department, division, dob, profileData }),
            email,
          ]
        );
        results.push({ email, action: 'updated' });
      } else {
        const hashedPassword = await bcrypt.hash(dob, 10);
        await db.query(
          `INSERT INTO users (name, email, password, role, prn_number, division, department, profile_data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          [
            name,
            email,
            hashedPassword,
            'coordinator',
            prnNumber || null,
            division || '',
            department || '',
            buildCoordinatorProfileData({ name, email, prnNumber, department, division, dob, profileData }),
          ]
        );
        results.push({ email, action: 'created' });
      }
    }

    const created = results.filter((item) => item.action === 'created').length;
    const updated = results.filter((item) => item.action === 'updated').length;
    const skipped = results.filter((item) => item.action === 'skipped').length;

    res.json({
      message: 'Coordinator sync complete',
      counts: { created, updated, skipped },
      summary: results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync coordinators' });
  }
});

// Update single coordinator division
router.patch('/update-division', auth, async (req, res) => {
  console.log(`Update division request for: ${req.body.email}`);
  const email = normalizeEmail(req.body.email);
  const division = normalizeDivision(req.body.division);

  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    const coordinatorResult = await db.query(
      'SELECT profile_data FROM users WHERE email = $1 AND role = $2',
      [email, 'coordinator']
    );
    const coordinator = coordinatorResult.rows[0];

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found.' });
    }

    const nextProfile = mergeProfileData(coordinator.profile_data, {
      Division: division,
    });

    await db.query(
      'UPDATE users SET division = $1, profile_data = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3 AND role = $4',
      [division, nextProfile, email, 'coordinator']
    );
    res.json({ message: 'Division updated successfully' });
  } catch (error) {
    console.error('Update division error:', error);
    res.status(500).json({ error: 'Failed to update division' });
  }
});

// Delete coordinator with HOD password verification
router.post('/delete-coordinator', auth, async (req, res) => {
  console.log(`Delete coordinator request for: ${req.body.email}`);
  const email = normalizeEmail(req.body.email);
  const { hodPassword } = req.body;
  const hodId = req.user.id;

  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    // 1. Verify HOD password
    const hodResult = await db.query('SELECT password FROM users WHERE id = $1', [hodId]);
    const hod = hodResult.rows[0];

    if (!hod) {
      return res.status(404).json({ error: 'HOD not found' });
    }

    const isMatch = await bcrypt.compare(hodPassword, hod.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect HOD password' });
    }

    // 2. Delete the coordinator
    await db.query('DELETE FROM users WHERE email = $1 AND role = $2', [email, 'coordinator']);
    
    res.json({ message: 'Coordinator removed successfully' });
  } catch (error) {
    console.error('Delete coordinator error:', error);
    res.status(500).json({ error: 'Failed to remove coordinator' });
  }
});

// Get all coordinators
router.get('/coordinators', auth, async (req, res) => {
  console.log('Fetch coordinators request received');
  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    const result = await db.query(
      `SELECT name, email, prn_number, division, department, profile_data
       FROM users
       WHERE role = $1
       ORDER BY LOWER(COALESCE(name, email)) ASC`,
      ['coordinator']
    );
    res.json(result.rows.map((row) => ({
      name: row.name,
      email: row.email,
      prnNumber: row.prn_number || '',
      division: row.division,
      department: row.department,
      profileData: row.profile_data || {},
    })));
  } catch (error) {
    console.error('Fetch coordinators error:', error);
    res.status(500).json({ error: 'Failed to fetch coordinators' });
  }
});

router.get('/overview', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) {
      return;
    }

    const [coordinatorCount, studentCount, fasCount, divisionCount, divisionLoad] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'coordinator'`),
      db.query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'student'`),
      db.query(`SELECT COUNT(*)::int AS total FROM fas_records`),
      db.query(`
        SELECT COUNT(DISTINCT division)::int AS total
        FROM users
        WHERE role = 'coordinator' AND COALESCE(division, '') <> ''
      `),
      db.query(`
        SELECT
          division,
          COUNT(*)::int AS student_count
        FROM users
        WHERE role = 'student' AND COALESCE(division, '') <> ''
        GROUP BY division
        ORDER BY division ASC
      `),
    ]);

    res.json({
      totals: {
        coordinators: coordinatorCount.rows[0].total,
        students: studentCount.rows[0].total,
        fasRecords: fasCount.rows[0].total,
        activeDivisions: divisionCount.rows[0].total,
      },
      divisionLoad: divisionLoad.rows,
    });
  } catch (error) {
    console.error('Fetch overview error:', error);
    res.status(500).json({ error: 'Failed to fetch HOD overview' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireHod(req, res)) return;

    const result = await db.query(
      `SELECT name, email, department, profile_data FROM users WHERE id = $1 AND role = 'hod'`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'HOD profile not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch HOD profile error:', error);
    res.status(500).json({ error: 'Failed to fetch HOD profile' });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireHod(req, res)) return;

    const { name, department, profileData } = req.body;
    const sanitizedName = normalizeText(name);
    const sanitizedDept = normalizeText(department);
    const sanitizedProfile = sanitizeRecord(profileData) || {};

    await db.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           department = COALESCE($2, department),
           profile_data = COALESCE(profile_data, '{}'::jsonb) || $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND role = 'hod'`,
      [sanitizedName, sanitizedDept, sanitizedProfile, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update HOD profile error:', error);
    res.status(500).json({ error: 'Failed to update HOD profile' });
  }
});

module.exports = router;
