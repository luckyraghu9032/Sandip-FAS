const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { ensureAppSchema } = require('../utils/schema');
const { sanitizeRecord } = require('../utils/normalizers');

function requireStudent(req, res) {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ error: 'Student access is required for this action.' });
    return false;
  }

  return true;
}

router.get('/me', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireStudent(req, res)) {
      return;
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
         f.uploaded_file_name,
         f.form_data,
         f.updated_at AS fas_updated_at
       FROM users u
       LEFT JOIN fas_records f ON f.student_user_id = u.id
       WHERE u.id = $1 AND u.role = 'student'`,
      [req.user.id]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Fetch coordinator profile data for this division
    let coordinatorProfile = {};
    if (row.division) {
      const coordResult = await db.query(
        `SELECT profile_data FROM users WHERE role = 'coordinator' AND division = $1 LIMIT 1`,
        [row.division]
      );
      if (coordResult.rows[0]) {
        coordinatorProfile = coordResult.rows[0].profile_data || {};
      }
    }

    res.json({
      student: {
        id: row.id,
        name: row.name,
        email: row.email,
        prnNumber: row.prn_number || '',
        division: row.division || '',
        department: row.department || '',
        profileData: row.profile_data || {},
      },
      fasRecord: row.form_data ? {
        uploadedFileName: row.uploaded_file_name || '',
        updatedAt: row.fas_updated_at,
        data: row.form_data || {},
      } : null,
      coordinatorProfile: coordinatorProfile,
    });
  } catch (error) {
    console.error('Student profile error:', error);
    res.status(500).json({ error: 'Failed to load student data.' });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    if (!requireStudent(req, res)) return;

    const { sanitizeRecord } = require('../utils/normalizers');
    const updates = sanitizeRecord(req.body.profileData);

    const name = updates.StudentName;
    const email = updates.Email;
    const division = updates.Division;

    await db.query(
      `UPDATE users
       SET profile_data = profile_data || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(updates), req.user.id]
    );

    if (name || email || division) {
      const setParts = [];
      const params = [];
      let idx = 1;

      if (name) {
        setParts.push(`name = $${idx}`);
        params.push(name);
        idx++;
      }
      if (email) {
        setParts.push(`email = $${idx}`);
        params.push(email);
        idx++;
      }
      if (division) {
        setParts.push(`division = $${idx}`);
        params.push(division);
        idx++;
      }

      setParts.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(req.user.id);

      await db.query(
        `UPDATE users SET ${setParts.join(', ')} WHERE id = $${idx}`,
        params
      );
    }

    const result = await db.query(
      'SELECT profile_data, name, email, division FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated.',
      profileData: result.rows[0].profile_data,
      name: result.rows[0].name,
      email: result.rows[0].email,
      division: result.rows[0].division,
    });
  } catch (error) {
    console.error('Student profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

router.patch('/fas', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    if (!requireStudent(req, res)) {
      return;
    }

    const payload = sanitizeRecord(req.body.data);

    const existingResult = await db.query(
      `SELECT id
       FROM fas_records
       WHERE student_user_id = $1`,
      [req.user.id]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'No FAS record has been uploaded for your account yet.' });
    }

    await db.query(
      `UPDATE fas_records
       SET form_data = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_user_id = $2`,
      [payload, req.user.id]
    );

    res.json({
      message: 'FAS details updated successfully.',
      data: payload,
    });
  } catch (error) {
    console.error('Student FAS update error:', error);
    res.status(500).json({ error: 'Failed to update FAS details.' });
  }
});

module.exports = router;
