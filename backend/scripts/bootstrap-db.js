const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function escapeIdentifier(value) {
    return `\`${String(value).replace(/`/g, '``')}\``;
}

async function main() {
    const {
        DB_HOST = 'localhost',
        DB_USER = 'root',
        DB_PASSWORD = '',
        DB_NAME
    } = process.env;

    if (!DB_NAME) {
        throw new Error('DB_NAME is required in backend/.env');
    }

    const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        multipleStatements: true
    });

    try {
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await connection.query(`USE ${escapeIdentifier(DB_NAME)}`);

        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8').replace(/^\uFEFF/, '');
        await connection.query(schemaSql);

        console.log(`Database bootstrap complete for ${DB_NAME}.`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error('Database bootstrap failed:', error.message);
    process.exit(1);
});


