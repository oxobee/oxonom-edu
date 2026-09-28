import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  UserCheck,
  Save,
  Calendar,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import { Button, Badge } from './ui';

const statusConfig = {
  present: { label: 'Geldi', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25', activeBg: 'bg-emerald-600 text-white border-emerald-500' },
  late: { label: 'Geç', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25', activeBg: 'bg-amber-600 text-white border-amber-500' },
  excused: { label: 'İzinli', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25', activeBg: 'bg-indigo-600 text-white border-indigo-500' },
  absent: { label: 'Gelmedi', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25', activeBg: 'bg-rose-600 text-white border-rose-500' }
};

const ClassAttendanceTab = ({ classId, className = '' }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // { studentId: { status, note } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isExistingSession, setIsExistingSession] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchSession();
    }
  }, [classId, attendanceDate]);

  const fetchSession = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get(`/api/attendance/session?classId=${classId}&date=${attendanceDate}`);
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
        status: records[studentId].status,
        note: records[studentId].note || ''
      }));

      await api.post('/api/attendance/session', {
        classId,
        attendanceDate,
        records: formattedRecords
      });

      setIsExistingSession(true);
      setMessage({ type: 'success', text: 'Yoklama başarıyla kaydedildi!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Yoklama kaydedilirken bir hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  // Status counters
  const totalStudents = students.length;
  const presentCount = Object.values(records).filter(r => r.status === 'present').length;
  const lateCount = Object.values(records).filter(r => r.status === 'late').length;
  const excusedCount = Object.values(records).filter(r => r.status === 'excused').length;
  const absentCount = Object.values(records).filter(r => r.status === 'absent').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Attendance Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Yoklama Tarihi:
            </span>
          </div>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {isExistingSession && (
            <Badge variant="outline" size="sm" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Kayıtlı Oturum
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllPresent}
            leftIcon={UserCheck}
            disabled={loading || totalStudents === 0}
          >
            Tümünü Geldi İşaretle
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAttendance}
            isLoading={saving}
            leftIcon={Save}
            disabled={loading || totalStudents === 0}
          >
            Yoklamayı Kaydet
          </Button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-destructive/15 border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Geldi
          </span>
          <span className="text-base font-bold text-foreground">{presentCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
          <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Geç
          </span>
          <span className="text-base font-bold text-foreground">{lateCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> İzinli
          </span>
          <span className="text-base font-bold text-foreground">{excusedCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
          <span className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Gelmedi
          </span>
          <span className="text-base font-bold text-foreground">{absentCount}</span>
        </div>
      </div>

      {/* Student Attendance List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Öğrenci listesi yükleniyor...</p>
        </div>
      ) : totalStudents === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-2">
          <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">Bu Sınıfta Kayıtlı Öğrenci Yok</h4>
          <p className="text-xs text-muted-foreground">Yoklama alabilmek için sınıfa öğrenci eklemeli veya eşleşme koduyla kayıt olunmalıdır.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {students.map((student, idx) => {
            const currentStatus = records[student.studentId]?.status || 'present';
            return (
              <div
                key={student.studentId}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || `Öğrenci #${student.studentNumber || idx + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No: {student.studentNumber || '-'} {student.schoolNumber ? `• Okul No: ${student.schoolNumber}` : ''}
                    </p>
                  </div>
                </div>

                {/* Status Switcher Buttons */}
                <div className="grid grid-cols-4 sm:flex items-center gap-1.5 shrink-0">
                  {Object.entries(statusConfig).map(([statusKey, cfg]) => {
                    const isSelected = currentStatus === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, statusKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                          isSelected ? cfg.activeBg : cfg.color
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassAttendanceTab;
