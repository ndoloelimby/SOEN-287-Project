const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

const getStudentId = () => 1; // temporary until auth is ready

// GET all grades for a course
router.get('/:courseId', (req, res) => {
    const { courseId } = req.params;
    const studentId = getStudentId();

    db.query(
        'SELECT * FROM student_grades WHERE course_id = ? AND student_id = ? ORDER BY due_date IS NULL, due_date ASC, created_at ASC, id ASC',
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// GET student-entered assessments for a course details page
router.get('/:courseId/details', (req, res) => {
    const { courseId } = req.params;
    const studentId = getStudentId();

    db.query(
        `SELECT
            id AS grade_id,
            course_id,
            assessment_id,
            assessment_name,
            category,
            due_date,
            weight,
            earned_marks,
            total_marks,
            status
        FROM student_grades
        WHERE student_id = ? AND course_id = ?
        ORDER BY due_date IS NULL, due_date ASC, created_at ASC, id ASC`,
        [studentId, courseId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ADD a new student-owned assessment
router.post('/', (req, res) => {
    const studentId = getStudentId();
    const {
        course_id,
        assessment_name,
        category,
        due_date,
        weight,
        earned_marks,
        total_marks,
        status
    } = req.body;

    db.query(
        `INSERT INTO student_grades
        (student_id, course_id, assessment_name, category,
        due_date, weight, earned_marks, total_marks, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            studentId,
            course_id,
            assessment_name,
            category,
            due_date || null,
            weight ?? null,
            earned_marks ?? null,
            total_marks ?? null,
            status || 'pending'
        ],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Grade added!', id: result.insertId });
        }
    );
});

// EDIT a grade
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        assessment_name,
        category,
        due_date,
        weight,
        earned_marks,
        total_marks,
        status
    } = req.body;

    db.query(
        `UPDATE student_grades SET
        assessment_name = ?, category = ?, due_date = ?,
        weight = ?, earned_marks = ?, total_marks = ?, status = ?,
        updated_at = NOW()
        WHERE id = ? AND student_id = ?`,
        [
            assessment_name,
            category,
            due_date || null,
            weight ?? null,
            earned_marks ?? null,
            total_marks ?? null,
            status,
            id,
            getStudentId()
        ],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Grade not found' });
            }

            res.json({ message: 'Grade updated!' });
        }
    );
});

// DELETE a grade
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query(
        'DELETE FROM student_grades WHERE id = ? AND student_id = ?',
        [id, getStudentId()],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Grade not found' });
            }

            res.json({ message: 'Grade deleted!' });
        }
    );
});

// GET weighted average for a course
router.get('/:courseId/average', (req, res) => {
    const { courseId } = req.params;
    const studentId = getStudentId();

    db.query(
        `SELECT
            weight,
            earned_marks,
            total_marks
        FROM student_grades
        WHERE course_id = ? AND student_id = ?
        AND earned_marks IS NOT NULL
        AND total_marks IS NOT NULL
        AND total_marks <> 0`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const weightedPoints = results.reduce((sum, row) => {
                const weight = parseFloat(row.weight || 0);
                const percentage = (parseFloat(row.earned_marks) / parseFloat(row.total_marks)) * 100;
                return sum + ((percentage / 100) * weight);
            }, 0);

            const totalWeight = results.reduce(
                (sum, row) => sum + parseFloat(row.weight || 0),
                0
            );

            const average = totalWeight > 0
                ? Number((((weightedPoints / totalWeight) * 100).toFixed(2)))
                : 0;

            res.json({ average, total_weight: Number(totalWeight.toFixed(2)) });
        }
    );
});

// GET GPA across all courses
router.get('/gpa/all', (req, res) => {
    const studentId = getStudentId();

    db.query(
        `SELECT
            course_id,
            weight,
            earned_marks,
            total_marks
        FROM student_grades
        WHERE student_id = ?
        AND earned_marks IS NOT NULL
        AND total_marks IS NOT NULL
        AND total_marks <> 0`,
        [studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

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

            const grouped = results.reduce((acc, row) => {
                const key = row.course_id;
                const weight = parseFloat(row.weight || 0);
                const percentage = (parseFloat(row.earned_marks) / parseFloat(row.total_marks)) * 100;

                if (!acc[key]) {
                    acc[key] = { weightedPoints: 0, totalWeight: 0 };
                }

                acc[key].weightedPoints += (percentage / 100) * weight;
                acc[key].totalWeight += weight;
                return acc;
            }, {});

            const courses = Object.entries(grouped).map(([courseId, data]) => {
                const average = data.totalWeight > 0
                    ? Number((((data.weightedPoints / data.totalWeight) * 100).toFixed(2)))
                    : 0;

                return {
                    course_id: Number(courseId),
                    average,
                    gpa: gpaScale(average)
                };
            });

            const overallGpa = courses.length > 0
                ? Number((courses.reduce((sum, course) => sum + course.gpa, 0) / courses.length).toFixed(2))
                : 0;

            res.json({ courses, overall_gpa: overallGpa });
        }
    );
});

// GET all grades for a course (admin view)
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
        }
    );
});

// GET analytics data for a course
router.get('/:courseId/analytics', (req, res) => {
    const { courseId } = req.params;
    const studentId = getStudentId();

    db.query(
        `SELECT
            id,
            assessment_name,
            category,
            due_date,
            weight,
            earned_marks,
            total_marks,
            status,
            CASE
                WHEN earned_marks IS NOT NULL
                    AND total_marks IS NOT NULL
                    AND total_marks <> 0
                THEN ROUND((earned_marks / total_marks) * 100, 2)
                ELSE NULL
            END as percentage
        FROM student_grades
        WHERE course_id = ? AND student_id = ?
        ORDER BY due_date IS NULL, due_date ASC, created_at ASC, id ASC`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const assessments = results.map((row) => ({
                ...row,
                weight: row.weight === null ? null : parseFloat(row.weight),
                earned_marks: row.earned_marks === null ? null : parseFloat(row.earned_marks),
                total_marks: row.total_marks === null ? null : parseFloat(row.total_marks),
                percentage: row.percentage === null ? null : parseFloat(row.percentage)
            }));

            const completedAssessments = assessments.filter(
                (assessment) => assessment.percentage !== null
            );

            const weightedPoints = completedAssessments.reduce((sum, assessment) => {
                const weight = assessment.weight || 0;
                return sum + ((assessment.percentage / 100) * weight);
            }, 0);

            const completedWeight = completedAssessments.reduce(
                (sum, assessment) => sum + (assessment.weight || 0),
                0
            );

            const totalWeight = assessments.reduce(
                (sum, assessment) => sum + (assessment.weight || 0),
                0
            );

            const average = completedWeight > 0
                ? ((weightedPoints / completedWeight) * 100).toFixed(2)
                : '0.00';

            res.json({
                assessments,
                average,
                completed: completedAssessments.length,
                total: assessments.length,
                completed_weight: Number(completedWeight.toFixed(2)),
                total_weight: Number(totalWeight.toFixed(2))
            });
        }
    );
});

// EXPORT to CSV
router.get('/:courseId/export/csv', (req, res) => {
    const { courseId } = req.params;
    const studentId = getStudentId();

    db.query(
        `SELECT
            assessment_name, category, due_date, weight,
            earned_marks, total_marks,
            ROUND((earned_marks / total_marks) * 100, 2) as percentage, status
        FROM student_grades
        WHERE course_id = ? AND student_id = ?`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const fields = [
                { label: 'Assessment', value: 'assessment_name' },
                { label: 'Category', value: 'category' },
                { label: 'Due Date', value: 'due_date' },
                { label: 'Weight', value: 'weight' },
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
    const studentId = getStudentId();

    db.query(
        `SELECT
            assessment_name, category, due_date, weight,
            earned_marks, total_marks,
            ROUND((earned_marks / total_marks) * 100, 2) as percentage, status
        FROM student_grades
        WHERE course_id = ? AND student_id = ?`,
        [courseId, studentId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const doc = new PDFDocument({ margin: 40 });

            res.header('Content-Type', 'application/pdf');
            res.attachment(`course_${courseId}_grades.pdf`);
            doc.pipe(res);

            doc.fontSize(20)
               .fillColor('#2d1b6e')
               .text('Smart Course Companion', { align: 'center' });
            doc.fontSize(14)
               .fillColor('#6a4fcf')
               .text(`Grade Report - Course ${courseId}`, { align: 'center' });
            doc.moveDown();

            doc.fontSize(10)
               .fillColor('#ffffff')
               .rect(40, doc.y, 520, 20)
               .fill('#6a4fcf');

            doc.fillColor('#ffffff')
               .text('Assessment', 45, doc.y - 15)
               .text('Category', 160, doc.y - 15)
               .text('Weight', 245, doc.y - 15)
               .text('Earned', 305, doc.y - 15)
               .text('Total', 365, doc.y - 15)
               .text('%', 425, doc.y - 15)
               .text('Status', 465, doc.y - 15);

            doc.moveDown();

            results.forEach((grade, index) => {
                const y = doc.y;
                if (index % 2 === 0) {
                    doc.rect(40, y, 520, 20).fill('#f0ebff');
                }

                doc.fillColor('#000')
                   .fontSize(9)
                   .text(grade.assessment_name || '-', 45, y + 5)
                   .text(grade.category || '-', 160, y + 5)
                   .text(grade.weight ?? '-', 245, y + 5)
                   .text(grade.earned_marks ?? '-', 305, y + 5)
                   .text(grade.total_marks ?? '-', 365, y + 5)
                   .text(grade.percentage ?? '-', 425, y + 5)
                   .text(grade.status || '-', 465, y + 5);

                doc.moveDown();
            });

            doc.end();
        }
    );
});

module.exports = router;
