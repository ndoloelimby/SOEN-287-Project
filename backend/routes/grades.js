const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all grades for a course
router.get('/:courseId', (req, res) => {
    const { courseId } = req.params;
    const studentId = 1; // temporary until auth is ready

    db.query(
        'SELECT * FROM student_grades WHERE course_id = ? AND student_id = ?',
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ADD a new grade
router.post('/', (req, res) => {
    const studentId = 1; // temporary until auth is ready
    const { course_id, assessment_name, category, 
            due_date, earned_marks, total_marks, status } = req.body;

    db.query(
        `INSERT INTO student_grades 
        (student_id, course_id, assessment_name, category, 
        due_date, earned_marks, total_marks, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, course_id, assessment_name, category,
        due_date, earned_marks, total_marks, status],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Grade added!', id: result.insertId });
        }
    );
});

// EDIT a grade
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { assessment_name, category, due_date, 
            earned_marks, total_marks, status } = req.body;

    db.query(
        `UPDATE student_grades SET 
        assessment_name = ?, category = ?, due_date = ?,
        earned_marks = ?, total_marks = ?, status = ?
        WHERE id = ?`,
        [assessment_name, category, due_date,
        earned_marks, total_marks, status, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Grade updated!' });
        }
    );
});

// DELETE a grade
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query(
        'DELETE FROM student_grades WHERE id = ?',
        [id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Grade deleted!' });
        }
    );
});

// GET average for a course (server-side calculation)
router.get('/:courseId/average', (req, res) => {
    const { courseId } = req.params;
    const studentId = 1; // temporary until auth is ready

    db.query(
        `SELECT 
            SUM(earned_marks) as total_earned,
            SUM(total_marks) as total_possible,
            ROUND((SUM(earned_marks) / SUM(total_marks)) * 100, 2) 
            as average
        FROM student_grades 
        WHERE course_id = ? AND student_id = ?
        AND earned_marks IS NOT NULL`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results[0]);
        }
    );
});

// GET GPA across all courses
router.get('/gpa/all', (req, res) => {
    const studentId = 1; // temporary until auth is ready

    db.query(
        `SELECT 
            course_id,
            ROUND((SUM(earned_marks) / SUM(total_marks)) * 100, 2) 
            as average
        FROM student_grades 
        WHERE student_id = ?
        AND earned_marks IS NOT NULL
        GROUP BY course_id`,
        [studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            // Convert average to GPA
            const gpaScale = (avg) => {
                if (avg >= 90) return 4.3;
                if (avg >= 85) return 4.0;
                if (avg >= 80) return 3.7;
                if (avg >= 75) return 3.3;
                if (avg >= 70) return 3.0;
                if (avg >= 65) return 2.7;
                if (avg >= 60) return 2.3;
                if (avg >= 55) return 2.0;
                if (avg >= 50) return 1.0;
                return 0.0;
            };

            const gpaResults = results.map(r => ({
                course_id: r.course_id,
                average: r.average,
                gpa: gpaScale(r.average)
            }));

            const overallGpa = gpaResults.length > 0
                ? (gpaResults.reduce((sum, r) => 
                    sum + r.gpa, 0) / gpaResults.length).toFixed(2)
                : 0;

            res.json({ courses: gpaResults, overall_gpa: overallGpa });
        }
    );
});

module.exports = router;