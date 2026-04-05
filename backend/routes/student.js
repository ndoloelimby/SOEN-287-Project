const express = require('express');
const router = express.Router();
const db = require('../db');

const getStudentId = () => 1; // temporary until auth is ready

// GET student profile
router.get('/account', (req, res) => {
    const studentId = getStudentId();

    db.query(
        `SELECT
            id,
            name,
            email,
            student_number,
            created_at
        FROM students
        WHERE id = ?
        LIMIT 1`,
        [studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) {
                return res.status(404).json({ error: 'Student not found' });
            }

            res.json(results[0]);
        }
    );
});

// GET courses the student is enrolled in
router.get('/enrollments', (req, res) => {
    const studentId = getStudentId();

    db.query(
        `SELECT
            e.id AS enrollment_id,
            e.student_id,
            e.course_id,
            e.enrolled_at,
            c.course_code,
            c.course_name,
            c.instructor,
            c.term,
            c.max_students,
            c.is_enabled,
            c.created_at AS course_created_at
        FROM enrollments e
        INNER JOIN courses c ON c.id = e.course_id
        WHERE e.student_id = ?
        ORDER BY e.enrolled_at DESC`,
        [studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// JOIN a course by code
router.post('/enroll', (req, res) => {
    const studentId = getStudentId();
    const courseCode = req.body.course_code || req.body.code;

    if (!courseCode) {
        return res.status(400).json({ error: 'course_code is required' });
    }

    db.query(
        'SELECT id, course_code, course_name FROM courses WHERE course_code = ? LIMIT 1',
        [courseCode],
        (courseErr, courseResults) => {
            if (courseErr) return res.status(500).json({ error: courseErr.message });
            if (courseResults.length === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }

            const course = courseResults[0];

            db.query(
                'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1',
                [studentId, course.id],
                (enrollmentErr, enrollmentResults) => {
                    if (enrollmentErr) {
                        return res.status(500).json({ error: enrollmentErr.message });
                    }
                    if (enrollmentResults.length > 0) {
                        return res.status(409).json({ error: 'Student is already enrolled in this course' });
                    }

                    db.query(
                        'INSERT INTO enrollments (student_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
                        [studentId, course.id],
                        (insertErr, result) => {
                            if (insertErr) return res.status(500).json({ error: insertErr.message });

                            res.status(201).json({
                                message: 'Enrollment created',
                                enrollment_id: result.insertId,
                                course
                            });
                        }
                    );
                }
            );
        }
    );
});

// LEAVE a course
router.delete('/enroll/:id', (req, res) => {
    const studentId = getStudentId();
    const { id } = req.params;

    db.query(
        'DELETE FROM enrollments WHERE id = ? AND student_id = ?',
        [id, studentId],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Enrollment not found' });
            }

            res.json({ message: 'Enrollment deleted' });
        }
    );
});

// GET upcoming assessments for the student dashboard
router.get('/dashboard', (req, res) => {
    const studentId = getStudentId();

    db.query(
        `SELECT
            a.id AS assessment_id,
            a.course_id,
            c.course_code,
            c.course_name,
            a.assessment_name,
            a.category,
            a.description,
            a.due_date,
            a.weight,
            a.created_at AS assessment_created_at,
            COALESCE(g.status, 'pending') AS status,
            g.earned_marks,
            g.total_marks
        FROM enrollments e
        INNER JOIN assessment_templates a ON a.course_id = e.course_id
        INNER JOIN courses c ON c.id = a.course_id
        LEFT JOIN student_grades g
            ON g.student_id = e.student_id
            AND g.course_id = a.course_id
            AND g.assessment_id = a.id
        WHERE e.student_id = ?
        AND a.due_date IS NOT NULL
        AND a.due_date >= NOW()
        ORDER BY a.due_date ASC`,
        [studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

module.exports = router;

