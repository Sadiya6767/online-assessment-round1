import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'assessment.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Candidates Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      degree TEXT NOT NULL,
      semester TEXT NOT NULL,
      year TEXT NOT NULL,
      branch TEXT NOT NULL,
      college_name TEXT NOT NULL,
      graduation_year TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      resume_file_path TEXT NOT NULL,
      consent_given INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Assessments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      assessment_name TEXT NOT NULL DEFAULT 'Round 1 – Common Assessment',
      start_time DATETIME,
      deadline DATETIME,
      submission_time DATETIME,
      current_question_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      question_sequence TEXT NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 40,
      score INTEGER DEFAULT 0,
      completion_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );
  `);

  // 3. Answers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT NOT NULL,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_correct INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      UNIQUE(assessment_id, question_id)
    );
  `);

  // 4. Questions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      section TEXT NOT NULL,
      topic TEXT NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL
    );
  `);

  // 5. Admins Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedQuestions();
  seedAdmin();
}

function seedQuestions() {
  // Always ensure fresh, simplified 30 questions
  db.exec('DELETE FROM questions;');

  const insertStmt = db.prepare(`
    INSERT INTO questions (id, section, topic, question_text, option_a, option_b, option_c, option_d, correct_option)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const questions = [
    // Section A: HTML (5 Simple Questions)
    [
      1, 'Section A: HTML', 'HTML Basics',
      'What does HTML stand for?',
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Hyper Transfer Markup Link',
      'Home Tool Management Language',
      'A'
    ],
    [
      2, 'Section A: HTML', 'Hyperlinks',
      'Which HTML tag is used to create a clickable hyperlink?',
      '<link>',
      '<a>',
      '<href>',
      '<url>',
      'B'
    ],
    [
      3, 'Section A: HTML', 'Images',
      'Which HTML element is used to display an image on a webpage?',
      '<picture>',
      '<image>',
      '<img>',
      '<src>',
      'C'
    ],
    [
      4, 'Section A: HTML', 'Headings',
      'Which tag is used to define the largest heading in HTML?',
      '<h6>',
      '<head>',
      '<h1>',
      '<heading>',
      'C'
    ],
    [
      5, 'Section A: HTML', 'Lists',
      'Which HTML tag is used to create an unordered (bulleted) list?',
      '<ol>',
      '<ul>',
      '<li>',
      '<list>',
      'B'
    ],

    // Section B: CSS (5 Simple Questions)
    [
      6, 'Section B: CSS', 'CSS Basics',
      'What does CSS stand for?',
      'Creative Style Sheets',
      'Computer Style Sheets',
      'Cascading Style Sheets',
      'Colorful Style System',
      'C'
    ],
    [
      7, 'Section B: CSS', 'Colors',
      'Which CSS property is used to change the text color of an element?',
      'font-color',
      'text-color',
      'color',
      'style-color',
      'C'
    ],
    [
      8, 'Section B: CSS', 'Typography',
      'Which CSS property is used to control the size of text?',
      'font-size',
      'text-style',
      'text-size',
      'font-weight',
      'A'
    ],
    [
      9, 'Section B: CSS', 'Box Model',
      'Which property adds space inside an element, between the content and its border?',
      'margin',
      'padding',
      'spacing',
      'border-spacing',
      'B'
    ],
    [
      10, 'Section B: CSS', 'Selectors',
      'In CSS, which symbol is used to select an element by its unique ID?',
      '. (dot)',
      '# (hash)',
      '@ (at sign)',
      '* (asterisk)',
      'B'
    ],

    // Section C: JavaScript (5 Simple Questions)
    [
      11, 'Section C: JavaScript', 'Variables',
      'Which keyword is used to declare a variable that can be reassigned in modern JavaScript?',
      'const',
      'let',
      'static',
      'fixed',
      'B'
    ],
    [
      12, 'Section C: JavaScript', 'Console Output',
      'Which built-in method is commonly used to print output to the browser console?',
      'console.print()',
      'console.log()',
      'print.console()',
      'system.out.print()',
      'B'
    ],
    [
      13, 'Section C: JavaScript', 'Data Types',
      'What does the expression typeof "Hello World" return in JavaScript?',
      'string',
      'text',
      'character',
      'object',
      'A'
    ],
    [
      14, 'Section C: JavaScript', 'Comments',
      'Which symbol is used for single-line comments in JavaScript?',
      '<!-- -->',
      '/* */',
      '//',
      '##',
      'C'
    ],
    [
      15, 'Section C: JavaScript', 'JSON Parsing',
      'Which method converts a JSON string into a JavaScript object?',
      'JSON.toString()',
      'JSON.parse()',
      'JSON.objectify()',
      'JSON.stringify()',
      'B'
    ],

    // Section D: Logical Reasoning & Aptitude (10 Simple Questions)
    [
      16, 'Section D: Logical Reasoning & Aptitude', 'Number Series',
      'Find the next number in the sequence: 2, 4, 8, 16, ?',
      '24',
      '32',
      '30',
      '64',
      'B'
    ],
    [
      17, 'Section D: Logical Reasoning & Aptitude', 'Percentages',
      'If a product costs ₹500 and is sold with a 10% discount, what is the final selling price?',
      '₹450',
      '₹400',
      '₹480',
      '₹490',
      'A'
    ],
    [
      18, 'Section D: Logical Reasoning & Aptitude', 'Speed & Distance',
      'A car travels 120 kilometers in 2 hours. What is its average speed in km/h?',
      '50 km/h',
      '60 km/h',
      '70 km/h',
      '80 km/h',
      'B'
    ],
    [
      19, 'Section D: Logical Reasoning & Aptitude', 'Arithmetic',
      'Solve the mathematical expression using order of operations: 5 + 3 * 2 = ?',
      '16',
      '11',
      '13',
      '10',
      'B'
    ],
    [
      20, 'Section D: Logical Reasoning & Aptitude', 'Coding-Decoding',
      'In a code language, if CAT is written as DBU (+1 shift), how is DOG written?',
      'EPH',
      'ENH',
      'FOH',
      'EPI',
      'A'
    ],
    [
      21, 'Section D: Logical Reasoning & Aptitude', 'Patterns',
      'Look at this number pattern: 36, 34, 30, 28, 24, ? (alternating -2 and -4). What comes next?',
      '20',
      '22',
      '23',
      '26',
      'B'
    ],
    [
      22, 'Section D: Logical Reasoning & Aptitude', 'Profit Calculation',
      'A shopkeeper buys a notebook for ₹20 and sells it for ₹25. What is the profit earned?',
      '₹3',
      '₹5',
      '₹10',
      '₹2.5',
      'B'
    ],
    [
      23, 'Section D: Logical Reasoning & Aptitude', 'Divisibility',
      'Which of the following numbers is completely divisible by 5?',
      '32',
      '43',
      '45',
      '51',
      'C'
    ],
    [
      24, 'Section D: Logical Reasoning & Aptitude', 'Odd One Out',
      'Find the odd one out from the following options:',
      'Apple',
      'Mango',
      'Carrot',
      'Banana',
      'C'
    ],
    [
      25, 'Section D: Logical Reasoning & Aptitude', 'Calendar Logic',
      'If today is Monday, what day of the week will it be after exactly 7 days?',
      'Tuesday',
      'Sunday',
      'Monday',
      'Wednesday',
      'C'
    ],

    // Section E: Workplace Awareness & Communication (5 Simple Questions)
    [
      26, 'Section E: Workplace Awareness & Communication', 'Email Etiquette',
      'What is the most appropriate subject line for an email requesting one day of leave?',
      'Hey check this out',
      'Urgent Leave Request - [Your Name]',
      'No subject',
      'Leave please fast',
      'B'
    ],
    [
      27, 'Section E: Workplace Awareness & Communication', 'Meeting Etiquette',
      'When attending an online team meeting in a noisy room, what should you do when not speaking?',
      'Increase volume to max',
      'Mute your microphone',
      'Disconnect immediately',
      'Keep talking over others',
      'B'
    ],
    [
      28, 'Section E: Workplace Awareness & Communication', 'Task Deadlines',
      'If you realize you cannot complete an assigned task before the deadline, what is the best step to take?',
      'Avoid replying to messages',
      'Inform your team lead in advance and explain the situation',
      'Leave the work unfinished without telling anyone',
      'Blame another team member',
      'B'
    ],
    [
      29, 'Section E: Workplace Awareness & Communication', 'Feedback',
      'How should you respond when receiving constructive feedback on your work?',
      'Listen politely, understand the points, and use them to improve',
      'Argue defensively and refuse to change',
      'Ignore all feedback completely',
      'Leave the organization immediately',
      'A'
    ],
    [
      30, 'Section E: Workplace Awareness & Communication', 'Teamwork',
      'What is the primary benefit of good communication within a team?',
      'It creates confusion',
      'It ensures everyone is aligned and works together smoothly',
      'It increases meeting times unnecessarily',
      'It eliminates the need for testing code',
      'B'
    ],

    // Additional 10 Curated Freshers Questions
    [
      31, 'Section A: HTML', 'Forms & Security',
      'Which input type is used to allow users to securely enter a secret password in an HTML form?',
      'type="text"',
      'type="password"',
      'type="secret"',
      'type="hidden"',
      'B'
    ],
    [
      32, 'Section A: HTML', 'Tables',
      'Which HTML tag is used to define a single row within an HTML data table?',
      '<td>',
      '<th>',
      '<tr>',
      '<row>',
      'C'
    ],
    [
      33, 'Section B: CSS', 'Flexbox',
      'Which CSS display property value turns an element into a flexible flex container?',
      'display: flex',
      'display: block',
      'display: inline',
      'display: grid-flex',
      'A'
    ],
    [
      34, 'Section B: CSS', 'User Interaction',
      'Which CSS pseudo-class is applied when a user hovers their mouse cursor over an element?',
      ':active',
      ':focus',
      ':hover',
      ':visited',
      'C'
    ],
    [
      35, 'Section C: JavaScript', 'Arrays',
      'Which built-in JavaScript method adds one or more elements to the very end of an array?',
      'push()',
      'pop()',
      'shift()',
      'unshift()',
      'A'
    ],
    [
      36, 'Section C: JavaScript', 'Equality Operators',
      'Which comparison operator checks for both identical value and matching data type in JavaScript?',
      '=',
      '==',
      '===',
      '!=',
      'C'
    ],
    [
      37, 'Section D: Logical Reasoning & Aptitude', 'Letter Series',
      'Find the next letter in the sequence: A, C, E, G, ? (+2 letter skip)',
      'H',
      'I',
      'J',
      'K',
      'B'
    ],
    [
      38, 'Section D: Logical Reasoning & Aptitude', 'Ratios',
      'If a basket contains 12 apples and 8 oranges, what is the simplified ratio of apples to oranges?',
      '3:2',
      '2:3',
      '4:3',
      '3:4',
      'A'
    ],
    [
      39, 'Section E: Workplace Awareness & Communication', 'Professional Tone',
      'When communicating with a client or customer over email, what tone should you consistently maintain?',
      'Polite, professional, respectful, and clear',
      'Rude, short, and aggressive',
      'Casual slang with unnecessary emojis',
      'Silent and unhelpful',
      'A'
    ],
    [
      40, 'Section E: Workplace Awareness & Communication', 'Data Confidentiality',
      'If you have access to sensitive client passwords or private business data, what is the required practice?',
      'Share it with friends on social media',
      'Keep it strictly confidential and secure according to company policy',
      'Write it on a shared public whiteboard',
      'Email it to your personal email account',
      'B'
    ]
  ];

  const insertMany = db.transaction((items) => {
    for (const q of items) {
      insertStmt.run(...q);
    }
  });

  insertMany(questions);
  console.log(`✅ Successfully seeded ${questions.length} simplified freshers questions.`);
}


function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@nexis.internal');
  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('NexisAdmin@2026', salt);
    db.prepare(`
      INSERT INTO admins (id, username, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run('admin-default', 'SuperAdmin', 'admin@nexis.internal', hash);
    console.log('✅ Seeded default admin account: admin@nexis.internal / NexisAdmin@2026');
  }
}

export default db;
