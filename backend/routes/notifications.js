const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { ensureAppSchema } = require('../utils/schema');
const { normalizeText } = require('../utils/normalizers');

function requireHod(req, res) {
  if (!req.user || req.user.role !== 'hod') {
    res.status(403).json({ error: 'HOD access is required for this action.' });
    return false;
  }
  return true;
}

function requireCoordinator(req, res) {
  if (!req.user || req.user.role !== 'coordinator') {
    res.status(403).json({ error: 'Coordinator access is required for this action.' });
    return false;
  }
  return true;
}

function requireStudent(req, res) {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ error: 'Student access is required for this action.' });
    return false;
  }
  return true;
}

// HOD sends notification to all coordinators or specific coordinator
router.post('/send', auth, async (req, res) => {
  const { title, message, recipientId, recipientDivision } = req.body;

  try {
    await ensureAppSchema();

    if (!requireHod(req, res)) return;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    if (recipientId) {
      // Send to specific coordinator
      const coord = await db.query('SELECT id, division FROM users WHERE id = $1 AND role = $2', [recipientId, 'coordinator']);
      if (!coord.rows[0]) {
        return res.status(404).json({ error: 'Coordinator not found.' });
      }

      await db.query(
        'INSERT INTO notifications (sender_id, recipient_role, recipient_id, recipient_division, title, message) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, 'coordinator', recipientId, coord.rows[0].division || null, title, message]
      );
    } else {
      // Send to all coordinators (broadcast - recipient_id null)
      await db.query(
        `INSERT INTO notifications (sender_id, recipient_role, recipient_id, recipient_division, title, message)
         VALUES ($1, 'coordinator', NULL, NULL, $2, $3)`,
        [req.user.id, title, message]
      );
    }

    res.json({ message: 'Notification sent successfully.' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification.' });
  }
});


// Coordinator sends notification to HOD(s)
router.post('/send-to-hod', auth, async (req, res) => {
  const { title, message, recipientId } = req.body;

  try {
    await ensureAppSchema();

    // Ensure requester is a coordinator
    if (!requireCoordinator(req, res)) return;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    // If specific HOD ID provided, validate it exists and role
    if (recipientId) {
      const hod = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [recipientId, 'hod']);
      if (!hod.rows[0]) {
        return res.status(404).json({ error: 'HOD not found.' });
      }
      await db.query(
        'INSERT INTO notifications (sender_id, recipient_role, recipient_id, title, message) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'hod', recipientId, title, message]
      );
    } else {
      // Broadcast to all HODs (recipient_id NULL, role 'hod')
      await db.query(
        `INSERT INTO notifications (sender_id, recipient_role, recipient_id, title, message)
         VALUES ($1, 'hod', NULL, $2, $3)`,
        [req.user.id, title, message]
      );
    }

    res.json({ message: 'Notification sent to HOD(s) successfully.' });
  } catch (error) {
    console.error('Send to HOD error:', error);
    res.status(500).json({ error: 'Failed to send notification.' });
  }
});

router.post('/send-to-students', auth, async (req, res) => {
  const { title, message, recipientId } = req.body;

  try {
    await ensureAppSchema();

    if (!requireCoordinator(req, res)) return;

    // Get coordinator's current division dynamically from the DB to avoid stale tokens
    const coordInfo = await db.query('SELECT division FROM users WHERE id = $1', [req.user.id]);
    const coordinatorDivision = coordInfo.rows[0]?.division;

    if (!coordinatorDivision) {
      return res.status(400).json({ error: 'You must have an allocated division to send student notices.' });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    if (recipientId) {
      // Send to specific student
      const stud = await db.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND division = $3',
        [recipientId, 'student', coordinatorDivision]
      );
      if (!stud.rows[0]) {
        return res.status(404).json({ error: 'Student not found or not in your division.' });
      }

      await db.query(
        'INSERT INTO notifications (sender_id, recipient_role, recipient_id, recipient_division, title, message) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, 'student', recipientId, coordinatorDivision, title, message]
      );
    } else {
      // Send to all students in division
      await db.query(
        `INSERT INTO notifications (sender_id, recipient_role, recipient_id, recipient_division, title, message)
         SELECT $1, 'student', u.id, $2, $3, $4
         FROM users u
         WHERE u.role = 'student' AND u.division = $5`,
        [req.user.id, coordinatorDivision, title, message, coordinatorDivision]
      );
    }

    res.json({ message: 'Notification sent successfully.' });
  } catch (error) {
    console.error('Send student notification error:', error);
    res.status(500).json({ error: 'Failed to send notification.' });
  }
});

// Get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    const { id, role, division } = req.user;

    let query = '';
    let params = [];

    if (role === 'hod') {
      // HOD sees notifications addressed to hod role (sent by coordinators)
      query = `
        SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.sender_id, u.name AS sender_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.sender_id
        WHERE n.recipient_role = 'hod' AND (n.recipient_id = $1 OR n.recipient_id IS NULL)
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [id];
    } else if (role === 'coordinator') {
      // Coordinator sees notifications sent TO them by HOD, including broadcasts (recipient_id null)
      query = `
        SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.sender_id, u.name AS sender_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.sender_id
        WHERE n.recipient_role = 'coordinator' AND (n.recipient_id = $1 OR n.recipient_id IS NULL)
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [id];
    } else if (role === 'student') {
      // Student sees notifications sent to their division or directly to them
      query = `
        SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.sender_id, u.name AS sender_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.sender_id
        WHERE n.recipient_role = 'student' AND (n.recipient_id = $1 OR n.recipient_division = $2)
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [id, division];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark all notifications as read for current user
router.put('/read-all', auth, async (req, res) => {
  try {
    await ensureAppSchema();
    const { id, role, division } = req.user;

    if (role === 'hod') {
      await db.query(
        "UPDATE notifications SET is_read = true WHERE recipient_role = 'hod' AND (recipient_id = $1 OR recipient_id IS NULL)",
        [id]
      );
    } else if (role === 'coordinator') {
      await db.query(
        "UPDATE notifications SET is_read = true WHERE recipient_role = 'coordinator' AND (recipient_id = $1 OR recipient_id IS NULL)",
        [id]
      );
    } else if (role === 'student') {
      await db.query(
        "UPDATE notifications SET is_read = true WHERE recipient_role = 'student' AND (recipient_id = $1 OR recipient_division = $2)",
        [id, division]
      );
    }

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    const { id } = req.params;
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND (recipient_id = $2 OR sender_id = $2 OR recipient_role = $3)',
      [id, userId, req.user.role]
    );

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    const { id } = req.params;
    const userId = req.user.id;

    await db.query(
      'DELETE FROM notifications WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2 OR recipient_role = $3)',
      [id, userId, req.user.role]
    );

    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    await ensureAppSchema();

    const { id, role, division } = req.user;

    let query = '';
    let params = [];

    if (role === 'student') {
      query = 'SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_role = $1 AND (recipient_id = $2 OR recipient_division = $3) AND is_read = false';
      params = ['student', id, division];
    } else if (role === 'coordinator') {
      query = `
        SELECT COUNT(*)::int AS count FROM notifications
        WHERE recipient_role = 'coordinator' AND (recipient_id = $1 OR recipient_id IS NULL)
        AND is_read = false
      `;
      params = [id];
    } else if (role === 'hod') {
      query = `
        SELECT COUNT(*)::int AS count FROM notifications
        WHERE recipient_role = 'hod' AND (recipient_id = $1 OR recipient_id IS NULL)
        AND is_read = false
      `;
      params = [id];
    } else {
      query = 'SELECT 0 AS count';
      params = [];
    }

    const result = await db.query(query, params);
    res.json({ count: result.rows[0].count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to count notifications.' });
  }
});

module.exports = router;