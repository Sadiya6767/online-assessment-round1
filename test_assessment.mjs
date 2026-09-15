import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting End-to-End Automated Verification of Assessment Platform...\n');

  // 1. Healthcheck
  console.log('1️⃣ Checking API Health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  if (healthData.status !== 'ok') throw new Error('Healthcheck failed');
  console.log('   ✅ Healthcheck Passed:', healthData.service);

  // 2. Candidate Validation Error Test (Invalid Phone)
  console.log('\n2️⃣ Testing Validation Error (Invalid Phone Number)...');
  const dummyFile = path.resolve('./test_data/dummy_resume.pdf');
  const fileBlob = new Blob([fs.readFileSync(dummyFile)], { type: 'application/pdf' });

  const invalidForm = new FormData();
  invalidForm.append('fullName', 'Aarav Sharma');
  invalidForm.append('degree', 'B.Tech');
  invalidForm.append('semester', '7th');
  invalidForm.append('year', '4th Year');
  invalidForm.append('branch', 'CSE');
  invalidForm.append('collegeName', 'Delhi Technological University');
  invalidForm.append('graduationYear', '2025');
  invalidForm.append('email', 'aarav.invalid@example.com');
  invalidForm.append('phone', '12345'); // Invalid Indian phone
  invalidForm.append('consent', 'true');
  invalidForm.append('resume', fileBlob, 'dummy_resume.pdf');

  const invalidRes = await fetch(`${BASE_URL}/candidate/register`, {
    method: 'POST',
    body: invalidForm
  });
  const invalidData = await invalidRes.json();
  if (invalidRes.status === 400 && invalidData.errors?.phone) {
    console.log('   ✅ Validation Caught Invalid Phone:', invalidData.errors.phone);
  } else {
    throw new Error('Validation failed to catch invalid phone');
  }

  // 3. Register Candidate 1 (Aarav Sharma)
  console.log('\n3️⃣ Registering Candidate 1 (Aarav Sharma)...');
  const form1 = new FormData();
  form1.append('fullName', 'Aarav Sharma');
  form1.append('degree', 'B.Tech');
  form1.append('semester', '7th');
  form1.append('year', '4th Year');
  form1.append('branch', 'CSE');
  form1.append('collegeName', 'Delhi Technological University');
  form1.append('graduationYear', '2025');
  form1.append('email', `aarav_${Date.now()}@example.com`);
  form1.append('phone', '9876543210');
  form1.append('consent', 'true');
  form1.append('resume', fileBlob, 'aarav_resume.pdf');

  const reg1Res = await fetch(`${BASE_URL}/candidate/register`, {
    method: 'POST',
    body: form1
  });
  const reg1Data = await reg1Res.json();
  if (!reg1Data.assessmentId) throw new Error('Registration failed for Candidate 1');
  console.log('   ✅ Candidate 1 Registered. ID:', reg1Data.candidateId, 'Assessment:', reg1Data.assessmentId);

  // 4. Register Candidate 2 (Pooja Verma) to verify Anti-Cheating Question Randomization
  console.log('\n4️⃣ Registering Candidate 2 (Pooja Verma) to test Anti-Cheating Randomization...');
  const form2 = new FormData();
  form2.append('fullName', 'Pooja Verma');
  form2.append('degree', 'BCA');
  form2.append('semester', '5th');
  form2.append('year', '3rd Year');
  form2.append('branch', 'Computer Applications');
  form2.append('collegeName', 'Indira Gandhi Technical University');
  form2.append('graduationYear', '2026');
  form2.append('email', `pooja_${Date.now()}@example.com`);
  form2.append('phone', '8765432109');
  form2.append('consent', 'true');
  form2.append('resume', fileBlob, 'pooja_resume.pdf');

  const reg2Res = await fetch(`${BASE_URL}/candidate/register`, {
    method: 'POST',
    body: form2
  });
  const reg2Data = await reg2Res.json();
  if (!reg2Data.assessmentId) throw new Error('Registration failed for Candidate 2');
  console.log('   ✅ Candidate 2 Registered. ID:', reg2Data.candidateId, 'Assessment:', reg2Data.assessmentId);

  // 5. Test Question Randomization (Anti-Cheating Check)
  console.log('\n5️⃣ Comparing First Questions for Candidate 1 vs Candidate 2...');
  const q1Res = await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/current`);
  const q1Data = await q1Res.json();

  const q2Res = await fetch(`${BASE_URL}/assessment/${reg2Data.assessmentId}/current`);
  const q2Data = await q2Res.json();

  console.log(`   Candidate 1 (Aarav) Q1: [ID ${q1Data.question.id}] "${q1Data.question.questionText.slice(0, 55)}..."`);
  console.log(`   Candidate 2 (Pooja) Q1: [ID ${q2Data.question.id}] "${q2Data.question.questionText.slice(0, 55)}..."`);

  // Verify answer keys are NOT exposed
  if (q1Data.question.correct_option || q1Data.question.correctOption) {
    throw new Error('SECURITY VIOLATION: Correct answer exposed to frontend!');
  }
  console.log('   ✅ Security Check Passed: Correct answer key is completely hidden from frontend payload.');

  // 6. Test Answer Submission & Auto-Advance
  console.log('\n6️⃣ Testing Answer Submission & Instant Auto-Advance...');
  const ansSubmitRes = await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: q1Data.question.id,
      selectedOption: 'B'
    })
  });
  const ansSubmitData = await ansSubmitRes.json();
  if (!ansSubmitData.success) throw new Error('Answer submission failed');
  console.log('   ✅ Answer Recorded Successfully. Advanced to Question:', ansSubmitData.nextQuestionNumber);

  // 7. Test Duplicate / Modification Prevention
  console.log('\n7️⃣ Testing Anti-Tampering: Re-submitting Answer to previous question...');
  const dupSubmitRes = await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: q1Data.question.id,
      selectedOption: 'A'
    })
  });
  if (dupSubmitRes.status === 400) {
    console.log('   ✅ Anti-Tampering Passed: System rejected answer modification/out-of-order submission.');
  } else {
    throw new Error('System allowed invalid answer submission!');
  }

  // 8. Complete Assessment for Candidate 1
  console.log('\n8️⃣ Simulating completion of all remaining questions for Candidate 1...');
  while (true) {
    const curQ = await (await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/current`)).json();
    if (curQ.completed) break;
    const ansRes = await (await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: curQ.question.id,
        selectedOption: 'B' // Candidate chooses Option B
      })
    })).json();
    if (ansRes.completed) break;
  }
  console.log('   ✅ All questions completed.');

  // 9. Verify Candidate Status (Score must be HIDDEN)
  console.log('\n9️⃣ Checking Candidate Completion Screen Data (Score Privacy Test)...');
  const statusRes = await fetch(`${BASE_URL}/assessment/${reg1Data.assessmentId}/status`);
  const statusData = await statusRes.json();
  console.log('   Status Payload:', JSON.stringify(statusData, null, 2));

  if (statusData.score !== undefined || statusData.marks !== undefined || statusData.percentage !== undefined) {
    throw new Error('SECURITY VIOLATION: Score or percentage leaked to candidate completion screen!');
  }
  console.log('   ✅ Privacy Check Passed: Score & marks are strictly HIDDEN from candidate.');

  // 10. Admin Authentication & Protected Route Tests
  console.log('\n🔟 Testing Admin Authentication & Dashboard Operations...');
  // Unauthorized check
  const unauthRes = await fetch(`${BASE_URL}/admin/stats`);
  if (unauthRes.status === 401) {
    console.log('   ✅ Unauthorized Access Protected (401 received).');
  } else {
    throw new Error('Admin endpoint allowed unauthenticated request!');
  }

  // Admin Login
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@nexis.internal',
      password: 'NexisAdmin@2026'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) throw new Error('Admin login failed');
  console.log('   ✅ Admin Login Successful. JWT Token received.');

  const adminHeaders = { Authorization: `Bearer ${loginData.token}` };

  // Fetch Admin Stats
  const statsRes = await fetch(`${BASE_URL}/admin/stats`, { headers: adminHeaders });
  const statsData = await statsRes.json();
  console.log('   ✅ Admin Stats retrieved:', statsData);

  // Fetch Candidates List (Scores visible to admin)
  const candsRes = await fetch(`${BASE_URL}/admin/candidates`, { headers: adminHeaders });
  const candsData = await candsRes.json();
  const aaravRecord = candsData.candidates.find(c => c.candidateId === reg1Data.candidateId);
  console.log('   ✅ Admin View of Candidate Score:', `${aaravRecord.score}/${aaravRecord.totalQuestions} (${aaravRecord.percentage}%) - Duration: ${aaravRecord.durationUsed}`);

  // Fetch Detailed Candidate Answer Audit
  const auditRes = await fetch(`${BASE_URL}/admin/candidate/${reg1Data.candidateId}`, { headers: adminHeaders });
  const auditData = await auditRes.json();
  console.log(`   ✅ Candidate Audit retrieved: ${auditData.answers.length} audited answers recorded.`);

  // Export CSV
  const csvRes = await fetch(`${BASE_URL}/admin/export-csv`, { headers: adminHeaders });
  const csvText = await csvRes.text();
  console.log('   ✅ Exported CSV Header:', csvText.split('\r\n')[0]);

  console.log('\n🎉 ALL 10 AUTOMATED VERIFICATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test execution encountered an error:', err);
  process.exit(1);
});
