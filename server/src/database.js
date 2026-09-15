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
      interested_profile TEXT NOT NULL DEFAULT 'Web Development cum Sales Engineer',
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

  // Safe migration for existing SQLite DB
  try {
    db.exec("ALTER TABLE candidates ADD COLUMN interested_profile TEXT DEFAULT 'Web Development cum Sales Engineer'");
  } catch (e) {
    // Column already exists
  }

  // 2. Assessments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      assessment_name TEXT NOT NULL DEFAULT 'Round 1 – Assessment',
      start_time DATETIME,
      deadline DATETIME,
      submission_time DATETIME,
      current_question_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      question_sequence TEXT NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 50,
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
      target_profile TEXT NOT NULL DEFAULT 'COMMON',
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

  // Safe migration for existing questions table
  try {
    db.exec("ALTER TABLE questions ADD COLUMN target_profile TEXT DEFAULT 'COMMON'");
  } catch (e) {
    // Column already exists
  }

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
  db.exec('DELETE FROM questions;');

  const insertStmt = db.prepare(`
    INSERT INTO questions (id, target_profile, section, topic, question_text, option_a, option_b, option_c, option_d, correct_option)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const questions = [
    // ==========================================
    // COMMON: Section A: HTML (8 Questions)
    // ==========================================
    [
      1, 'COMMON', 'Section A: HTML', 'HTML Basics',
      'What does HTML stand for?',
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Hyper Transfer Markup Link',
      'Home Tool Management Language',
      'A'
    ],
    [
      2, 'COMMON', 'Section A: HTML', 'Hyperlinks',
      'Which HTML tag is used to create a clickable hyperlink?',
      '<link>',
      '<a>',
      '<href>',
      '<url>',
      'B'
    ],
    [
      3, 'COMMON', 'Section A: HTML', 'Images',
      'Which HTML element is used to display an image on a webpage?',
      '<picture>',
      '<image>',
      '<img>',
      '<src>',
      'C'
    ],
    [
      4, 'COMMON', 'Section A: HTML', 'Headings',
      'Which tag is used to define the largest heading in HTML?',
      '<h6>',
      '<head>',
      '<h1>',
      '<heading>',
      'C'
    ],
    [
      5, 'COMMON', 'Section A: HTML', 'Lists',
      'Which HTML tag is used to create an unordered (bulleted) list?',
      '<ol>',
      '<ul>',
      '<li>',
      '<list>',
      'B'
    ],
    [
      6, 'COMMON', 'Section A: HTML', 'Forms & Security',
      'Which input type is used to allow users to securely enter a secret password in an HTML form?',
      'type="text"',
      'type="password"',
      'type="secret"',
      'type="hidden"',
      'B'
    ],
    [
      7, 'COMMON', 'Section A: HTML', 'Tables',
      'Which HTML tag is used to define a single row within an HTML data table?',
      '<td>',
      '<th>',
      '<tr>',
      '<row>',
      'C'
    ],
    [
      8, 'COMMON', 'Section A: HTML', 'Semantic Elements',
      'Which HTML5 semantic tag is best suited to represent the primary navigation links of a website?',
      '<nav>',
      '<menu>',
      '<links>',
      '<navigate>',
      'A'
    ],

    // ==========================================
    // COMMON: Section B: CSS (8 Questions)
    // ==========================================
    [
      9, 'COMMON', 'Section B: CSS', 'CSS Basics',
      'What does CSS stand for?',
      'Creative Style Sheets',
      'Computer Style Sheets',
      'Cascading Style Sheets',
      'Colorful Style System',
      'C'
    ],
    [
      10, 'COMMON', 'Section B: CSS', 'Colors',
      'Which CSS property is used to change the text color of an element?',
      'font-color',
      'text-color',
      'color',
      'style-color',
      'C'
    ],
    [
      11, 'COMMON', 'Section B: CSS', 'Typography',
      'Which CSS property is used to control the size of text?',
      'font-size',
      'text-style',
      'text-size',
      'font-weight',
      'A'
    ],
    [
      12, 'COMMON', 'Section B: CSS', 'Box Model',
      'Which property adds space inside an element, between the content and its border?',
      'margin',
      'padding',
      'spacing',
      'border-spacing',
      'B'
    ],
    [
      13, 'COMMON', 'Section B: CSS', 'Selectors',
      'In CSS, which symbol is used to select an element by its unique ID?',
      '. (dot)',
      '# (hash)',
      '@ (at sign)',
      '* (asterisk)',
      'B'
    ],
    [
      14, 'COMMON', 'Section B: CSS', 'Flexbox',
      'Which CSS display property value turns an element into a flexible flex container?',
      'display: flex',
      'display: block',
      'display: inline',
      'display: grid-flex',
      'A'
    ],
    [
      15, 'COMMON', 'Section B: CSS', 'User Interaction',
      'Which CSS pseudo-class is applied when a user hovers their mouse cursor over an element?',
      ':active',
      ':focus',
      ':hover',
      ':visited',
      'C'
    ],
    [
      16, 'COMMON', 'Section B: CSS', 'Rounded Corners',
      'Which CSS property is used to create rounded border corners on a card or button?',
      'corner-round',
      'border-radius',
      'curve',
      'edge-radius',
      'B'
    ],

    // ==========================================
    // COMMON: Section C: JavaScript (9 Questions)
    // ==========================================
    [
      17, 'COMMON', 'Section C: JavaScript', 'Variables',
      'Which keyword is used to declare a variable that can be reassigned in modern JavaScript?',
      'const',
      'let',
      'static',
      'fixed',
      'B'
    ],
    [
      18, 'COMMON', 'Section C: JavaScript', 'Console Output',
      'Which built-in method is commonly used to print output to the browser console?',
      'console.print()',
      'console.log()',
      'print.console()',
      'system.out.print()',
      'B'
    ],
    [
      19, 'COMMON', 'Section C: JavaScript', 'Data Types',
      'What does the expression typeof "Hello World" return in JavaScript?',
      'string',
      'text',
      'character',
      'object',
      'A'
    ],
    [
      20, 'COMMON', 'Section C: JavaScript', 'Comments',
      'Which symbol is used for single-line comments in JavaScript?',
      '<!-- -->',
      '/* */',
      '//',
      '##',
      'C'
    ],
    [
      21, 'COMMON', 'Section C: JavaScript', 'JSON Parsing',
      'Which method converts a JSON string into a JavaScript object?',
      'JSON.toString()',
      'JSON.parse()',
      'JSON.objectify()',
      'JSON.stringify()',
      'B'
    ],
    [
      22, 'COMMON', 'Section C: JavaScript', 'Arrays',
      'Which built-in JavaScript method adds one or more elements to the very end of an array?',
      'push()',
      'pop()',
      'shift()',
      'unshift()',
      'A'
    ],
    [
      23, 'COMMON', 'Section C: JavaScript', 'Equality Operators',
      'Which comparison operator checks for both identical value and matching data type in JavaScript?',
      '=',
      '==',
      '===',
      '!=',
      'C'
    ],
    [
      24, 'COMMON', 'Section C: JavaScript', 'Functions',
      'Which keyword is used to declare a standard reusable function in JavaScript?',
      'def',
      'func',
      'function',
      'method',
      'C'
    ],
    [
      25, 'COMMON', 'Section C: JavaScript', 'Dialogs',
      'Which built-in JavaScript method displays a modal popup box with a message and an OK button?',
      'alert()',
      'popup()',
      'msg()',
      'dialog()',
      'A'
    ],

    // =======================================================
    // COMMON: Section D: Logical Reasoning & Aptitude (15 Qs)
    // =======================================================
    [
      26, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Number Series',
      'Find the next number in the sequence: 2, 4, 8, 16, ?',
      '24',
      '32',
      '30',
      '64',
      'B'
    ],
    [
      27, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Percentages',
      'If a product costs ₹500 and is sold with a 10% discount, what is the final selling price?',
      '₹450',
      '₹400',
      '₹480',
      '₹490',
      'A'
    ],
    [
      28, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Speed & Distance',
      'A car travels 120 kilometers in 2 hours. What is its average speed in km/h?',
      '50 km/h',
      '60 km/h',
      '70 km/h',
      '80 km/h',
      'B'
    ],
    [
      29, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Arithmetic',
      'Solve the mathematical expression using order of operations: 5 + 3 * 2 = ?',
      '16',
      '11',
      '13',
      '10',
      'B'
    ],
    [
      30, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Coding-Decoding',
      'In a code language, if CAT is written as DBU (+1 shift), how is DOG written?',
      'EPH',
      'ENH',
      'FOH',
      'EPI',
      'A'
    ],
    [
      31, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Patterns',
      'Look at this number pattern: 36, 34, 30, 28, 24, ? (alternating -2 and -4). What comes next?',
      '20',
      '22',
      '23',
      '26',
      'B'
    ],
    [
      32, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Profit Calculation',
      'A shopkeeper buys a notebook for ₹20 and sells it for ₹25. What is the profit earned?',
      '₹3',
      '₹5',
      '₹10',
      '₹2.5',
      'B'
    ],
    [
      33, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Divisibility',
      'Which of the following numbers is completely divisible by 5?',
      '32',
      '43',
      '45',
      '51',
      'C'
    ],
    [
      34, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Odd One Out',
      'Find the odd one out from the following options:',
      'Apple',
      'Mango',
      'Carrot',
      'Banana',
      'C'
    ],
    [
      35, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Calendar Logic',
      'If today is Monday, what day of the week will it be after exactly 7 days?',
      'Tuesday',
      'Sunday',
      'Monday',
      'Wednesday',
      'C'
    ],
    [
      36, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Letter Series',
      'Find the next letter in the sequence: A, C, E, G, ? (+2 letter skip)',
      'H',
      'I',
      'J',
      'K',
      'B'
    ],
    [
      37, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Ratios',
      'If a basket contains 12 apples and 8 oranges, what is the simplified ratio of apples to oranges?',
      '3:2',
      '2:3',
      '4:3',
      '3:4',
      'A'
    ],
    [
      38, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Time & Work',
      'If 1 worker can paint a room in 4 hours, how many hours will 2 workers take working together at the same rate?',
      '8 hours',
      '4 hours',
      '2 hours',
      '1 hour',
      'C'
    ],
    [
      39, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Averages',
      'What is the arithmetic mean (average) of the numbers 10, 20, and 30?',
      '15',
      '20',
      '25',
      '30',
      'B'
    ],
    [
      40, 'COMMON', 'Section D: Logical Reasoning & Aptitude', 'Blood Relations',
      'If A is the brother of B, and B is the sister of C, how is A related to C?',
      'Brother',
      'Sister',
      'Father',
      'Uncle',
      'A'
    ],

    // =========================================================================
    // PROFILE 1: Web Development cum Sales Engineer (10 Questions: IDs 101-110)
    // =========================================================================
    [
      101, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Discovery Calls',
      'In a B2B technical sales discovery call, what is the primary goal of a Sales Engineer?',
      'Immediately push the client to buy without asking questions',
      'Understand the client business pain points, workflows, and technical requirements',
      'Criticize the client existing software loudly',
      'Offer a 90% discount on the spot',
      'B'
    ],
    [
      102, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Solution Architecture',
      'What is the purpose of a Proof of Concept (POC) in technology sales?',
      'To send an invoice before development starts',
      'To demonstrate that the proposed solution technically solves the client specific requirements',
      'To terminate the commercial relationship',
      'To replace all user manuals with source code',
      'B'
    ],
    [
      103, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Proposals & RFP',
      'What does the acronym RFP commonly stand for in technology procurement?',
      'Request for Proposal',
      'Return Financial Payment',
      'Registered Federal Partner',
      'Rapid Framework Protocol',
      'A'
    ],
    [
      104, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Pricing Models',
      'Which SaaS pricing model charges enterprise clients according to their actual API calls or compute usage?',
      'Flat rate annual fee',
      'Usage-based / Metered pricing',
      'Perpetual single-user license',
      'Ad-supported free tier',
      'B'
    ],
    [
      105, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Objection Handling',
      'When an enterprise client expresses concern about data security in your web platform, what should you do?',
      'Ignore the question and switch to talking about UI colors',
      'Present security compliance certifications (e.g., ISO, SOC 2) and explain encryption standards',
      'Tell the client that cybersecurity is unnecessary',
      'End the meeting abruptly',
      'B'
    ],
    [
      106, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'CRM Systems',
      'What is the primary function of a CRM (Customer Relationship Management) platform like Salesforce or HubSpot?',
      'To compile and build React applications',
      'To track leads, manage customer interactions, and monitor sales pipelines',
      'To create vector logos and graphics',
      'To run SQL database migrations',
      'B'
    ],
    [
      107, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Upselling vs Cross-selling',
      'What is the difference between upselling and cross-selling in technical services?',
      'Upselling upgrades a customer to a higher plan; cross-selling recommends complementary add-on tools',
      'Upselling cancels a contract; cross-selling refunds money',
      'Both mean offering free services indefinitely',
      'Upselling is exclusively for hardware sales',
      'A'
    ],
    [
      108, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'SLA Agreements',
      'What does a Service Level Agreement (SLA) define in a technology contract?',
      'The personal hobbies of the development team',
      'The agreed uptime percentage, system performance criteria, and support resolution times',
      'The marketing slogans of the company',
      'The physical dimensions of the client office',
      'B'
    ],
    [
      109, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Value Communication',
      'When pitching web architecture to a non-technical CEO, what should a Sales Engineer emphasize most?',
      'Complex low-level assembly language instructions',
      'Business ROI, cost savings, customer conversion impact, and operational speed',
      'Reading raw database schemas line by line',
      'Technical jargon without context',
      'B'
    ],
    [
      110, 'SALES_ENGINEER', 'Section E: Sales & Solutions Engineering', 'Sales Pipeline',
      'In a typical enterprise technology sales cycle, which phase immediately precedes final contract signing and closing?',
      'Cold lead generation',
      'Proposal negotiation and procurement review',
      'Initial cold calling',
      'Employee onboarding',
      'B'
    ],

    // =========================================================================
    // PROFILE 2: Web Development cum HR Recruiter (10 Questions: IDs 201-210)
    // =========================================================================
    [
      201, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Technical Sourcing',
      'Which platform is most popular for sourcing and reviewing the actual open-source repositories and code commits of software developers?',
      'Pinterest',
      'GitHub',
      'Instagram',
      'Snapchat',
      'B'
    ],
    [
      202, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Resume Screening',
      'When screening resumes for a Frontend Web Developer role, which combination of skills is most relevant?',
      'Forklift operation and inventory logistics',
      'HTML, CSS, JavaScript, and modern web frameworks (React, Vue)',
      'Tax auditing and corporate ledger management',
      'Clinical medicine and surgical assistance',
      'B'
    ],
    [
      203, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Job Descriptions',
      'What is the primary purpose of a comprehensive Job Description (JD)?',
      'To confuse prospective job seekers',
      'To clearly define role responsibilities, required qualifications, tech stack, and evaluation benchmarks',
      'To list internal employee confidential salaries',
      'To serve as an official resignation letter',
      'B'
    ],
    [
      204, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Structured Interviews',
      'What defines a "Structured Interview" in human resource recruitment?',
      'An interview conducted without any questions prepared',
      'A standardized process where all candidates for the same role are evaluated using consistent, job-related questions and scorecards',
      'A casual, unrecorded chat about non-work topics',
      'An interview where only the salary is discussed',
      'B'
    ],
    [
      205, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Compensation & CTC',
      'What does the acronym CTC stand for in employee recruitment and offer letters?',
      'Cost to Company',
      'Certified Talent Committee',
      'Central Technical Candidate',
      'Corporate Training Certificate',
      'A'
    ],
    [
      206, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Candidate Engagement',
      'What is the most effective way for a recruiter to minimize candidate ghosting and offer declines?',
      'Stop replying to candidate queries after the first call',
      'Maintain proactive, transparent communication and provide timely stage updates throughout the hiring cycle',
      'Threaten candidates with legal notices',
      'Delay issuing offer letters by multiple months',
      'B'
    ],
    [
      207, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'HR Ethics & Diversity',
      'During an employment interview, which question violates standard professional HR hiring ethics?',
      'Can you describe a complex technical feature you developed recently?',
      'What programming languages are you most comfortable using?',
      'What is your religion, caste, and marital status?',
      'How do you manage deadlines when collaborating across teams?',
      'C'
    ],
    [
      208, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Onboarding',
      'What is the primary objective of a structured employee onboarding program?',
      'To assign critical production tasks on day one without orientation',
      'To help new hires quickly understand company values, tech workflows, tools, and team expectations',
      'To reduce the employee starting compensation',
      'To isolate the new hire from other team members',
      'B'
    ],
    [
      209, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'HR Metrics',
      'What does the recruitment metric "Time-to-Hire" measure?',
      'The daily working hours logged by a software engineer',
      'The total number of days elapsed between job opening publication and offer acceptance',
      'The length of an employee lunch break',
      'The time taken by an applicant to fill out an application form',
      'B'
    ],
    [
      210, 'HR_RECRUITER', 'Section E: HR Recruitment & Talent Acquisition', 'Referral Programs',
      'Why are employee referral programs highly recommended in technology recruitment?',
      'They eliminate the need for conducting technical evaluations',
      'They frequently yield higher-retention candidates, better cultural fit, and shorter hiring cycles',
      'They are legally mandated for all IT companies',
      'They allow companies to hire without paying salaries',
      'B'
    ],

    // =========================================================================
    // PROFILE 3: Web Development cum Digital Marketing (10 Questions: IDs 301-310)
    // =========================================================================
    [
      301, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'SEO Fundamentals',
      'What is the primary objective of Search Engine Optimization (SEO)?',
      'To increase paid advertising expenses on social media',
      'To improve a website organic rankings and visibility on search engine result pages',
      'To permanently block search engines from crawling your website',
      'To design offline print flyers and banners',
      'B'
    ],
    [
      302, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Web Analytics',
      'Which analytics platform is standard for tracking web visitors, traffic sources, user engagement, and custom conversions?',
      'Google Keep',
      'Google Analytics 4 (GA4)',
      'Google Translate',
      'Google Meet',
      'B'
    ],
    [
      303, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'PPC Advertising',
      'What does PPC stand for in performance digital marketing?',
      'Pay-Per-Click',
      'Page Production Cost',
      'Post Platform Conversion',
      'Private Partner Channel',
      'A'
    ],
    [
      304, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Performance Metrics',
      'In digital advertising, what does Click-Through Rate (CTR) measure?',
      'The percentage of ad impressions that resulted in a user click',
      'The time taken for a web server to respond',
      'The cost of registering a new domain name',
      'The screen brightness of the user device',
      'A'
    ],
    [
      305, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Conversion Optimization',
      'What is a Call to Action (CTA) on a web landing page?',
      'A clear prompt (such as "Start Free Trial" or "Book a Demo") guiding visitors to take a desired action',
      'An automated error notification when the server fails',
      'A billing invoice sent to the client',
      'The website footer copyright disclaimer',
      'A'
    ],
    [
      306, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Keyword Research',
      'What is a "Long-Tail Keyword" in search engine optimization?',
      'A single broad keyword with extremely high search volume and high competition',
      'A specific multi-word search phrase targeted at users with high conversion intent',
      'A broken internal website link',
      'A deprecated HTML tag',
      'B'
    ],
    [
      307, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Meta Ads',
      'Which technology enables retargeting previous website visitors on Meta (Facebook/Instagram) advertising platforms?',
      'Meta Pixel / Conversions API tracking snippet',
      'Random IP address guessing',
      'Email spam filters',
      'FTP file upload',
      'A'
    ],
    [
      308, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Email Marketing',
      'What is an automated "Email Drip Campaign"?',
      'Sending the exact same email 50 times in one hour to a single recipient',
      'A scheduled sequence of automated relevant emails triggered by user actions or timeline milestones',
      'Deleting unsubscribed contacts without confirmation',
      'Writing manual emails from personal accounts one by one',
      'B'
    ],
    [
      309, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'A/B Testing',
      'What is the purpose of A/B Testing in website conversion rate optimization?',
      'Testing if the letter A looks better than B in a headline font',
      'Comparing two variants of a webpage or ad to see which generates higher conversions scientifically',
      'Reformatting the database schema twice',
      'Testing different internet router brands',
      'B'
    ],
    [
      310, 'DIGITAL_MARKETING', 'Section E: Digital Marketing & Web Analytics', 'Technical SEO',
      'Which file placed in the web server root directory directs search engine crawlers on which URLs they can or cannot access?',
      'robots.txt',
      'styles.css',
      'app.js',
      'README.md',
      'A'
    ]
  ];

  const insertMany = db.transaction((items) => {
    for (const q of items) {
      insertStmt.run(...q);
    }
  });

  insertMany(questions);
  console.log(`✅ Successfully seeded ${questions.length} total questions (40 Common + 10 Sales + 10 HR + 10 Marketing).`);
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
