import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Presentation,
  Clock,
  Search,
  Lock,
  User,
  ArrowRight,
  Folder,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Input, Badge, EmptyState, Button } from '../components/ui';

const StudentBoardsPage = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFolderDate, setSelectedFolderDate] = useState(null);

  useEffect(() => {
    fetchStudentBoards();
  }, []);

  const fetchStudentBoards = async () => {
    setLoading(true);
    try {
      const profileRes = await api.get('/api/students/me');
      const student = profileRes.data;
      try {
        const boardsRes = await api.get('/api/boards/student/my-boards');
        if (boardsRes.data && boardsRes.data.length > 0) {
          setBoards(boardsRes.data);
        } else if (student?.classId) {
          const classId = student.classId._id || student.classId;
          const cRes = await api.get(`/api/boards/class/${classId}`);
          setBoards(cRes.data || []);
        }
      } catch (err) {
        if (student?.classId) {
          const classId = student.classId._id || student.classId;
          const cRes = await api.get(`/api/boards/class/${classId}`).catch(() => ({ data: [] }));
          setBoards(cRes.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching student boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateKey = (d) => {
    if (!d) return 'Tarihsiz';
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'Tarihsiz';
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateKey) => {
    if (!dateKey || dateKey === 'Tarihsiz') return 'Tarihsiz Tahtalar';
    const d = new Date(dateKey + 'T00:00:00');
    if (isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const dateGroups = useMemo(() => {
    const map = {};
    boards.forEach(b => {
      const key = formatDateKey(b.boardDate || b.createdAt);
      if (!map[key]) {
        map[key] = {
          dateKey: key,
          displayDate: formatDisplayDate(key),
          groupTitle: b.groupTitle || '',
          boards: []
        };
      } else if (!map[key].groupTitle && b.groupTitle) {
        map[key].groupTitle = b.groupTitle;
      }
      map[key].boards.push(b);
    });

    return Object.values(map).sort((a, b) => {
      if (a.dateKey === 'Tarihsiz') return 1;
      if (b.dateKey === 'Tarihsiz') return -1;
      return b.dateKey.localeCompare(a.dateKey);
    });
  }, [boards]);

  const filteredBoards = boards.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeGroup = useMemo(() => {
    if (!selectedFolderDate) return null;
    return dateGroups.find(g => g.dateKey === selectedFolderDate);
  }, [dateGroups, selectedFolderDate]);

  const displayedBoards = useMemo(() => {
    let list = [];
    if (searchTerm.trim()) {
      list = filteredBoards;
    } else if (selectedFolderDate) {
      list = activeGroup ? activeGroup.boards : [];
    }
    return [...list].sort((a, b) => new Date(b.createdAt || b.boardDate || 0) - new Date(a.createdAt || a.boardDate || 0));
  }, [searchTerm, selectedFolderDate, filteredBoards, activeGroup]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Mevcut Tahtalar"
          description="Öğretmeninizin sınıfınız için oluşturduğu tarihe göre kategorize ders tahtaları."
          actions={
            <div className="w-full sm:w-64">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tahta ara..."
                leftIcon={Search}
              />
            </div>
          }
        />

        {/* Breadcrumb Header when inside a date folder */}
        {!searchTerm && selectedFolderDate && activeGroup && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFolderDate(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Tüm Klasörler</span>
              </button>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">
                  {activeGroup.displayDate}
                </span>
                {activeGroup.groupTitle && (
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium truncate max-w-xs">
                    {activeGroup.groupTitle}
                  </span>
                )}
              </div>
            </div>

            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {activeGroup.boards.length} Tahta
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Tahtalar yükleniyor...</p>
          </div>
        ) : boards.length === 0 ? (
          <EmptyState
            icon={Presentation}
            title={searchTerm ? 'Aranan kriterlere uygun tahta bulunamadı' : 'Görüntülenecek tahta bulunamadı'}
            description={
              searchTerm
                ? 'Arama teriminizi temizleyip tekrar deneyebilirsiniz.'
                : 'Öğretmeniniz yeni bir tahta başlattığında burada listelenecektir.'
            }
          />
        ) : !searchTerm && !selectedFolderDate ? (
          /* FOLDER GRID VIEW FOR STUDENTS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dateGroups.map((group) => (
              <div
                key={group.dateKey}
                onClick={() => setSelectedFolderDate(group.dateKey)}
                className="group relative p-5 rounded-2xl bg-card hover:bg-card/90 border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 chrome-pattern"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{group.displayDate}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {group.groupTitle || 'Ders Notları & Tahtalar'}
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" size="sm" className="bg-primary/5 text-primary border-primary/20 shrink-0">
                    {group.boards.length} Tahta
                  </Badge>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span className="text-[11px]">Ders tahtalarını gör</span>
                  <span className="flex items-center gap-1 text-primary font-semibold group-hover:translate-x-1 transition-transform">
                    Klasörü Aç <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : displayedBoards.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-2xl border border-border space-y-2">
            <p className="text-sm text-muted-foreground">Bu klasörde tahta bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedBoards.map(board => (
              <div
                key={board.roomId}
                onClick={() => navigate(`/board/${board.roomId}`)}
                className="p-5 rounded-2xl bg-card hover:bg-card/90 border border-border hover:border-border/80 transition-all cursor-pointer group space-y-3 shadow-xs hover:shadow-md flex flex-col justify-between chrome-pattern"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.isPasswordProtected && (
                      <Badge variant="warning" size="xs">
                        <Lock className="w-2.5 h-2.5 mr-1" /> Şifreli
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {new Date(board.boardDate || board.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    {board.createdBy?.username || 'Öğretmen'}
                  </span>
                  <span className="text-primary font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Tahtayı Aç <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentBoardsPage;
