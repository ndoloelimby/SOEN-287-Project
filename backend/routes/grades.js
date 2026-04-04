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

<<<<<<< HEAD
// GET all grades for a course (admin view — all students)
router.get('/:courseId/all', (req, res) => {
    const { courseId } = req.params;
    db.query(
        `SELECT assessment_name, category,
            COUNT(*) as submissions,
            ROUND(AVG(earned_marks / total_marks * 100), 1) as avg_pct
         FROM student_grades
         WHERE course_id = ? AND earned_marks IS NOT NULL
         GROUP BY assessment_name, category`,
        [courseId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
=======
// GET analytics data for a course
router.get('/:courseId/analytics', (req, res) => {
    const { courseId } = req.params;
    const studentId = 1;

    db.query(
        `SELECT 
            assessment_name,
            category,
            earned_marks,
            total_marks,
            status,
            ROUND((earned_marks / total_marks) * 100, 2) 
            as percentage
        FROM student_grades
        WHERE course_id = ? AND student_id = ?
        AND earned_marks IS NOT NULL
        ORDER BY created_at ASC`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const completed = results.length;
            const total = completed;
            const average = results.length > 0
                ? (results.reduce((sum, r) => 
                    sum + parseFloat(r.percentage), 0) / results.length).toFixed(2)
                : 0;

            res.json({ assessments: results, average, completed, total });
        }
    );
});

const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// EXPORT to CSV
router.get('/:courseId/export/csv', (req, res) => {
    const { courseId } = req.params;
    const studentId = 1;

    db.query(
        `SELECT 
            assessment_name, category, due_date,
            earned_marks, total_marks,
            ROUND((earned_marks / total_marks) * 100, 2) 
            as percentage, status
        FROM student_grades
        WHERE course_id = ? AND student_id = ?`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ 
                error: err.message });

            const fields = [
                { label: 'Assessment', value: 'assessment_name' },
                { label: 'Category', value: 'category' },
                { label: 'Due Date', value: 'due_date' },
                { label: 'Earned', value: 'earned_marks' },
                { label: 'Total', value: 'total_marks' },
                { label: 'Percentage', value: 'percentage' },
                { label: 'Status', value: 'status' }
            ];

            const parser = new Parser({ fields });
            const csv = parser.parse(results);

            res.header('Content-Type', 'text/csv');
            res.attachment(`course_${courseId}_grades.csv`);
            res.send(csv);
        }
    );
});

// EXPORT to PDF
router.get('/:courseId/export/pdf', (req, res) => {
    const { courseId } = req.params;
    const studentId = 1;

    db.query(
        `SELECT 
            assessment_name, category, due_date,
            earned_marks, total_marks,
            ROUND((earned_marks / total_marks) * 100, 2) 
            as percentage, status,
            ROUND((SUM(earned_marks) OVER()) / 
            (SUM(total_marks) OVER()) * 100, 2) 
            as overall_average
        FROM student_grades
        WHERE course_id = ? AND student_id = ?`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ 
                error: err.message });

            const doc = new PDFDocument({ margin: 40 });

            res.header('Content-Type', 'application/pdf');
            res.attachment(`course_${courseId}_grades.pdf`);
            doc.pipe(res);

            // Title
            doc.fontSize(20)
               .fillColor('#2d1b6e')
               .text('Smart Course Companion', 
                    { align: 'center' });
            doc.fontSize(14)
               .fillColor('#6a4fcf')
               .text(`Grade Report — Course ${courseId}`, 
                    { align: 'center' });
            doc.moveDown();

            // Overall average
            if (results.length > 0) {
                doc.fontSize(12)
                   .fillColor('#000')
                   .text(`Overall Average: ${results[0].overall_average}%`);
                doc.moveDown();
            }

            // Table header
            doc.fontSize(10)
               .fillColor('#ffffff')
               .rect(40, doc.y, 520, 20)
               .fill('#6a4fcf');

            doc.fillColor('#ffffff')
               .text('Assessment', 45, doc.y - 15)
               .text('Category', 180, doc.y - 15)
               .text('Earned', 280, doc.y - 15)
               .text('Total', 340, doc.y - 15)
               .text('%', 400, doc.y - 15)
               .text('Status', 450, doc.y - 15);

            doc.moveDown();

            // Table rows
            results.forEach((g, i) => {
                const y = doc.y;
                if (i % 2 === 0) {
                    doc.rect(40, y, 520, 20)
                       .fill('#f0ebff');
                }
                doc.fillColor('#000')
                   .fontSize(9)
                   .text(g.assessment_name || '-', 45, y + 5)
                   .text(g.category || '-', 180, y + 5)
                   .text(g.earned_marks || '-', 280, y + 5)
                   .text(g.total_marks || '-', 340, y + 5)
                   .text(g.percentage || '-', 400, y + 5)
                   .text(g.status || '-', 450, y + 5);
                doc.moveDown();
            });

            doc.end();
>>>>>>> fbb3d68442f8b5c7c2fa6625c74ea7c3085dd4bd
        }
    );
});

module.exports = router;