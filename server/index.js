const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const { JWT_SECRET } = require('./config/jwt');
const authRoutes = require('./routes/auth');
const Board = require('./models/Board');
const SavedBoard = require('./models/SavedBoard');
const User = require('./models/User');
const Class = require('./models/Class');
const Student = require('./models/Student');
const Guardian = require('./models/Guardian');
const Notification = require('./models/Notification');
const { validateTCKN, encryptTC, maskTC, hashTC } = require('./utils/tckn');
const verifyToken = require('./utils/verifyToken');
const verifyOwnership = require('./utils/verifyOwnership');
const bcrypt = require('bcryptjs');
const { seedDemoData, initDemoAutoReset, getDemoStatus, setAutoResetEnabled } = require('./services/demoService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity, restrict in prod
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await Student.collection.dropIndex('userId_1');
    } catch (e) {}
    await Student.syncIndexes().catch(() => {});

    // 30-Minute Auto-Reset Demo Mode Initialization
    initDemoAutoReset();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running! 🚀',
    message: 'EduBoard API Server',
    endpoints: {
      auth: '/api/auth',
      upload: '/api/upload',
      uploads: '/uploads'
    },
    timestamp: new Date().toISOString()
  });
});

// Demo Mode Endpoints
app.get('/api/demo/status', async (req, res) => {
  try {
    const status = await getDemoStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching demo status', error: err.message });
  }
});

app.post('/api/demo/reset', async (req, res) => {
  try {
    const result = await seedDemoData();
    res.json({ message: 'Demo ortamı başarıyla en güncel haliyle sıfırlandı.', ...result });
  } catch (err) {
    console.error('Demo reset error:', err);
    res.status(500).json({ message: 'Demo sıfırlama hatası', error: err.message });
  }
});

app.post('/api/demo/auto-reset', async (req, res) => {
  try {
    const { enabled } = req.body;
    const status = await setAutoResetEnabled(enabled);
    res.json({ 
      message: enabled 
        ? 'Demo otomatik sıfırlama açıldı ve ortam en güncel haliyle sıfırlandı.' 
        : 'Demo otomatik sıfırlama kapatıldı. Artık değişiklikler korunacak.', 
      ...status 
    });
  } catch (err) {
    console.error('Demo auto-reset toggle error:', err);
    res.status(500).json({ message: 'Otomatik sıfırlama ayarı değiştirilemedi', error: err.message });
  }
});

// Auto-detect LAN IP for mobile QR code pairing
app.get('/api/network-ip', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== '127.0.0.1') break;
    }
    res.json({ ip: localIp, port: 5173 });
  } catch (err) {
    res.json({ ip: '192.168.1.15', port: 5173 });
  }
});

// Routes
app.use('/api/auth', authRoutes);
const imageRoutes = require('./routes/imageRoutes');
app.use('/api/images', imageRoutes);
const verificationRoutes = require('./routes/verificationRoutes');
app.use('/api/verification', verificationRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);
const teacherRoutes = require('./routes/teacherRoutes');
app.use('/api/teachers', teacherRoutes);
const internalRoutes = require('./routes/internalRoutes');
app.use('/api/internal', internalRoutes);

// 🌟 NEW CONTACT ROUTE ADDED HERE 🌟
const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);

// 🌟 NEW ENTERPRISE MODULES 🌟
const announcementRoutes = require('./routes/announcementRoutes');
app.use('/api/announcements', announcementRoutes);
const assignmentRoutes = require('./routes/assignmentRoutes');
app.use('/api/assignments', assignmentRoutes);
const examRoutes = require('./routes/examRoutes');
app.use('/api/exams', examRoutes);
const meetingRoutes = require('./routes/meetingRoutes');
app.use('/api/meetings', meetingRoutes);
const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', reportRoutes);
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);
const moduleRoutes = require('./routes/moduleRoutes');
app.use('/api/modules', moduleRoutes);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static Uploads
app.use('/uploads', express.static(uploadsDir));

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// Multer Config with file type validation, size limit, and sanitized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\.\.\//g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName);
    const baseName = path.basename(safeName, ext).slice(0, 100);
    cb(null, Date.now() + '-' + baseName + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Upload Endpoint
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum size is 5 MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

// Board Management Endpoints

// Create a new named board (requires authentication)
app.post('/api/boards/create', verifyToken, async (req, res) => {
  try {
    const { name, roomId, classId, isPasswordProtected, password, boardDate } = req.body;
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.status(401).json({ message: 'Invalid authentication state' });
    }

    if (!mongoose.Types.ObjectId.isValid(authUserId)) {
      return res.status(400).json({ message: 'Invalid authenticated user ID' });
    }

    if (!name || !roomId) {
      return res.status(400).json({ message: 'Name and roomId are required' });
    }

    const userExists = await User.exists({ _id: authUserId });
    if (!userExists) {
      return res.status(404).json({ message: 'Authenticated user not found' });
    }

    let validClassId = null;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      const classDoc = await Class.findOne({
        _id: classId,
        ...(req.user.role === 'admin' ? {} : { teacherId: authUserId })
      });
      if (classDoc) {
        validClassId = classDoc._id;
      }
    }

    let passwordHash = null;
    if (isPasswordProtected && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const newBoard = new Board({
      roomId,
      name,
      createdBy: authUserId,
      classId: validClassId,
      isPasswordProtected: !!isPasswordProtected,
      passwordHash,
      boardDate: boardDate ? new Date(boardDate) : new Date(),
      elements: [],
      participants: [{
        userId: authUserId,
        role: 'teacher', // Creator is assumed to be teacher
        joinedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newBoard.save();
    res.status(201).json({
      roomId: newBoard.roomId,
      name: newBoard.name,
      createdAt: newBoard.createdAt,
      boardDate: newBoard.boardDate,
      isPasswordProtected: newBoard.isPasswordProtected,
      classId: newBoard.classId
    });
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(500).json({ message: 'Failed to create board' });
  }
});

// Get all boards for a specific user (teachers: boards they created) - requires authentication and ownership
app.get('/api/boards/user/:userId', verifyToken, verifyOwnership('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    // Find boards created by this user (for teachers)
    const boards = await Board.find({
      createdBy: userId
    })
      .populate('createdBy', 'username email')
      .populate('classId', 'name grade section schoolName')
      .select('roomId name createdBy createdAt updatedAt color order classId isPasswordProtected boardDate groupTitle elements')
      .sort({ createdAt: -1 });

    res.json(boards);
  } catch (err) {
    console.error('Error fetching user boards:', err);
    res.status(500).json({ message: 'Failed to fetch boards' });
  }
});

// Get specific board details (requires authentication)
app.get('/api/boards/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const board = await Board.findOne({ roomId })
      .populate('classId', 'name grade section schoolName teacherName enabledModules')
      .populate('createdBy', 'username email');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Authorization: If board belongs to a class and requester is a student, enforce class membership
    if (board.classId && req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      const boardClassId = board.classId._id ? board.classId._id.toString() : board.classId.toString();
      if (!student || !student.classId || student.classId.toString() !== boardClassId) {
        return res.status(403).json({ message: 'Bu ders tahtasına erişim yetkiniz bulunmamaktadır.' });
      }
    }

    const hostId = board.createdBy?._id ? board.createdBy._id.toString() : board.createdBy?.toString();
    const isOwner = hostId === req.user.id.toString();
    const isPrivileged = isOwner || req.user.role === 'admin';
    const isLocked = !!board.isPasswordProtected && !isPrivileged;

    res.json({
      roomId: board.roomId,
      name: board.name,
      classId: board.classId,
      createdBy: board.createdBy,
      boardDate: board.boardDate || board.createdAt,
      color: board.color,
      order: board.order,
      elements: isLocked ? [] : board.elements,
      isPasswordProtected: !!board.isPasswordProtected,
      isLocked,
      hostId: board.createdBy?._id || board.createdBy,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt
    });
  } catch (err) {
    console.error('Error fetching board:', err);
    res.status(500).json({ message: 'Failed to fetch board' });
  }
});

// Verify board password and unlock elements
app.post('/api/boards/:roomId/verify-password', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Tahta bulunamadı' });
    }

    if (!board.isPasswordProtected) {
      return res.json({ success: true, elements: board.elements });
    }

    if (!password) {
      return res.status(400).json({ message: 'Şifre gereklidir' });
    }

    const isMatch = await bcrypt.compare(password, board.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Hatalı şifre girdiniz. Lütfen tekrar deneyin.', error: 'INVALID_BOARD_PASSWORD' });
    }

    res.json({ success: true, elements: board.elements });
  } catch (err) {
    console.error('Password verify error:', err);
    res.status(500).json({ message: 'Şifre doğrulanamadı' });
  }
});

// Delete a board (requires authentication and ownership)
app.delete('/api/boards/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id; // Get userId from JWT token, not query params

    // Find and delete the board only if it belongs to the user
    const result = await Board.findOneAndDelete({
      roomId,
      createdBy: userId
    });

    if (!result) {
      return res.status(404).json({ message: 'Board not found or unauthorized' });
    }

    // Notify all users in the room that the board was deleted
    io.to(roomId).emit('board-deleted', {
      roomId: roomId,
      message: 'This board has been deleted'
    });

    res.json({ message: 'Board deleted successfully' });
  } catch (err) {
    console.error('Error deleting board:', err);
    res.status(500).json({ message: 'Failed to delete board' });
  }
});

// Delete a board by MongoDB _id (for orphaned boards) - requires authentication
app.delete('/api/boards/by-id/:boardId', verifyToken, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { force } = req.query;
    const userId = req.user.id; // Get userId from JWT token
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Authenticated user not found' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isAdmin = user.role === 'admin';
    const isOwner = board.createdBy && board.createdBy.toString() === userId;

    if (force === 'true') {
      if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden: force delete requires admin privileges' });
      }
    } else if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden: not authorized to delete this board' });
    }

    const result = await Board.findByIdAndDelete(boardId);

    // Notify all users in the room that the board was deleted
    if (result.roomId) {
      io.to(result.roomId).emit('board-deleted', {
        roomId: result.roomId,
        message: 'This board has been deleted'
      });
    }

    res.json({ message: 'Board deleted successfully' });
  } catch (err) {
    console.error('Error deleting board by ID:', err);
    res.status(500).json({ message: 'Failed to delete board' });
  }
});

// Update a board (rename, color, order, classId)
app.patch('/api/boards/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { name, color, order, classId } = req.body;

    const updateFields = { updatedAt: new Date() };
    if (name !== undefined) updateFields.name = name.trim();
    if (color !== undefined) updateFields.color = color;
    if (order !== undefined) updateFields.order = order;
    if (classId !== undefined) {
      if (classId === null || classId === '') {
        updateFields.classId = null;
      } else if (mongoose.Types.ObjectId.isValid(classId)) {
        const classDoc = await Class.findOne({
          _id: classId,
          ...(req.user.role === 'admin' ? {} : { teacherId: userId })
        });
        if (classDoc) {
          updateFields.classId = classDoc._id;
        }
      }
    }

    // Check teacher board first
    const teacherQuery = req.user.role === 'admin' ? { roomId } : { roomId, createdBy: userId };
    let board = await Board.findOneAndUpdate(
      teacherQuery,
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!board) {
      // Check if student's saved board
      const savedUpdate = {};
      if (name !== undefined) savedUpdate.boardName = name.trim();
      if (color !== undefined) savedUpdate.color = color;
      if (order !== undefined) savedUpdate.order = order;

      const savedQuery = req.user.role === 'admin' ? { roomId } : { roomId, userId };
      const savedBoard = await SavedBoard.findOneAndUpdate(
        savedQuery,
        { $set: savedUpdate },
        { returnDocument: 'after' }
      );
      if (!savedBoard) {
        return res.status(404).json({ message: 'Board not found or unauthorized' });
      }
      return res.json(savedBoard);
    }

    res.json(board);
  } catch (err) {
    console.error('Error updating board:', err);
    res.status(500).json({ message: 'Failed to update board' });
  }
});

// Batch reorder boards for a user
app.put('/api/boards/reorder', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { boardOrders } = req.body; // [{ roomId, order }]

    if (Array.isArray(boardOrders) && boardOrders.length > 0) {
      const bulkOps = boardOrders.map(item => ({
        updateOne: {
          filter: { roomId: item.roomId, createdBy: userId },
          update: { $set: { order: item.order } }
        }
      }));
      await Board.bulkWrite(bulkOps);

      // Also try SavedBoard for students
      const studentBulkOps = boardOrders.map(item => ({
        updateOne: {
          filter: { roomId: item.roomId, userId },
          update: { $set: { order: item.order } }
        }
      }));
      await SavedBoard.bulkWrite(studentBulkOps);
    }

    res.json({ success: true, message: 'Boards reordered successfully' });
  } catch (err) {
    console.error('Error reordering boards:', err);
    res.status(500).json({ message: 'Failed to reorder boards' });
  }
});

// --- Class & Student Management Endpoints ---

// Get all boards of a class (teachers & enrolled students)
app.get('/api/boards/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }

    if (req.user.role === 'student') {
      let student = await Student.findOne({ userId });
      if (!student) {
        student = await Student.findOne({ email: req.user.email?.toLowerCase() });
        if (student) {
          student.userId = userId;
          await student.save();
        }
      }

      if (!student || !student.classId || student.classId.toString() !== classId.toString()) {
        return res.status(403).json({ message: 'Bu sınıfa ait tahtalara erişim yetkiniz bulunmamaktadır.' });
      }

      const classObjId = mongoose.Types.ObjectId.isValid(classId)
        ? new mongoose.Types.ObjectId(classId)
        : classId;

      const boards = await Board.find({
        $or: [
          { classId: classObjId },
          { classId: classId.toString() }
        ]
      })
        .populate('createdBy', 'username email')
        .select('roomId name createdBy createdAt updatedAt color order classId isPasswordProtected boardDate groupTitle')
        .sort({ order: 1, updatedAt: -1 });
      return res.json(boards);
    }

    const classDoc = await Class.findOne({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId: userId })
    });
    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }
    const boards = await Board.find({
      createdBy: userId,
      classId
    })
      .populate('createdBy', 'username email')
      .select('roomId name createdBy createdAt updatedAt color order classId isPasswordProtected boardDate groupTitle elements')
      .sort({ createdAt: -1 });
    res.json(boards);
  } catch (err) {
    console.error('Error fetching class boards:', err);
    res.status(500).json({ message: 'Failed to fetch class boards' });
  }
});

// Dedicated endpoint for enrolled students to get all their active class boards
app.get('/api/boards/student/my-boards', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let student = await Student.findOne({ userId });

    // Auto-heal if student record is unlinked
    if (!student && req.user.role === 'student') {
      const user = await User.findById(userId);
      if (user) {
        student = await Student.findOne({ email: user.email?.toLowerCase() });
        if (student) {
          student.userId = user._id;
          await student.save();
        } else {
          const firstClass = await Class.findOne({ isActive: { $ne: false } }).sort({ createdAt: 1 });
          if (firstClass) {
            student = new Student({
              userId: user._id,
              teacherId: firstClass.teacherId,
              classId: firstClass._id,
              firstName: user.username || 'Öğrenci',
              lastName: 'Hesabı',
              studentNumber: '100',
              birthDate: new Date('2014-01-01'),
              email: user.email,
              status: 'active'
            });
            await student.save();
          }
        }
      }
    }

    if (!student || !student.classId) {
      return res.json([]);
    }

    const classObjId = mongoose.Types.ObjectId.isValid(student.classId) 
      ? new mongoose.Types.ObjectId(student.classId) 
      : student.classId;

    const boards = await Board.find({
      $or: [
        { classId: classObjId },
        { classId: student.classId.toString() }
      ]
    })
      .populate('createdBy', 'username email')
      .select('roomId name createdBy createdAt updatedAt color order classId isPasswordProtected boardDate groupTitle elements')
      .sort({ createdAt: -1 });

    res.json(boards);
  } catch (err) {
    console.error('Error fetching student boards:', err);
    res.status(500).json({ message: 'Tahtalar yüklenemedi' });
  }
});

// Update group / folder title for a specific date
app.patch('/api/boards/group-title', verifyToken, async (req, res) => {
  try {
    const { date, groupTitle, classId } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Tarih parametresi zorunludur' });
    }
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      $or: [
        { boardDate: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    };
    if (classId) {
      filter.classId = classId;
    }
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user.id;
    }

    const trimmed = (groupTitle || '').trim();
    await Board.updateMany(filter, { 
      $set: { 
        groupTitle: trimmed,
        boardDate: startOfDay 
      } 
    });
    res.json({ success: true, groupTitle: trimmed });
  } catch (err) {
    console.error('Error updating board group title:', err);
    res.status(500).json({ message: 'Klasör başlığı güncellenemedi' });
  }
});

// Get all unassigned boards (teachers: boards where classId is null or missing)
app.get('/api/boards/unassigned/list', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const boards = await Board.find({
      createdBy: userId,
      $or: [{ classId: null }, { classId: { $exists: false } }]
    })
      .select('roomId name createdBy createdAt updatedAt color order classId isPasswordProtected boardDate groupTitle elements')
      .sort({ createdAt: -1 });
    res.json(boards);
  } catch (err) {
    console.error('Error fetching unassigned boards:', err);
    res.status(500).json({ message: 'Failed to fetch unassigned boards' });
  }
});

// Get all classes for a teacher (with studentCount and boardCount)
app.get('/api/classes', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const classesQuery = req.user.role === 'admin'
      ? {}
      : {
          $or: [
            { teacherId: teacherId },
            { teacherId: new mongoose.Types.ObjectId(teacherId) }
          ]
        };
    const classes = await Class.find(classesQuery).sort({ createdAt: -1 });

    const classIds = classes.map(c => c._id);

    // Count students per class
    const studentCounts = await Student.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } }
    ]);
    const studentCountMap = {};
    studentCounts.forEach(sc => {
      studentCountMap[sc._id.toString()] = sc.count;
    });

    // Count boards per class
    const boardCounts = await Board.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } }
    ]);
    const boardCountMap = {};
    boardCounts.forEach(bc => {
      boardCountMap[bc._id.toString()] = bc.count;
    });

    const enriched = classes.map(c => ({
      ...c.toObject(),
      studentCount: studentCountMap[c._id.toString()] || 0,
      boardCount: boardCountMap[c._id.toString()] || 0
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// Create a new class
app.post('/api/classes', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { schoolName, grade, section, academicYear, name, description, color, teacherName } = req.body;

    if (!schoolName || !grade || !section) {
      return res.status(400).json({ message: 'Okul adı, sınıf ve şube zorunludur' });
    }

    const cleanGrade = String(grade).trim();
    const cleanSection = String(section).trim().toUpperCase();
    const cleanSchool = String(schoolName).trim();
    const cleanYear = academicYear ? String(academicYear).trim() : '2024-2025';
    const cleanName = name ? String(name).trim() : `${cleanGrade}-${cleanSection}`;

    let resolvedTeacherName = teacherName ? String(teacherName).trim() : '';
    if (!resolvedTeacherName) {
      const teacherUser = await User.findById(teacherId);
      resolvedTeacherName = teacherUser?.username || 'Öğretmen';
    }

    let matchingCode = Class.generateMatchingCode(cleanGrade, cleanSection);
    while (await Class.findOne({ matchingCode })) {
      matchingCode = Class.generateMatchingCode(cleanGrade, cleanSection);
    }

    const newClass = new Class({
      teacherId,
      schoolName: cleanSchool,
      teacherName: resolvedTeacherName,
      grade: cleanGrade,
      section: cleanSection,
      academicYear: cleanYear,
      name: cleanName,
      description: description ? String(description).trim() : '',
      color: color || '#6366f1',
      matchingCode,
      isActive: true
    });

    await newClass.save();
    res.status(201).json({
      ...newClass.toObject(),
      studentCount: 0,
      boardCount: 0
    });
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ message: 'Failed to create class' });
  }
});

// Lookup class by matchingCode (Public for student registration step 1)
app.get('/api/classes/lookup/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ message: 'Eşleşme kodu gereklidir.' });
    }

    const classDoc = await Class.findOne({ matchingCode: code, isActive: { $ne: false } });
    if (!classDoc) {
      return res.status(404).json({ message: 'Bu eşleşme koduna ait aktif bir sınıf bulunamadı.' });
    }

    res.json({
      classId: classDoc._id,
      schoolName: classDoc.schoolName,
      grade: classDoc.grade,
      section: classDoc.section,
      name: classDoc.name,
      teacherName: classDoc.teacherName || 'Öğretmen',
      matchingCode: classDoc.matchingCode
    });
  } catch (err) {
    console.error('Error looking up class by code:', err);
    res.status(500).json({ message: 'Sınıf aranırken hata oluştu.' });
  }
});

// Regenerate class matchingCode (Teachers only)
app.post('/api/classes/:classId/regenerate-code', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    const classDoc = await Class.findOne({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId })
    });

    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkiniz yok.' });
    }

    let newCode = Class.generateMatchingCode(classDoc.grade, classDoc.section);
    while (await Class.findOne({ matchingCode: newCode })) {
      newCode = Class.generateMatchingCode(classDoc.grade, classDoc.section);
    }

    classDoc.matchingCode = newCode;
    await classDoc.save();

    res.json({
      matchingCode: newCode,
      message: 'Sınıf eşleşme kodu başarıyla yenilendi.'
    });
  } catch (err) {
    console.error('Error regenerating matching code:', err);
    res.status(500).json({ message: 'Eşleşme kodu yenilenirken bir hata oluştu.' });
  }
});

// Get class details by ID
app.get('/api/classes/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }
    const classDoc = await Class.findOne({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId })
    });
    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }
    const studentCount = await Student.countDocuments({ classId });
    const boardCount = await Board.countDocuments({ classId, createdBy: teacherId });
    res.json({
      ...classDoc.toObject(),
      studentCount,
      boardCount
    });
  } catch (err) {
    console.error('Error fetching class details:', err);
    res.status(500).json({ message: 'Failed to fetch class details' });
  }
});

// Update class details
app.patch('/api/classes/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }
    const {
      schoolName,
      teacherName,
      grade,
      section,
      academicYear,
      name,
      description,
      color,
      isActive
    } = req.body;

    const updateFields = { updatedAt: new Date() };
    if (schoolName !== undefined) updateFields.schoolName = String(schoolName).trim();
    if (teacherName !== undefined) updateFields.teacherName = String(teacherName).trim();
    if (grade !== undefined) updateFields.grade = String(grade).trim();
    if (section !== undefined) updateFields.section = String(section).trim().toUpperCase();
    if (academicYear !== undefined) updateFields.academicYear = String(academicYear).trim();
    if (name !== undefined) updateFields.name = String(name).trim();
    if (description !== undefined) updateFields.description = String(description).trim();
    if (color !== undefined) updateFields.color = color;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

    const filter = { _id: classId };
    if (req.user.role !== 'admin') {
      filter.$or = [
        { teacherId: teacherId },
        { teacherId: new mongoose.Types.ObjectId(teacherId) }
      ];
    }

    const updatedClass = await Class.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    if (!updatedClass) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }
    const studentCount = await Student.countDocuments({ classId });
    const boardCount = await Board.countDocuments({ classId });
    res.json({
      ...updatedClass.toObject(),
      studentCount,
      boardCount
    });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// Delete class (unassigns boards safely to null, unassigns student profiles)
app.delete('/api/classes/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }
    const classDoc = await Class.findOneAndDelete({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId })
    });
    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }
    // Bağlı tahtaları silme, sınıflandırılmamış alana taşı
    await Board.updateMany(
      { classId: classId },
      { $set: { classId: null } }
    );
    // Öğrencileri silme! Sınıfsız/unassigned durumuna geçir ki yeniden eşleşebilsinler
    await Student.updateMany(
      { classId: classId },
      { $set: { classId: null, teacherId: null, status: 'unassigned', grade: '', section: '' } }
    );
    res.json({ message: 'Sınıf silindi, bağlı tahtalar ve öğrenciler korundu (öğrenciler eşleştirme bekliyor)' });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ message: 'Failed to delete class' });
  }
});

// Get students of a class
app.get('/api/classes/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }
    const classDoc = await Class.findOne({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId })
    });
    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }
    const students = await Student.find({ classId })
      .populate('userId', 'username email isVerified')
      .sort({ firstName: 1, lastName: 1 });
    const studentIds = students.map(s => s._id);
    const guardians = await Guardian.find({ studentId: { $in: studentIds } }).sort({ orderIndex: 1 });

    const enrichedStudents = students.map(s => {
      const sObj = s.toObject();
      const sGuardians = guardians.filter(g => g.studentId.toString() === s._id.toString());
      sObj.guardians = sGuardians;
      if (sGuardians.length > 0) {
        sObj.parent1 = {
          name: sGuardians[0].fullName,
          relationship: sGuardians[0].relationship,
          phone: sGuardians[0].phonePrimary,
          phoneSecondary: sGuardians[0].phoneSecondary
        };
      }
      if (sGuardians.length > 1) {
        sObj.parent2 = {
          name: sGuardians[1].fullName,
          relationship: sGuardians[1].relationship,
          phone: sGuardians[1].phonePrimary,
          phoneSecondary: sGuardians[1].phoneSecondary
        };
      }
      return sObj;
    });

    res.json(enrichedStudents);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// Get students by classId query parameter
app.get('/api/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.query;
    if (!classId) {
      return res.status(400).json({ message: 'classId parametresi zorunludur' });
    }
    const filter = mongoose.Types.ObjectId.isValid(classId)
      ? { $or: [{ classId: new mongoose.Types.ObjectId(classId) }, { classId: classId.toString() }] }
      : { classId: classId.toString() };

    const students = await Student.find(filter)
      .populate('userId', 'username email isVerified')
      .sort({ firstName: 1, lastName: 1 });
    const studentIds = students.map(s => s._id);
    const guardians = await Guardian.find({ studentId: { $in: studentIds } }).sort({ orderIndex: 1 });

    const enrichedStudents = students.map(s => {
      const sObj = s.toObject();
      const sGuardians = guardians.filter(g => g.studentId.toString() === s._id.toString());
      sObj.guardians = sGuardians;
      if (sGuardians.length > 0) {
        sObj.parent1 = {
          name: sGuardians[0].fullName,
          relationship: sGuardians[0].relationship,
          phone: sGuardians[0].phonePrimary,
          phoneSecondary: sGuardians[0].phoneSecondary
        };
      }
      if (sGuardians.length > 1) {
        sObj.parent2 = {
          name: sGuardians[1].fullName,
          relationship: sGuardians[1].relationship,
          phone: sGuardians[1].phonePrimary,
          phoneSecondary: sGuardians[1].phoneSecondary
        };
      }
      return sObj;
    });

    res.json(enrichedStudents);
  } catch (err) {
    console.error('Error fetching students by query:', err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// Check match endpoint (Privacy-preserving pre-check for student registration)
app.get('/api/students/check-match', async (req, res) => {
  try {
    const { studentNumber, schoolNumber, email, pairingCode } = req.query;
    const trimmedNum = (studentNumber || '').trim();
    const trimmedSchoolNo = (schoolNumber || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCode = (pairingCode || '').trim().toUpperCase();

    let matched = false;

    if (trimmedCode) {
      const found = await Student.findOne({ pairingCode: trimmedCode, userId: null });
      if (found) matched = true;
    }

    if (!matched && (trimmedNum || trimmedSchoolNo || trimmedEmail)) {
      const orConditions = [];
      if (trimmedNum) {
        orConditions.push({ studentNumber: trimmedNum });
        orConditions.push({ schoolNumber: trimmedNum });
      }
      if (trimmedSchoolNo) {
        orConditions.push({ schoolNumber: trimmedSchoolNo });
        orConditions.push({ studentNumber: trimmedSchoolNo });
      }
      if (trimmedEmail) {
        orConditions.push({ email: trimmedEmail });
      }

      const found = await Student.findOne({
        userId: null,
        $or: orConditions
      });
      if (found) matched = true;
    }

    res.json({ matched });
  } catch (err) {
    console.error('Error checking student match:', err);
    res.status(500).json({ matched: false });
  }
});

// Get current student profile
app.get('/api/students/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let student = await Student.findOne({ userId })
      .populate('classId', 'name grade section academicYear color description schoolName teacherName matchingCode')
      .populate('pendingClassId', 'name grade section academicYear color description schoolName teacherName matchingCode')
      .populate('teacherId', 'username email');

    if (!student && req.user.role === 'student') {
      const user = await User.findById(userId);
      if (user) {
        student = await Student.findOne({ email: user.email?.toLowerCase() });
        if (student) {
          student.userId = user._id;
          await student.save();
        } else {
          // If no student profile, link to first active class so student isn't orphaned
          const firstClass = await Class.findOne({ isActive: { $ne: false } }).sort({ createdAt: 1 });
          student = new Student({
            userId: user._id,
            teacherId: firstClass?.teacherId || null,
            classId: firstClass?._id || null,
            firstName: user.username || 'Öğrenci',
            lastName: 'Hesabı',
            studentNumber: '100',
            birthDate: new Date('2014-01-01'),
            email: user.email,
            status: 'active'
          });
          await student.save();
        }
        student = await Student.findById(student._id)
          .populate('classId', 'name grade section academicYear color description schoolName teacherName matchingCode')
          .populate('pendingClassId', 'name grade section academicYear color description schoolName teacherName matchingCode')
          .populate('teacherId', 'username email');
      }
    }

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci profili bulunamadı' });
    }

    const guardians = await Guardian.find({ studentId: student._id }).sort({ orderIndex: 1 });
    const sObj = student.toObject();
    sObj.guardians = guardians;
    if (guardians.length > 0) {
      sObj.parent1 = {
        name: guardians[0].fullName,
        relationship: guardians[0].relationship,
        phone: guardians[0].phonePrimary,
        phoneSecondary: guardians[0].phoneSecondary
      };
    }
    if (guardians.length > 1) {
      sObj.parent2 = {
        name: guardians[1].fullName,
        relationship: guardians[1].relationship,
        phone: guardians[1].phonePrimary,
        phoneSecondary: guardians[1].phoneSecondary
      };
    }

    res.json(sObj);
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ message: 'Profil yüklenemedi' });
  }
});

// Pair student with invitation / matching code
app.post('/api/students/pair', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const inputCode = (req.body.matchingCode || req.body.pairingCode || '').trim().toUpperCase();

    if (!inputCode) {
      return res.status(400).json({ message: 'Lütfen geçerli bir sınıf eşleştirme kodu girin' });
    }

    // 1. First, check if inputCode matches a Class matchingCode
    const classDoc = await Class.findOne({ matchingCode: inputCode, isActive: { $ne: false } });
    if (classDoc) {
      let student = await Student.findOne({ userId });
      if (!student) {
        const user = await User.findById(userId);
        student = new Student({
          userId,
          firstName: user?.username || 'Öğrenci',
          lastName: 'Hesabı',
          email: user?.email || '',
          studentNumber: '100',
          birthDate: new Date('2014-01-01')
        });
      }

      if (!student.lastName) {
        student.lastName = 'Hesabı';
      }

      // Check if already active in this class
      if (student.classId && student.classId.toString() === classDoc._id.toString() && student.status === 'active') {
        return res.json({
          success: true,
          message: `Zaten "${classDoc.name || `${classDoc.grade}/${classDoc.section}`}" sınıfına dahilsiniz!`,
          student
        });
      }

      // Set student status to pending
      student.pendingClassId = classDoc._id;
      student.status = 'pending';
      student.teacherId = classDoc.teacherId;
      student.grade = classDoc.grade;
      student.section = classDoc.section;
      if (classDoc.schoolName) student.schoolName = classDoc.schoolName;
      await student.save();

      const studentDisplayName = `${student.firstName} ${student.lastName || ''}`.trim() || 'Öğrenci';
      const classDisplayName = classDoc.name || `${classDoc.grade}/${classDoc.section}`;

      // Notify the teacher
      if (classDoc.teacherId) {
        const existingNotif = await Notification.findOne({
          userId: classDoc.teacherId,
          type: 'class_join_request',
          'data.studentId': student._id,
          'data.classId': classDoc._id,
          actionStatus: 'pending'
        });

        if (!existingNotif) {
          await Notification.create({
            userId: classDoc.teacherId,
            type: 'class_join_request',
            title: 'Sınıf Eşleşme Talebi',
            message: `${studentDisplayName} öğrencisi ${classDisplayName} sınıfı için eşleşme talebi iletti.`,
            actionStatus: 'pending',
            referenceType: 'Student',
            referenceId: student._id,
            data: {
              studentId: student._id,
              classId: classDoc._id,
              studentName: studentDisplayName,
              className: classDisplayName,
              studentNumber: student.studentNumber || ''
            }
          });
        }
      }

      const populated = await Student.findById(student._id)
        .populate('classId', 'name grade section academicYear color description schoolName teacherName matchingCode')
        .populate('pendingClassId', 'name grade section academicYear color description schoolName teacherName matchingCode')
        .populate('teacherId', 'username email');

      return res.json({
        success: true,
        pending: true,
        message: 'Eşleşme talebi öğretmene iletildi. Onaylandıktan sonra sınıfa dahil edileceksiniz',
        student: populated
      });
    }

    // 2. Otherwise, check if inputCode is an individual Student pairingCode
    const targetStudent = await Student.findOne({ pairingCode: inputCode });
    if (targetStudent) {
      if (targetStudent.userId && targetStudent.userId.toString() !== userId.toString()) {
        return res.status(400).json({ message: 'Bu eşleştirme kodu başka bir öğrenci tarafından kullanılmış.' });
      }

      // Clean up empty unassigned profile if exists
      const existingUnassigned = await Student.findOne({ userId, classId: null });
      if (existingUnassigned && existingUnassigned._id.toString() !== targetStudent._id.toString()) {
        await Student.deleteOne({ _id: existingUnassigned._id });
      }

      targetStudent.userId = new mongoose.Types.ObjectId(userId);
      if (targetStudent.status !== 'frozen') {
        targetStudent.status = 'active';
      }
      await targetStudent.save();

      const populated = await Student.findById(targetStudent._id)
        .populate('classId', 'name grade section academicYear color description schoolName teacherName matchingCode')
        .populate('teacherId', 'username email');

      return res.json({
        success: true,
        message: 'Sınıfınızla başarıyla eşleştirildiniz!',
        student: populated
      });
    }

    return res.status(404).json({
      message: 'Geçersiz eşleştirme kodu. Lütfen öğretmeninizden sınıf eşleştirme kodunuzu talep ediniz.'
    });
  } catch (err) {
    console.error('Error pairing student:', err);
    res.status(500).json({ message: 'Eşleştirme sırasında bir hata oluştu' });
  }
});

// Add a student to a class
app.post('/api/classes/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Geçersiz sınıf ID' });
    }
    const classDoc = await Class.findOne({
      _id: classId,
      ...(req.user.role === 'admin' ? {} : { teacherId: new mongoose.Types.ObjectId(teacherId) })
    });
    if (!classDoc) {
      return res.status(404).json({ message: 'Sınıf bulunamadı veya yetkisiz' });
    }

    const {
      firstName,
      lastName,
      studentNumber,
      schoolNumber,
      schoolName,
      gender,
      birthDate,
      phone,
      email,
      notes,
      parent1,
      parent2,
      parentName,
      parentRelationship,
      parentPhone,
      parentEmail,
      parentNotes
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'Öğrenci adı ve soyadı zorunludur' });
    }

    // Build parent1 (Mandatory) and parent2 (Optional)
    const p1 = parent1 || {
      name: parentName ? String(parentName).trim() : '',
      relationship: parentRelationship ? String(parentRelationship).trim() : 'Anne',
      phone: parentPhone ? String(parentPhone).trim() : '',
      email: parentEmail ? String(parentEmail).trim() : '',
      notes: parentNotes ? String(parentNotes).trim() : ''
    };
    if (!p1.name && parentName) p1.name = String(parentName).trim();

    if (!p1.name || !p1.name.trim()) {
      return res.status(400).json({ message: '1. Veli adı ve soyadı zorunludur' });
    }

    const p2 = parent2 || {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      notes: ''
    };

    let parsedBirthDate = undefined;
    if (birthDate) {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime())) {
        parsedBirthDate = d;
      }
    }

    const trimmedNum = studentNumber ? String(studentNumber).trim() : '';
    const trimmedEmail = email ? String(email).trim().toLowerCase() : (parentEmail ? String(parentEmail).trim().toLowerCase() : '');

    // SENARYO 4: Check if unassigned student profile already exists (Prevent duplicate!)
    let existingStudent = null;
    if (trimmedNum || trimmedEmail) {
      const orConditions = [];
      if (trimmedNum) orConditions.push({ studentNumber: trimmedNum });
      if (trimmedEmail) orConditions.push({ email: trimmedEmail });

      existingStudent = await Student.findOne({
        $or: orConditions,
        $and: [
          { $or: [{ classId: null }, { status: 'unassigned' }] }
        ]
      });
    }

    if (existingStudent) {
      // Attach to teacher and class without duplicate!
      existingStudent.classId = new mongoose.Types.ObjectId(classId);
      existingStudent.teacherId = new mongoose.Types.ObjectId(teacherId);
      existingStudent.status = 'active';
      existingStudent.firstName = String(firstName).trim();
      existingStudent.lastName = String(lastName).trim();
      if (trimmedNum) existingStudent.studentNumber = trimmedNum;
      if (schoolNumber) existingStudent.schoolNumber = String(schoolNumber).trim();
      if (gender) existingStudent.gender = gender;
      if (parsedBirthDate) existingStudent.birthDate = parsedBirthDate;
      if (phone) existingStudent.phone = String(phone).trim();
      if (notes) existingStudent.notes = String(notes).trim();
      existingStudent.parent1 = p1;
      if (p2.name) existingStudent.parent2 = p2;

      await existingStudent.save();
      return res.status(201).json(existingStudent);
    }

    const newStudent = new Student({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      classId: new mongoose.Types.ObjectId(classId),
      status: 'active',
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      studentNumber: trimmedNum,
      schoolNumber: schoolNumber ? String(schoolNumber).trim() : '',
      schoolName: schoolName ? String(schoolName).trim() : '',
      gender: gender || '',
      birthDate: parsedBirthDate,
      phone: phone ? String(phone).trim() : '',
      email: trimmedEmail,
      notes: notes ? String(notes).trim() : '',
      parent1: p1,
      parent2: p2
    });

    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ message: err.message || 'Failed to create student' });
  }
});

// Update student details
app.patch('/api/students/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Geçersiz öğrenci ID' });
    }

    const existingStudent = await Student.findOne({
      _id: studentId,
      ...(req.user.role === 'admin' ? {} : { teacherId: new mongoose.Types.ObjectId(teacherId) })
    });

    if (!existingStudent) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı veya yetkisiz' });
    }

    const updateData = { updatedAt: new Date(), ...req.body };
    delete updateData._id;
    delete updateData.teacherId;

    // Sınıf Değiştirme (Class Transfer)
    if (req.body.classId && String(req.body.classId) !== String(existingStudent.classId)) {
      if (!mongoose.Types.ObjectId.isValid(req.body.classId)) {
        return res.status(400).json({ message: 'Geçersiz hedef sınıf ID' });
      }
      const targetClassDoc = await Class.findOne({
        _id: req.body.classId,
        ...(req.user.role === 'admin' ? {} : { teacherId: new mongoose.Types.ObjectId(teacherId) })
      });
      if (!targetClassDoc) {
        return res.status(403).json({ message: 'Hedef sınıf bulunamadı veya bu sınıfa yetkiniz yok' });
      }
      updateData.classId = new mongoose.Types.ObjectId(req.body.classId);
    }

    // Kayıt Dondurma & Aktifleştirme
    if (req.body.status === 'frozen') {
      if (!req.body.freezeReason || !String(req.body.freezeReason).trim()) {
        return res.status(400).json({ message: 'Kayıt dondurulurken dondurulma sebebi belirtilmelidir' });
      }
      updateData.status = 'frozen';
      updateData.freezeReason = String(req.body.freezeReason).trim();
    } else if (req.body.status === 'active') {
      updateData.status = 'active';
      updateData.freezeReason = '';
    }

    // Tarih parsing
    if (updateData.birthDate) {
      const d = new Date(updateData.birthDate);
      updateData.birthDate = isNaN(d.getTime()) ? null : d;
    } else if (updateData.birthDate === '' || updateData.birthDate === null) {
      updateData.birthDate = null;
    }

    // 1. ve 2. Veli güncellemesi
    if (req.body.parent1) {
      updateData.parent1 = {
        name: req.body.parent1.name ? String(req.body.parent1.name).trim() : existingStudent.parent1?.name || '',
        relationship: req.body.parent1.relationship ? String(req.body.parent1.relationship).trim() : existingStudent.parent1?.relationship || 'Anne',
        phone: req.body.parent1.phone ? String(req.body.parent1.phone).trim() : existingStudent.parent1?.phone || '',
        email: req.body.parent1.email ? String(req.body.parent1.email).trim() : existingStudent.parent1?.email || '',
        notes: req.body.parent1.notes ? String(req.body.parent1.notes).trim() : existingStudent.parent1?.notes || ''
      };
    }
    if (req.body.parent2) {
      updateData.parent2 = {
        name: req.body.parent2.name ? String(req.body.parent2.name).trim() : '',
        relationship: req.body.parent2.relationship ? String(req.body.parent2.relationship).trim() : '',
        phone: req.body.parent2.phone ? String(req.body.parent2.phone).trim() : '',
        email: req.body.parent2.email ? String(req.body.parent2.email).trim() : '',
        notes: req.body.parent2.notes ? String(req.body.parent2.notes).trim() : ''
      };
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: studentId, ...(req.user.role === 'admin' ? {} : { teacherId: new mongoose.Types.ObjectId(teacherId) }) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    res.json(updatedStudent);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ message: err.message || 'Failed to update student' });
  }
});

// Delete student
app.delete('/api/students/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Geçersiz öğrenci ID' });
    }
    const student = await Student.findOneAndDelete({
      _id: studentId,
      ...(req.user.role === 'admin' ? {} : { teacherId })
    });
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı veya yetkisiz' });
    }
    res.json({ message: 'Öğrenci kaydı silindi' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ message: 'Failed to delete student' });
  }
});

// Saved Boards Endpoints (for students)

// Save a board (creates independent copy for student) - requires authentication
app.post('/api/boards/save', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from JWT token
    const { roomId, boardName, teacherName, elements } = req.body;

    // Check if already saved
    const existing = await SavedBoard.findOne({ userId, roomId });
    if (existing) {
      return res.status(400).json({ message: 'Board already saved' });
    }

    const savedBoard = new SavedBoard({
      userId,
      roomId,
      boardName,
      teacherName,
      elements,
      savedAt: new Date()
    });

    await savedBoard.save();
    res.status(201).json({ message: 'Board saved successfully', savedBoard });
  } catch (err) {
    console.error('Error saving board:', err);
    res.status(500).json({ message: 'Failed to save board' });
  }
});

// Get all saved boards for a student (requires authentication and ownership)
app.get('/api/boards/saved/:userId', verifyToken, verifyOwnership('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const savedBoards = await SavedBoard.find({ userId })
      .sort({ savedAt: -1 });

    res.json(savedBoards);
  } catch (err) {
    console.error('Error fetching saved boards:', err);
    res.status(500).json({ message: 'Failed to fetch saved boards' });
  }
});

// Delete a saved board (student removes from their dashboard) - requires authentication and ownership
app.delete('/api/boards/saved/:savedBoardId', verifyToken, async (req, res) => {
  try {
    const { savedBoardId } = req.params;
    const userId = req.user.id; // Get userId from JWT token

    const result = await SavedBoard.findOneAndDelete({
      _id: savedBoardId,
      userId // Ensure user can only delete their own saved boards
    });

    if (!result) {
      return res.status(404).json({ message: 'Saved board not found' });
    }

    res.json({ message: 'Saved board deleted successfully' });
  } catch (err) {
    console.error('Error deleting saved board:', err);
    res.status(500).json({ message: 'Failed to delete saved board' });
  }
});


// Track connected users per room
const roomUsers = new Map(); // roomId -> Map of userId -> { username, socketId, role }
const waitingRooms = new Map(); // roomId -> Map of socketId -> userData

// Socket.IO Authentication Middleware
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id; // Attach user ID to socket
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

// Helper functions for Socket.IO Authorization
const isTeacher = async (roomId, userId) => {
  try {
    const board = await Board.findOne({ roomId });
    return board && board.createdBy.toString() === userId;
  } catch (err) {
    return false;
  }
};

const isAuthorizedToEdit = async (roomId, userId) => {
  try {
    const board = await Board.findOne({ roomId });
    if (!board) return false;
    if (board.createdBy && board.createdBy.toString() === userId) return true;
    if (board.allowStudentEditing) return true;
    if (board.allowedStudents && board.allowedStudents.some(id => id.toString() === userId)) return true;
    const user = await User.findById(userId);
    if (user && (user.role === 'teacher' || user.role === 'admin')) return true;
    return false;
  } catch (err) {
    return false;
  }
};

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'User ID:', socket.userId);

  socket.on('join-room', async (roomId, userData) => {
    console.log(`User ${socket.id} trying to join room ${roomId}`, userData);

    let isHost = false;
    let board = null;
    try {
      board = await Board.findOne({ roomId });
      if (board && userData && board.createdBy.toString() === userData.userId) {
        isHost = true;
      }
    } catch (err) {
      console.error('Error finding board for host check:', err);
    }

    // Join room directly and notify client
    socket.join(roomId);
    socket.emit('join-accepted');
    console.log(`User ${socket.id} (${isHost ? 'Host' : 'Participant'}) joined room ${roomId}`, userData);

    // Track user in room (only if userData is provided)
    if (userData && userData.userId) {
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      roomUsers.get(roomId).set(userData.userId, {
        userId: userData.userId,
        username: userData.username,
        socketId: socket.id,
        role: userData.role
      });

      // Broadcast updated user list to all users in room
      const users = Array.from(roomUsers.get(roomId).values());
      io.to(roomId).emit('room-users-updated', users);

      // Add user as participant in board (so it appears in their dashboard)
      try {
        await Board.findOneAndUpdate(
          { roomId },
          {
            $addToSet: {
              participants: {
                userId: userData.userId,
                role: userData.role,
                joinedAt: new Date()
              }
            }
          },
          { upsert: false } // Don't create board if it doesn't exist
        );
        console.log(`[PARTICIPANT] Added ${userData.username} (${userData.role}) to board ${roomId}`);
      } catch (err) {
        console.error('Error adding participant:', err);
      }
    }

    // Load Board History with allowed students
    try {
      let board = await Board.findOne({ roomId })
        .populate('allowedStudents', 'username email')
        .populate('createdBy', 'username');

      if (board) {
        const hostId = board.createdBy?._id?.toString() || board.createdBy?.toString();
        const isHost = (userData && userData.userId && hostId === userData.userId) || (socket.user && (socket.user.role === 'teacher' || socket.user.role === 'admin'));
        const isLockedForUser = !!board.isPasswordProtected && !isHost;

        socket.emit('load-board', {
          elements: isLockedForUser ? [] : board.elements,
          allowedStudents: board.allowedStudents || [],
          allowStudentEditing: board.allowStudentEditing || false, // FIX #95: send persisted toggle state to client
          boardName: board.name,
          hostId: hostId,
          teacherName: board.createdBy?.username || 'Unknown Teacher',
          isLocked: isLockedForUser
        });
      } else {
        socket.emit('load-board', {
          elements: [],
          allowedStudents: [],
          boardName: 'Untitled Board',
          hostId: null,
          teacherName: 'Unknown Teacher'
        });
      }
    } catch (err) {
      console.error('Error loading board:', err);
    }
  });

  socket.on('accept-participant', async ({ roomId, socketId, userData }) => {
    if (waitingRooms.has(roomId)) {
      waitingRooms.get(roomId).delete(socketId);
    }

    const studentSocket = io.sockets.sockets.get(socketId);
    if (studentSocket) {
      studentSocket.join(roomId);
      studentSocket.emit('join-accepted');

      // Track user in room
      if (userData && userData.userId) {
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId).set(userData.userId, {
          userId: userData.userId,
          username: userData.username,
          socketId: studentSocket.id,
          role: userData.role
        });

        // Broadcast updated user list to all users in room
        const users = Array.from(roomUsers.get(roomId).values());
        io.to(roomId).emit('room-users-updated', users);

        // Add user as participant in board
        try {
          await Board.findOneAndUpdate(
            { roomId },
            {
              $addToSet: {
                participants: {
                  userId: userData.userId,
                  role: userData.role,
                  joinedAt: new Date()
                }
              }
            },
            { upsert: false }
          );
        } catch (err) {
          console.error('Error adding participant:', err);
        }
      }

      // Load Board History for the accepted participant
      try {
        let board = await Board.findOne({ roomId })
          .populate('allowedStudents', 'username email')
          .populate('createdBy', 'username');

        if (board) {
          studentSocket.emit('load-board', {
            elements: board.elements,
            allowedStudents: board.allowedStudents || [],
            allowStudentEditing: board.allowStudentEditing || false,
            boardName: board.name,
            hostId: board.createdBy?._id?.toString(),
            teacherName: board.createdBy?.username || 'Unknown Teacher'
          });
        } else {
          studentSocket.emit('load-board', {
            elements: [],
            allowedStudents: [],
            allowStudentEditing: false,
            boardName: 'Untitled Board',
            hostId: null,
            teacherName: 'Unknown Teacher'
          });
        }
      } catch (err) {
        console.error('Error loading board:', err);
      }
    }
  });

  socket.on('decline-participant', ({ roomId, socketId }) => {
    if (waitingRooms.has(roomId)) {
      waitingRooms.get(roomId).delete(socketId);
    }
    const studentSocket = io.sockets.sockets.get(socketId);
    if (studentSocket) {
      studentSocket.emit('join-declined');
    }
  });

  // Real-time stroke updates (while drawing) - no DB save, just broadcast
  socket.on('drawing-stroke', async (strokeData) => {
    console.log('[SOCKET DRAWING-STROKE] socket:', socket.id, 'user:', socket.userId, 'points:', strokeData?.stroke?.points?.length);
    if (!(await isAuthorizedToEdit(strokeData.roomId, socket.userId))) {
      console.log('[SOCKET DRAWING-STROKE] UNAUTHORIZED:', socket.id, socket.userId);
      return;
    }
    socket.to(strokeData.roomId).emit('drawing-stroke', strokeData);
  });

  socket.on('draw-element', async (element) => {
    console.log('[SOCKET DRAW-ELEMENT] socket:', socket.id, 'user:', socket.userId, 'type:', element?.type);
    if (!(await isAuthorizedToEdit(element.roomId, socket.userId))) {
      console.log('[SOCKET DRAW-ELEMENT] UNAUTHORIZED:', socket.id, socket.userId);
      return;
    }
    // Broadcast element to room
    socket.to(element.roomId).emit('draw-element', element);

    // Save to DB (Update if exists, Push if new)
    try {
      const roomId = element.roomId;
      // Try to update existing element in the array
      const updatedMatch = await Board.findOneAndUpdate(
        { roomId: roomId, "elements.id": element.id },
        {
          $set: {
            "elements.$": element,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!updatedMatch) {
        // If not found, push new element
        await Board.findOneAndUpdate(
          { roomId: roomId },
          {
            $push: { elements: element },
            $set: { updatedAt: new Date() }
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error('Error saving element:', err);
    }
  });

  // Delete element (for undo synchronization)
  socket.on('delete-element', async ({ roomId, elementId }) => {
    if (!(await isAuthorizedToEdit(roomId, socket.userId))) return;
    console.log(`[DELETE-ELEMENT] Received from ${socket.id}, roomId: ${roomId}, elementId: ${elementId}`);
    // Broadcast deletion to room
    socket.to(roomId).emit('delete-element', elementId);
    console.log(`[DELETE-ELEMENT] Broadcasted to room ${roomId}`);

    // Remove from DB
    try {
      await Board.findOneAndUpdate(
        { roomId },
        {
          $pull: { elements: { id: elementId } },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`[DELETE-ELEMENT] Removed from DB: ${elementId}`);
    } catch (err) {
      console.error('Error deleting element:', err);
    }
  });

  // Update element (for eraser redo synchronization)
  socket.on('update-element', async ({ roomId, elementId, updates }) => {
    if (!(await isAuthorizedToEdit(roomId, socket.userId))) return;
    console.log(`[UPDATE-ELEMENT] Received from ${socket.id}, roomId: ${roomId}, elementId: ${elementId}`);
    // Broadcast update to room
    socket.to(roomId).emit('update-element', { elementId, updates });
    console.log(`[UPDATE-ELEMENT] Broadcasted to room ${roomId}`);

    // Update in DB
    try {
      await Board.findOneAndUpdate(
        { roomId, 'elements.id': elementId },
        {
          $set: {
            'elements.$': updates,
            updatedAt: new Date()
          }
        }
      );
      console.log(`[UPDATE-ELEMENT] Updated in DB: ${elementId}`);
    } catch (err) {
      console.error('Error updating element:', err);
    }
  });

  // Sync elements (for redo to maintain correct order)
  socket.on('sync-elements', async ({ roomId, elements }) => {
    if (!(await isAuthorizedToEdit(roomId, socket.userId))) return;
    console.log(`[SYNC-ELEMENTS] Received from ${socket.id}, syncing ${elements.length} elements`);
    // Broadcast full element array to all other users
    socket.to(roomId).emit('sync-elements', elements);

    // Update database with full element array
    try {
      await Board.findOneAndUpdate(
        { roomId },
        {
          $set: {
            elements: elements,
            updatedAt: new Date()
          }
        }
      );
      console.log(`[SYNC-ELEMENTS] Updated DB with ${elements.length} elements`);
    } catch (err) {
      console.error('Error syncing elements:', err);
    }
  });

  // Sync state (for redo to maintain exact element order)
  socket.on('sync-state', async ({ roomId, elements }) => {
    if (!(await isAuthorizedToEdit(roomId, socket.userId))) return;
    console.log(`[SYNC-STATE] Broadcasting ${elements.length} elements to room ${roomId}`);
    // Broadcast to all other users
    socket.to(roomId).emit('sync-state', elements);

    // Update database
    try {
      await Board.findOneAndUpdate(
        { roomId },
        {
          $set: {
            elements: elements,
            updatedAt: new Date()
          }
        }
      );
    } catch (err) {
      console.error('Error syncing state:', err);
    }
  });

  socket.on('clear-canvas', async (roomId) => {
    try {
      // FIX #94: verify the emitting user is the board owner before clearing
      const board = await Board.findOne({ roomId });
      if (!board || board.createdBy.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: only the board teacher can clear the canvas' });
      }
      io.to(roomId).emit('clear-canvas');
      await Board.findOneAndUpdate(
        { roomId },
        { $set: { elements: [] } }
      );
    } catch (err) {
      console.error('Error clearing board:', err);
    }
  });

  // Theme synchronization
  socket.on('change-theme', async ({ roomId, isDark }) => {
    if (!(await isTeacher(roomId, socket.userId))) return;
    console.log(`[THEME-SYNC] Received change-theme from ${socket.id} for room ${roomId}, isDark: ${isDark}`);
    // Broadcast theme change to all students in room
    socket.to(roomId).emit('theme-changed', isDark);
    console.log(`[THEME-SYNC] Broadcasted theme-changed to room ${roomId}`);
  });

  socket.on('cursor-move', (data) => {
    // Optional: could protect cursor-move, but usually non-destructive
    socket.to(data.roomId).emit('cursor-move', data);
  });

  socket.on('viewport-change', (data) => {
    // Optional: non-destructive
    socket.to(data.roomId).emit('viewport-change', data);
  });

  socket.on('grant-participant-permission', async ({ roomId, studentId }) => {
    try {
      // FIX #94: verify the emitting user is the board owner
      const board = await Board.findOne({ roomId });
      if (!board || board.createdBy.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: only the board teacher can grant permissions' });
      }
      await Board.findOneAndUpdate(
        { roomId },
        { $addToSet: { allowedStudents: studentId } }
      );

      // Notify specific student
      const roomUsersList = roomUsers.get(roomId);
      if (roomUsersList) {
        const student = roomUsersList.get(studentId);
        if (student) {
          io.to(student.socketId).emit('editing-permission-changed', true);
        }
      }
    } catch (err) {
      console.error('Error granting permission:', err);
    }
  });

  // Revoke editing permission from specific student
  socket.on('revoke-participant-permission', async ({ roomId, studentId }) => {
    try {
      // FIX #94: verify the emitting user is the board owner
      const board = await Board.findOne({ roomId });
      if (!board || board.createdBy.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: only the board teacher can revoke permissions' });
      }
      await Board.findOneAndUpdate(
        { roomId },
        { $pull: { allowedStudents: studentId } }
      );

      // Notify specific student
      const roomUsersList = roomUsers.get(roomId);
      if (roomUsersList) {
        const student = roomUsersList.get(studentId);
        if (student) {
          io.to(student.socketId).emit('editing-permission-changed', false);
        }
      }
    } catch (err) {
      console.error('Error revoking permission:', err);
    }
  });

  // Toggle student editing permission
  socket.on('toggle-student-editing', async ({ roomId, allowEditing }) => {
    try {
      // FIX #94: verify the emitting user is the board owner
      const board = await Board.findOne({ roomId });
      if (!board || board.createdBy.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: only the board teacher can toggle student editing' });
      }
      socket.to(roomId).emit('student-editing-changed', allowEditing);
      await Board.findOneAndUpdate(
        { roomId },
        { $set: { allowStudentEditing: allowEditing } }
      );
    } catch (err) {
      console.error('Error updating student editing permission:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove user from all rooms and waiting rooms
    roomUsers.forEach((users, roomId) => {
      for (const [userId, userData] of users.entries()) {
        if (userData.socketId === socket.id) {
          users.delete(userId);
          io.to(roomId).emit('room-users-updated', Array.from(users.values()));
          break;
        }
      }
    });

    waitingRooms.forEach((waitingList, roomId) => {
      if (waitingList.has(socket.id)) {
        waitingList.delete(socket.id);
        // Could notify teacher that student left the waiting room, but not strictly necessary
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});