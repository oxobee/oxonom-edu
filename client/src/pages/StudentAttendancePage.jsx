import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, StatCard, Card, CardHeader, CardTitle, CardContent, Badge, AnimatedItem, AnimatedNumber } from '../components/ui';

const StudentAttendancePage = () => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentAttendance();
  }, []);

  const fetchStudentAttendance = async () => {
    setLoading(true);
    try {
      const profileRes = await api.get('/api/students/me');
      const student = profileRes.data;
      if (student?._id) {
        const res = await api.get(`/api/attendance/student/${student._id}`);
        setAttendance(res.data);
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <Badge variant="success" size="sm">✓ Geldi</Badge>;
      case 'absent':
        return <Badge variant="danger" size="sm">✕ Gelmedi</Badge>;
      case 'late':
        return <Badge variant="warning" size="sm">⏰ Geç</Badge>;
      case 'excused':
        return <Badge variant="primary" size="sm">İzinli</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Devamsızlık Durumum"
          description="Okul yoklama oturumlarına katılım durumunuzu ve devam yüzdenizi buradan inceleyebilirsiniz."
        />

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : !attendance ? (
          <Card className="border-dashed chrome-pattern">
            <CardContent className="py-12 text-center text-muted-foreground text-xs">
              Devamsızlık kaydı bulunamadı.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <AnimatedItem index={0}>
                <StatCard
                  title="Toplam Yoklama"
                  value={attendance.totalSessions || 0}
                  icon={Calendar}
                  iconColor="indigo"
                  description="Alınan yoklama günü"
                />
              </AnimatedItem>
              <AnimatedItem index={1}>
                <StatCard
                  title="Gelinen Gün"
                  value={attendance.present || 0}
                  icon={Check}
                  iconColor="emerald"
                  description="Eksiksiz katılım"
                />
              </AnimatedItem>
              <AnimatedItem index={2}>
                <StatCard
                  title="Devamsızlık"
                  value={attendance.absent || 0}
                  suffix=" Gün"
                  icon={X}
                  iconColor="rose"
                  description={`Geç: ${attendance.late || 0} gün`}
                />
              </AnimatedItem>
              <AnimatedItem index={3}>
                <StatCard
                  title="Devam Oranı"
                  value={attendance.attendanceRate || 100}
                  prefix="%"
                  icon={CalendarCheck}
                  iconColor="sky"
                  description={`İzinli: ${attendance.excused || 0} gün`}
                />
              </AnimatedItem>
            </div>

            {/* History Table */}
            <Card className="chrome-pattern">
              <CardHeader>
                <CardTitle as="h3">Son Yoklama Kayıtları</CardTitle>
              </CardHeader>
              <CardContent noPadding>
                {attendance.history?.length === 0 ? (
                  <p className="text-muted-foreground text-xs p-6 text-center">Henüz yoklama oturumu kaydedilmedi.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {attendance.history?.map((h, i) => (
                      <AnimatedItem
                        key={i}
                        index={i}
                        className="p-4 sm:px-6 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">
                            {new Date(h.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {h.note && (
                            <span className="text-[11px] text-muted-foreground italic">"{h.note}"</span>
                          )}
                        </div>

                        <div>{getStatusBadge(h.status)}</div>
                      </AnimatedItem>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendancePage;
