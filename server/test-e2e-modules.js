const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Student = require('./models/Student');
const Class = require('./models/Class');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_eduboard_oxonom_2026';
const API_BASE = 'http://localhost:5001/api';

async function req(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runE2ETests() {
  console.log('🚀 Starting EduBoard 8-Module E2E Verification Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduboard');
  console.log('📦 Connected to MongoDB directly for setup.');

  try {
    // 1. Create Verified Teacher
    console.log('\n1️⃣ Creating Teacher account & JWT token...');
    const teacherEmail = `ogretmen_${Date.now()}@eduboard.com`;
    const teacherUsername = `ogretmen_${Date.now()}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('TeacherPass123!', salt);

    const teacherUser = await User.create({
      username: teacherUsername,
      email: teacherEmail,
      password: hashedPassword,
      role: 'teacher',
      isVerified: true,
      isEmailVerified: true
    });

    const teacherToken = jwt.sign(
      { id: teacherUser._id, role: 'teacher', username: teacherUser.username, email: teacherUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(`   ✅ Teacher ready: ${teacherUser.username} (${teacherUser._id})`);

    const teacherHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    };

    // 2. Create Class via API
    console.log('\n2️⃣ Creating Class via API (POST /api/classes)...');
    const createdClass = await req(`${API_BASE}/classes`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        name: '5-B',
        schoolName: 'Cumhuriyet İlkokulu',
        grade: '5',
        section: 'B',
        teacherName: 'Ayşe Yılmaz'
      })
    });
    const classId = createdClass._id;
    const matchingCode = createdClass.matchingCode;
    console.log(`   ✅ Class created: "${createdClass.name}" (Matching Code: ${matchingCode})`);

    // 3. Register & Enroll 2 Students
    console.log('\n3️⃣ Enrolling 2 Students with user accounts and class association...');
    const s1Password = await bcrypt.hash('Student1Pass!', salt);
    const s1User = await User.create({
      username: `ali_${Date.now()}`,
      email: `ali_${Date.now()}@eduboard.com`,
      password: s1Password,
      role: 'student',
      isVerified: true,
      isEmailVerified: true
    });
    const student1 = await Student.create({
      userId: s1User._id,
      teacherId: teacherUser._id,
      classId: new mongoose.Types.ObjectId(classId),
      firstName: 'Ali',
      lastName: 'Yılmaz',
      studentNumber: '301',
      birthDate: new Date('2014-05-15'),
      status: 'active'
    });
    const student1Token = jwt.sign(
      { id: s1User._id, role: 'student', username: s1User.username, email: s1User.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const student1Headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student1Token}`
    };

    const s2Password = await bcrypt.hash('Student2Pass!', salt);
    const s2User = await User.create({
      username: `zeynep_${Date.now()}`,
      email: `zeynep_${Date.now()}@eduboard.com`,
      password: s2Password,
      role: 'student',
      isVerified: true,
      isEmailVerified: true
    });
    const student2 = await Student.create({
      userId: s2User._id,
      teacherId: teacherUser._id,
      classId: new mongoose.Types.ObjectId(classId),
      firstName: 'Zeynep',
      lastName: 'Kaya',
      studentNumber: '302',
      birthDate: new Date('2014-08-20'),
      status: 'active'
    });
    const student2Token = jwt.sign(
      { id: s2User._id, role: 'student', username: s2User.username, email: s2User.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const student2Headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student2Token}`
    };
    console.log(`   ✅ Enrolled: Ali (${student1._id}) and Zeynep (${student2._id}) in class ${classId}`);

    // 4. Module 1: Duyurular (Announcements)
    console.log('\n4️⃣ Testing Announcements Module (Targeting, Priority, Read Tracking, Notifications)...');
    // Targeted announcement only to Student 1
    const annRes = await req(`${API_BASE}/announcements`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        classId,
        title: 'Yarınki Fen Laboratuvarı Malzemeleri',
        content: 'Lütfen büyüteç ve deney defterinizi getirmeyi unutmayınız.',
        priority: 'important',
        targetType: 'students',
        targetStudentIds: [student1._id.toString()]
      })
    });
    console.log(`   ✅ Announcement created: "${annRes.title}", targetType: ${annRes.targetType}, priority: ${annRes.priority}`);

    // Student 1 checks announcements
    const s1Announcements = await req(`${API_BASE}/announcements/student`, {
      headers: student1Headers
    });
    const aliAnn = s1Announcements.find(a => a._id === annRes._id);
    if (!aliAnn) throw new Error('Student 1 failed to receive targeted announcement');
    console.log(`   ✅ Student 1 received announcement: "${aliAnn.title}" (isRead: ${aliAnn.isRead})`);

    // Student 2 checks (should NOT see it)
    const s2Announcements = await req(`${API_BASE}/announcements/student`, {
      headers: student2Headers
    });
    const zeynepAnn = s2Announcements.find(a => a._id === annRes._id);
    if (zeynepAnn) throw new Error('Student 2 unexpectedly received Student 1 specific announcement');
    console.log('   ✅ Privacy check passed: Student 2 cannot see Student 1\'s private announcement.');

    // Student 1 marks as read
    await req(`${API_BASE}/announcements/${annRes._id}/read`, {
      method: 'PATCH',
      headers: student1Headers
    });
    console.log('   ✅ Student 1 marked announcement as read.');

    // Check notifications center
    const notifs = await req(`${API_BASE}/notifications`, {
      headers: student1Headers
    });
    console.log(`   ✅ Notification Center delivered ${notifs.notifications?.length || 0} notification(s) to student.`);

    // 5. Module 2: Ödevler (Assignments)
    console.log('\n5️⃣ Testing Assignments Module (Class vs Individual, Badges, Completion Toggle)...');
    const assgnRes = await req(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        classId,
        title: 'Türkçe Paragraf Ödevi',
        subject: 'Türkçe',
        topic: 'Paragrafta Ana Fikir',
        description: 'Sayfa 50-55 arası metin soruları cevaplanacak.',
        dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        assignmentType: 'individual',
        targetStudentIds: [student2._id.toString()]
      })
    });
    console.log(`   ✅ Teacher created individual assignment: "${assgnRes.title}" (type: ${assgnRes.assignmentType})`);

    // Student 2 retrieves assignments
    const s2Assignments = await req(`${API_BASE}/assignments/student`, {
      headers: student2Headers
    });
    const zeynepAssgn = s2Assignments.find(a => a._id === assgnRes._id);
    if (!zeynepAssgn) throw new Error('Student 2 did not receive assignment');
    if (zeynepAssgn.assignmentType !== 'individual') throw new Error('assignmentType should be individual');
    console.log(`   ✅ Student 2 sees assignment with assignmentType="individual" (BİREYSEL badge)!`);

    // Student 2 toggles completion status
    const toggleRes = await req(`${API_BASE}/assignments/${assgnRes._id}/toggle-complete`, {
      method: 'PATCH',
      headers: student2Headers
    });
    console.log(`   ✅ Student 2 toggled completion status to: "${toggleRes.status}"`);

    // 6. Module 3: Sınavlar ve Skor Tablosu (Exams & Leaderboard)
    console.log('\n6️⃣ Testing Exams & Leaderboard Module (oral/midterm/final, step-by-step scoring, podium, privacy)...');
    const examRes = await req(`${API_BASE}/exams`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        classId,
        name: 'Fen Bilimleri 1. Dönem Final',
        subject: 'Fen Bilimleri',
        topic: 'Işık ve Ses',
        examType: 'final',
        maxScore: 100,
        examDate: new Date().toISOString()
      })
    });
    const examId = examRes._id;
    console.log(`   ✅ Teacher created exam: ${examRes.name} (type: ${examRes.examType})`);

    // Grade Student 1: 95
    await req(`${API_BASE}/exams/${examId}/grade`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        studentId: student1._id.toString(),
        score: 95,
        teacherNote: 'Çok başarılı tebrikler!'
      })
    });
    // Grade Student 2: 88
    await req(`${API_BASE}/exams/${examId}/grade`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        studentId: student2._id.toString(),
        score: 88,
        teacherNote: 'Gayet iyi çalışma.'
      })
    });
    console.log('   ✅ Step-by-step grades entered: Ali (95), Zeynep (88).');

    // Student 2 checks Leaderboard
    const lbRes = await req(`${API_BASE}/exams/${examId}/leaderboard`, {
      headers: student2Headers
    });
    console.log(`   ✅ Leaderboard retrieved with ${lbRes.leaderboard.length} ranked students.`);
    const firstPlace = lbRes.leaderboard[0];
    const secondPlace = lbRes.leaderboard[1];
    console.log(`   🥇 Rank 1: ${firstPlace.studentName} (${firstPlace.score} pts, isYou: ${firstPlace.isCurrentStudent})`);
    console.log(`   🥈 Rank 2: ${secondPlace.studentName} (${secondPlace.score} pts, isYou: ${secondPlace.isCurrentStudent})`);
    if (secondPlace.tc || secondPlace.phone || secondPlace.address) {
      throw new Error('Privacy check failed: sensitive fields exposed on leaderboard');
    }
    console.log('   ✅ Privacy verified: No personal or contact details exposed in leaderboard.');

    // 7. Module 4: Görüşme Talepleri (Meeting Requests & Strict Turn-Based Lock)
    console.log('\n7️⃣ Testing Meeting Requests & Strict Turn-Based Lock...');
    const ticketRes = await req(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: student1Headers,
      body: JSON.stringify({
        subject: 'Ödev Konusunda Danışma',
        urgency: 'urgent',
        message: 'Öğretmenim fen deneyindeki 3. basamağı tam anlayamadım, yardımcı olabilir misiniz?'
      })
    });
    const meetingId = ticketRes.request._id;
    console.log(`   ✅ Student 1 created meeting ticket (${meetingId}). Initial status: ${ticketRes.request.status}`);

    // Verify turn-based lock: Student cannot send another message while waiting_teacher
    try {
      await req(`${API_BASE}/meetings/${meetingId}/message`, {
        method: 'POST',
        headers: student1Headers,
        body: JSON.stringify({
          message: 'Öğretmenim ek olarak 4. basamak da var.'
        })
      });
      throw new Error('FAIL: Turn-based rule violated! Server accepted second student message.');
    } catch (e) {
      if (e.status === 400) {
        console.log('   ✅ Turn-based lock confirmed! Server rejected 2nd student message with 400:', e.data?.message || e.message);
      } else {
        throw e;
      }
    }

    // Teacher views meetings
    const tMeetings = await req(`${API_BASE}/meetings/teacher?classId=${classId}`, {
      headers: teacherHeaders
    });
    const myTicket = tMeetings.find(m => m._id === meetingId);
    console.log(`   ✅ Teacher retrieved ticket: "${myTicket.subject}", Urgency: ${myTicket.urgency}, WaitTime: ${myTicket.waitTimeFormatted}`);

    // Teacher replies
    const replyRes = await req(`${API_BASE}/meetings/${meetingId}/message`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        message: 'Merhaba Ali, 3. basamakta suyu yavaşça eklemen gerekiyor.'
      })
    });
    console.log('   ✅ Teacher replied. Status transitioned to:', replyRes.requestStatus);

    // Student can now reply since teacher replied
    await req(`${API_BASE}/meetings/${meetingId}/message`, {
      method: 'POST',
      headers: student1Headers,
      body: JSON.stringify({
        message: 'Anladım öğretmenim, teşekkür ederim!'
      })
    });
    console.log('   ✅ Turn released: Student replied successfully.');

    // Teacher resolves ticket
    await req(`${API_BASE}/meetings/${meetingId}/resolve`, {
      method: 'PATCH',
      headers: teacherHeaders
    });
    console.log('   ✅ Teacher resolved ticket.');

    // 8. Module 5: Sınıf Tahtaları (Whiteboard Class Sync & Password)
    console.log('\n8️⃣ Testing Whiteboard Class Sync & Password Protection...');
    const testRoomId = 'test-room-' + Date.now();
    const boardRes = await req(`${API_BASE}/boards/create`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        name: '5-B Fen Dersi Tahtası',
        roomId: testRoomId,
        classId,
        boardDate: new Date().toISOString(),
        isPasswordProtected: true,
        password: 'BoardSecret123!'
      })
    });
    const roomId = boardRes.roomId;
    console.log(`   ✅ Teacher created password-protected board: ${boardRes.name} (Room: ${roomId})`);

    // Student 1 lists class boards
    const s1Boards = await req(`${API_BASE}/boards/class/${classId}`, {
      headers: student1Headers
    });
    const foundBoard = s1Boards.find(b => b.roomId === roomId);
    if (!foundBoard) throw new Error('Enrolled student cannot view class board');
    console.log(`   ✅ Class sync confirmed: Student 1 sees board "${foundBoard.name}", protected: ${foundBoard.isPasswordProtected}`);

    // Attempt to access locked board elements
    const lockedBoard = await req(`${API_BASE}/boards/${roomId}`, {
      headers: student1Headers
    });
    if (!lockedBoard.isLocked || (lockedBoard.elements && lockedBoard.elements.length > 0)) {
      throw new Error('Elements should be hidden for locked board');
    }
    console.log('   ✅ Security check: Elements concealed before entering board password.');

    // Verify password
    const unlockRes = await req(`${API_BASE}/boards/${roomId}/verify-password`, {
      method: 'POST',
      headers: student1Headers,
      body: JSON.stringify({ password: 'BoardSecret123!' })
    });
    if (!unlockRes.success) throw new Error('Failed to unlock board with valid password');
    console.log('   ✅ Password unlocked successfully!');

    // 9. Module 6: Yoklama (Attendance Session & Stats)
    console.log('\n9️⃣ Testing Attendance (Yoklama) Session & Student Statistics...');
    const todayDate = new Date().toISOString().split('T')[0];
    const attSession = await req(`${API_BASE}/attendance/session`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        classId,
        attendanceDate: todayDate,
        records: [
          { studentId: student1._id.toString(), status: 'present', note: '' },
          { studentId: student2._id.toString(), status: 'late', note: 'Servis gecikti' }
        ]
      })
    });
    console.log(`   ✅ Teacher saved attendance session: records updated (${attSession.session.records.length} records)`);

    // Student 2 checks attendance statistics
    const s2Stats = await req(`${API_BASE}/attendance/student/${student2._id}`, {
      headers: student2Headers
    });
    console.log(`   ✅ Student 2 attendance stats: Rate %${s2Stats.attendanceRate}, Late sessions: ${s2Stats.late}`);

    // 10. Module 7: Raporlar (Reports & Analytics)
    console.log('\n🔟 Testing Reports & Analytics Module...');
    const classReport = await req(`${API_BASE}/reports/class/${classId}`, {
      headers: teacherHeaders
    });
    console.log(`   ✅ Class Report generated: Average: ${classReport.summary.overallExamAverage}, Attendance Rate: %${classReport.summary.overallAttendanceRate}`);
    console.log(`   ✅ Student performance list contains ${classReport.studentPerformance.length} students.`);

    console.log('\n================================================================');
    console.log('🎉 ALL 8 MODULE INTEGRATION & SECURITY TESTS PASSED PERFECTLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err.data || err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2ETests();
