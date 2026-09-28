import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  UserCheck,
  Save,
  Info,
  Calendar,
  ChevronDown
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Badge, EmptyState, AnimatedItem, AnimatedNumber } from '../components/ui';

const AttendancePage = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // { studentId: { status, note } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isExistingSession, setIsExistingSession] = useState(false);

  useEffect(() => {
    api.get('/api/classes')
      .then(res => {
        const list = res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      })
      .catch(err => console.error('Failed to load classes:', err));
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchAttendanceSession();
    }
  }, [selectedClassId, attendanceDate]);

  const fetchAttendanceSession = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get(`/api/attendance/session?classId=${selectedClassId}&date=${attendanceDate}`);
      const studentList = res.data.students || [];
      setStudents(studentList);
      setIsExistingSession(res.data.isExistingSession || false);

      const initialRecords = {};
      studentList.forEach(s => {
        initialRecords[s.studentId] = {
          status: s.status || 'present',
          note: s.note || ''
        };
      });
      setRecords(initialRecords);
    } catch (err) {
      console.error('Error fetching attendance session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        status
      }
    }));
  };

  const handleMarkAllPresent = () => {
    setRecords(prev => {
      const updated = {};
      students.forEach(s => {
        updated[s.studentId] = {
          ...(prev[s.studentId] || {}),
          status: 'present'
        };
      });
      return updated;
    });
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const formattedRecords = Object.keys(records).map(studentId => ({
        studentId,
        status: records[studentId].status || 'present',
        note: records[studentId].note || ''
      }));

      await api.post('/api/attendance/session', {
        classId: selectedClassId,
        attendanceDate,
        records: formattedRecords
      });

      setIsExistingSession(true);
      setMessage({ type: 'success', text: 'Yoklama başarıyla kaydedildi!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Yoklama kaydedilemedi' });
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(records).filter(r => r.status === 'present').length;
  const absentCount = Object.values(records).filter(r => r.status === 'absent').length;
  const lateCount = Object.values(records).filter(r => r.status === 'late').length;
  const excusedCount = Object.values(records).filter(r => r.status === 'excused').length;
  const totalCount = students.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sınıf Yoklaması"
          description="Öğrenciler otomatik 'Geldi' işaretlenir. Gelmeyen veya geç kalanları değiştirip tek tıkla kaydedebilirsiniz."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3.5 py-2 pr-9 rounded-lg bg-background border border-input text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none shadow-2xs cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name || `${c.grade}/${c.section}`} {c.schoolName ? `(${c.schoolName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                />
              </div>
            </div>
          }
        />

        {/* Feedback Message Alert */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border shadow-xs ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </motion.div>
        )}

        {/* Summary Bar & Quick Actions with Chrome Pattern */}
        {/* Summary Bar & Quick Actions with Chrome Pattern */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm chrome-pattern">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
            <Badge variant="success" size="md">
              Geldi: <AnimatedNumber value={presentCount} />
            </Badge>
            <Badge variant="danger" size="md">
              Gelmedi: <AnimatedNumber value={absentCount} />
            </Badge>
            <Badge variant="warning" size="md">
              Geç: <AnimatedNumber value={lateCount} />
            </Badge>
            <Badge variant="primary" size="md">
              İzinli: <AnimatedNumber value={excusedCount} />
            </Badge>
            <span className="text-muted-foreground text-xs font-medium pl-1">
              Toplam: <AnimatedNumber value={totalCount} /> Öğrenci
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="md"
              leftIcon={UserCheck}
              onClick={handleMarkAllPresent}
              className="shadow-2xs whitespace-nowrap"
            >
              Tümünü Geldi İşaretle
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={Save}
              isLoading={saving}
              disabled={students.length === 0}
              onClick={handleSaveAttendance}
              className="shadow-xs font-semibold whitespace-nowrap"
            >
              {isExistingSession ? 'Yoklamayı Güncelle' : 'Yoklamayı Kaydet'}
            </Button>
          </div>
        </div>

        {/* Student Attendance List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Yoklama listesi yükleniyor...</p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Bu sınıfta kayıtlı öğrenci bulunamadı"
            description="Yoklama alabilmek için lütfen önce Sınıflarım sayfasından sınıfa öğrenci ekleyiniz."
          />
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60 chrome-pattern">
            {students.map((student, index) => {
              const rec = records[student.studentId] || { status: 'present' };
              const currentStatus = rec.status;

              return (
                <AnimatedItem
                  key={student.studentId}
                  index={index}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3.5 min-w-[200px]">
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{student.fullName}</h3>
                      <p className="text-[11px] text-muted-foreground">No: {student.studentNumber || '—'}</p>
                    </div>
                  </div>

                  {/* Status Toggle Segmented Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'present')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'present'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Geldi
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'absent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'absent'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-2xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Gelmedi
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'late')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'late'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Geç
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'excused')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'excused'
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-2xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                      }`}
                    >
                      İzinli
                    </button>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;
