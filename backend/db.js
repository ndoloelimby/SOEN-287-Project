const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

function ensureStudentGradesWeightColumn() {
    db.query(
        `SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'student_grades'
        AND COLUMN_NAME = 'weight'
        LIMIT 1`,
        [process.env.DB_NAME],
        (checkErr, results) => {
            if (checkErr) {
                console.log('Could not inspect student_grades columns:', checkErr);
                return;
            }

            if (results.length > 0) {
                return;
            }

            db.query(
                'ALTER TABLE student_grades ADD COLUMN weight DECIMAL(5,2) NULL AFTER due_date',
                (alterErr) => {
                    if (alterErr) {
                        console.log('Could not add weight column to student_grades:', alterErr);
                        return;
                    }

                    console.log('Added weight column to student_grades.');
                }
            );
        }
    );
}

db.connect((err) => {
    if (err) {
        console.log('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database!');
    ensureStudentGradesWeightColumn();
});

module.exports = db;
