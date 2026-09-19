import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { questions } from './questionsData.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_VqvEyua1JCz3@ep-cool-dew-b3gswcml-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 40,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Converts ? placeholders to $1, $2, ... for PostgreSQL queries
export function toPgSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  pool,
  async query(text, params = []) {
    const pgSql = toPgSql(text);
    return pool.query(pgSql, params);
  },
  async get(text, params = []) {
    const res = await this.query(text, params);
    return res.rows[0] || null;
  },
  async all(text, params = []) {
    const res = await this.query(text, params);
    return res.rows;
  },
  async run(text, params = []) {
    const res = await this.query(text, params);
    return { rowCount: res.rowCount, rows: res.rows };
  },
  async getClient() {
    return pool.connect();
  }
};

export async function initDatabase() {
  try {
    console.log('Connecting to PostgreSQL database...');

    // 1. Candidates Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id VARCHAR(64) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        interested_profile VARCHAR(255) NOT NULL DEFAULT 'Web Development cum Sales Engineer',
        degree VARCHAR(255) NOT NULL,
        semester VARCHAR(64) NOT NULL,
        year VARCHAR(64) NOT NULL,
        branch VARCHAR(255) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        graduation_year VARCHAR(16) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(32) NOT NULL,
        resume_file_path VARCHAR(255) NOT NULL,
        consent_given INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Assessments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id VARCHAR(64) PRIMARY KEY,
        candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        assessment_name VARCHAR(255) NOT NULL DEFAULT 'Round 1 – Assessment',
        start_time TIMESTAMPTZ,
        deadline TIMESTAMPTZ,
        submission_time TIMESTAMPTZ,
        current_question_index INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(64) NOT NULL DEFAULT 'NOT_STARTED',
        question_sequence TEXT NOT NULL,
        total_questions INTEGER NOT NULL DEFAULT 50,
        score INTEGER DEFAULT 0,
        completion_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Answers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id VARCHAR(64) PRIMARY KEY,
        assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL,
        selected_option VARCHAR(16) NOT NULL,
        answered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        is_correct INTEGER NOT NULL DEFAULT 0,
        UNIQUE(assessment_id, question_id)
      );
    `);

    // 4. Questions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        target_profile VARCHAR(64) NOT NULL DEFAULT 'COMMON',
        section VARCHAR(128) NOT NULL,
        topic VARCHAR(128) NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option VARCHAR(8) NOT NULL
      );
    `);

    // 5. Admins Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PostgreSQL schema verified successfully.');

    await seedQuestions();
    await seedAdmin();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

async function seedQuestions() {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM questions');
    const count = parseInt(res.rows[0].count, 10);

    if (count < questions.length) {
      console.log(`Seeding ${questions.length} questions into PostgreSQL...`);
      for (const q of questions) {
        await pool.query(`
          INSERT INTO questions (id, target_profile, section, topic, question_text, option_a, option_b, option_c, option_d, correct_option)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            target_profile = EXCLUDED.target_profile,
            section = EXCLUDED.section,
            topic = EXCLUDED.topic,
            question_text = EXCLUDED.question_text,
            option_a = EXCLUDED.option_a,
            option_b = EXCLUDED.option_b,
            option_c = EXCLUDED.option_c,
            option_d = EXCLUDED.option_d,
            correct_option = EXCLUDED.correct_option
        `, q);
      }
      console.log(`✅ Successfully seeded ${questions.length} total questions in PostgreSQL.`);
    } else {
      console.log(`✅ Database already contains ${count} questions.`);
    }
  } catch (error) {
    console.error('Error seeding questions:', error);
  }
}

async function seedAdmin() {
  try {
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', ['admin@nexis.internal']);
    if (existing.rows.length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('NexisAdmin@2026', salt);
      await pool.query(`
        INSERT INTO admins (id, username, email, password_hash)
        VALUES ($1, $2, $3, $4)
      `, ['admin-default', 'SuperAdmin', 'admin@nexis.internal', hash]);
      console.log('✅ Seeded default admin account: admin@nexis.internal / NexisAdmin@2026');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}

export default db;
