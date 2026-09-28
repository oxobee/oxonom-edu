import React, { useState, useEffect } from 'react';
import {
  Award,
  Trophy,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Badge, EmptyState, AnimatedItem, AnimatedNumber } from '../components/ui';

const StudentExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    fetchStudentExams();
  }, []);

  const fetchStudentExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/student');
      const list = res.data || [];
      setExams(list);
      if (list.length > 0) {
        loadLeaderboard(list[0]);
      }
    } catch (err) {
      console.error('Error fetching student exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (exam) => {
    setSelectedExam(exam);
    setLoadingLeaderboard(true);
    try {
      const res = await api.get(`/api/exams/${exam._id}/leaderboard`);
      setLeaderboardData(res.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sınavlarım & Skor Tablosu"
          description="Sınav sonuçlarınızı, öğretmeninizin değerlendirme notlarını ve sınıf içi genel sıralamanızı takip edin."
        />

        {/* Sınavlarım Cards Section */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Sınav Kartları
          </h2>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Sınavlar yükleniyor...</p>
            </div>
          ) : exams.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Henüz sınav sonucu bulunmuyor"
              description="Öğretmeniniz sınav sonuçlarını açıkladığında burada görüntülenecektir."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((ex, idx) => {
                const isSelected = selectedExam?._id === ex._id;
                const isGraded = ex.myScore !== null;

                return (
                  <AnimatedItem key={ex._id} index={idx}>
                    <div
                      onClick={() => loadLeaderboard(ex)}
                      className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer group space-y-3 shadow-sm hover:shadow-md flex flex-col justify-between h-full chrome-pattern ${
                        isSelected
                          ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                          : 'bg-card hover:bg-card/90 border-border hover:border-border/80'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="warning" size="sm">
                            {ex.subject}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(ex.examDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                          {ex.name}
                        </h3>
                      </div>

                      {/* Score Display */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Benim Puanım</div>
                          <div className="text-xl font-bold text-amber-500 mt-0.5">
                            {isGraded ? (
                              <>
                                <AnimatedNumber value={ex.myScore} /> / {ex.maxScore}
                              </>
                            ) : (
                              'Henüz Girilmedi'
                            )}
                          </div>
                        </div>

                        {isGraded && ex.rank && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Sıralamam</div>
                            <div className="text-sm font-bold text-primary mt-0.5">
                              #{ex.rank} <span className="text-[10px] text-muted-foreground font-normal">/ {ex.totalGraded}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimatedItem>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Exam Leaderboard & Podium Display */}
        {selectedExam && leaderboardData && (
          <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border space-y-8 shadow-sm chrome-pattern">
            {/* Exam Title & Stats Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="warning" size="sm">
                    {selectedExam.subject}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedExam.examDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{selectedExam.name}</h2>
                {selectedExam.topic && <p className="text-xs text-muted-foreground mt-0.5">Konu: {selectedExam.topic}</p>}
              </div>

              {/* My Score Highlights & Teacher Note */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:items-end justify-center min-w-[220px]">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Benim Sınav Notum</span>
                <div className="text-2xl font-bold text-amber-500 mt-0.5">
                  {selectedExam.myScore !== null ? (
                    <>
                      <AnimatedNumber value={selectedExam.myScore} /> / {selectedExam.maxScore}
                    </>
                  ) : (
                    '—'
                  )}
                </div>
                {selectedExam.teacherNote ? (
                  <p className="text-[11px] text-foreground/80 italic mt-1 sm:text-right max-w-xs">
                    "{selectedExam.teacherNote}"
                  </p>
                ) : null}
              </div>
            </div>

            {/* Top 3 Podium Display */}
            {leaderboardData.podium && leaderboardData.podium.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Sınıf Kürsüsü (İlk 3 Sıra)
                </h3>

                <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto pt-2">
                  {/* 2nd Place */}
                  <AnimatedItem index={1} className="order-1">
                    <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border text-center flex flex-col justify-end h-full shadow-2xs">
                      <div className="text-3xl mb-1.5">🥈</div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">{leaderboardData.podium[1]?.studentName || '—'}</div>
                      <div className="text-xl font-bold text-muted-foreground mt-1">
                        {leaderboardData.podium[1]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[1].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">2. Sıra</div>
                    </div>
                  </AnimatedItem>

                  {/* 1st Place */}
                  <AnimatedItem index={0} className="order-2">
                    <div className="p-4 sm:p-6 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-center flex flex-col justify-end h-full shadow-sm">
                      <div className="text-4xl mb-1.5">🥇</div>
                      <div className="text-xs sm:text-sm font-bold text-foreground truncate">{leaderboardData.podium[0]?.studentName || '—'}</div>
                      <div className="text-2xl font-black text-amber-500 mt-1">
                        {leaderboardData.podium[0]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[0].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold mt-0.5">1. Sıra (Lider)</div>
                    </div>
                  </AnimatedItem>

                  {/* 3rd Place */}
                  <AnimatedItem index={2} className="order-3">
                    <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border text-center flex flex-col justify-end h-full shadow-2xs">
                      <div className="text-3xl mb-1.5">🥉</div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">{leaderboardData.podium[2]?.studentName || '—'}</div>
                      <div className="text-xl font-bold text-amber-600/90 mt-1">
                        {leaderboardData.podium[2]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[2].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">3. Sıra</div>
                    </div>
                  </AnimatedItem>
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Genel Sınıf Sıralaması
              </h3>

              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
                {loadingLeaderboard ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Skor tablosu yükleniyor...
                  </div>
                ) : leaderboardData.leaderboard?.map((item, idx) => {
                  const isMe = item.studentId === selectedExam.studentId;

                  return (
                    <div
                      key={item.studentId}
                      className={`p-3.5 flex items-center justify-between text-xs transition-colors ${
                        isMe
                          ? 'bg-primary/10 font-semibold text-foreground'
                          : 'hover:bg-muted/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-center font-bold ${item.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          #{item.rank}
                        </span>
                        <span>{item.studentName} {isMe && '(Siz)'}</span>
                      </div>

                      <span className="font-bold text-primary text-sm">
                        <AnimatedNumber value={item.score} /> Puan
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentExamsPage;
