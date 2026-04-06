const express = require('express');
const router = express.Router();
const db = require('../db');

const getStudentId = () => 1; // temporary until auth is ready

function sendServerError(res, err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

function parsePositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCourseCode(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
}

function compactCourseCode(value) {
    return normalizeCourseCode(value).replace(/\s+/g, '');
}

function validateCourseCode(value) {
    const normalized = normalizeCourseCode(value);

    if (!normalized) {
        return 'Please enter a course code.';
    }

    if (normalized.length > 20) {
        return 'Course code is too long.';
    }

    if (!/^[A-Z]{3,4}\s?\d{3}[A-Z]?$/.test(normalized)) {
        return 'Enter a valid course code like SOEN 287.';
    }

    return null;
}

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
            if (err) return sendServerError(res, err);
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
            if (err) return sendServerError(res, err);
            res.json(results);
        }
    );
});

// JOIN a course by code
router.post('/enroll', (req, res) => {
    const studentId = getStudentId();
    const rawCourseCode = req.body.course_code || req.body.code;
    const courseCodeError = validateCourseCode(rawCourseCode);
    const normalizedCourseCode = normalizeCourseCode(rawCourseCode);
    const courseCodeLookup = compactCourseCode(rawCourseCode);

    if (courseCodeError) {
        return res.status(400).json({ error: courseCodeError });
    }

    db.query(
        `SELECT
            id,
            course_code,
            course_name,
            max_students,
            is_enabled
        FROM courses
        WHERE UPPER(REPLACE(course_code, ' ', '')) = ?
        LIMIT 1`,
        [courseCodeLookup],
        (courseErr, courseResults) => {
            if (courseErr) return sendServerError(res, courseErr);
            if (courseResults.length === 0) {
                return res.status(404).json({
                    error: `Course ${normalizedCourseCode} was not found.`
                });
            }

            const course = courseResults[0];

            if (!course.is_enabled) {
                return res.status(409).json({
                    error: `${course.course_code} is not open for enrollment right now.`
                });
            }

            db.query(
                'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1',
                [studentId, course.id],
                (enrollmentErr, enrollmentResults) => {
                    if (enrollmentErr) {
                        return sendServerError(res, enrollmentErr);
                    }
                    if (enrollmentResults.length > 0) {
                        return res.status(409).json({
                            error: `You are already enrolled in ${course.course_code}.`
                        });
                    }

                    db.query(
                        'SELECT COUNT(*) AS enrolled_count FROM enrollments WHERE course_id = ?',
                        [course.id],
                        (countErr, countResults) => {
                            if (countErr) return sendServerError(res, countErr);

                            const enrolledCount = Number(countResults[0]?.enrolled_count || 0);
                            const maxStudents = course.max_students === null
                                ? null
                                : Number(course.max_students);

                            if (maxStudents !== null && enrolledCount >= maxStudents) {
                                return res.status(409).json({
                                    error: `${course.course_code} is already full.`
                                });
                            }

                            db.query(
                                'INSERT INTO enrollments (student_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
                                [studentId, course.id],
                                (insertErr, result) => {
                                    if (insertErr) return sendServerError(res, insertErr);

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
        }
    );
});

// LEAVE a course
router.delete('/enroll/:id', (req, res) => {
    const studentId = getStudentId();
    const enrollmentId = parsePositiveInteger(req.params.id);

    if (!enrollmentId) {
        return res.status(400).json({ error: 'Please provide a valid enrollment id.' });
    }

    db.query(
        'DELETE FROM enrollments WHERE id = ? AND student_id = ?',
        [enrollmentId, studentId],
        (err, result) => {
            if (err) return sendServerError(res, err);
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
            if (err) return sendServerError(res, err);
            res.json(results);
        }
    );
});

module.exports = router;

