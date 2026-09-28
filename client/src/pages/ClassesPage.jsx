import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  UserPlus,
  Search,
  Presentation,
  Calendar,
  Edit2,
  Trash2,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Card, Badge, EmptyState, Input, AnimatedItem } from '../components/ui';
import CreateClassModal from '../components/CreateClassModal';
import StudentModal from '../components/StudentModal';

const ClassesPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user?.role === 'teacher';

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Delete confirmation
  const [deletingClassId, setDeletingClassId] = useState(null);

  useEffect(() => {
    if (!isTeacher && user?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data || []);
    } catch (err) {
      console.error('Sınıflar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId, e) => {
    e.stopPropagation();
    if (!window.confirm('Bu sınıfı ve içindeki tüm verileri silmek istediğinize emin misiniz?')) {
      return;
    }

    setDeletingClassId(classId);
    try {
      await api.delete(`/api/classes/${classId}`);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
    } catch (err) {
      console.error('Sınıf silinemedi:', err);
      alert('Sınıf silinirken hata oluştu.');
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleClassCreated = (newClass) => {
    setIsCreateClassOpen(false);
    navigate(`/classes/${newClass._id}`);
  };

  const handleClassUpdated = (updatedClass) => {
    setClasses((prev) =>
      prev.map((c) => (c._id === updatedClass._id ? { ...c, ...updatedClass } : c))
    );
    setEditingClass(null);
    fetchClasses();
  };

  const handleStudentAdded = () => {
    fetchClasses();
  };

  const filteredClasses = classes.filter((cls) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      (cls.name && cls.name.toLowerCase().includes(query)) ||
      (cls.academicYear && cls.academicYear.toLowerCase().includes(query)) ||
      (cls.description && cls.description.toLowerCase().includes(query)) ||
      (cls.grade && String(cls.grade).includes(query)) ||
      (cls.section && cls.section.toLowerCase().includes(query))
    );
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Sınıflarım"
        description="Tüm aktif sınıflarınızı, öğrenci listelerini ve sınıf tahtalarını buradan yönetin."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={UserPlus}
              disabled={classes.length === 0}
              onClick={() => setIsStudentModalOpen(true)}
            >
              Öğrenci Ekle
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                setEditingClass(null);
                setIsCreateClassOpen(true);
              }}
            >
              Yeni Sınıf
            </Button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Sınıf adı, şube veya dönem ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={Search}
          />
        </div>
        <div className="text-xs text-slate-400 self-end sm:self-center">
          Toplam <span className="font-semibold text-slate-200">{classes.length}</span> sınıf
        </div>
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Sınıflar yükleniyor...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={searchTerm ? 'Aranan kriterlere uygun sınıf bulunamadı' : 'Henüz sınıf oluşturmadınız'}
          description={
            searchTerm
              ? 'Arama filtrenizi temizleyerek tekrar deneyebilirsiniz.'
              : 'Derslerinizi, öğrencilerinizi ve tahtalarınızı düzenlemek için hemen ilk sınıfınızı oluşturun.'
          }
          actionLabel={!searchTerm ? 'İlk Sınıfı Oluştur' : undefined}
          actionIcon={Plus}
          onAction={() => {
            setEditingClass(null);
            setIsCreateClassOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls, idx) => {
            const accentColor = cls.color || '#6366f1';
            return (
              <AnimatedItem key={cls._id} index={idx}>
                <motion.div
                  layout
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => navigate(`/classes/${cls._id}`)}
                  className="group relative bg-card hover:bg-muted/40 border border-border rounded-xl p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden h-full"
                >
                  {/* Left Accent Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-xs shrink-0 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: accentColor }}
                        >
                          {cls.grade ? `${cls.grade}` : 'S'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {cls.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {cls.academicYear || 'Dönem Belirtilmedi'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div
                        className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingClass(cls);
                            setIsCreateClassOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          title="Sınıfı Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClass(cls._id, e)}
                          disabled={deletingClassId === cls._id}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          title="Sınıfı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {cls.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {cls.description}
                      </p>
                    )}
                  </div>

                  {/* Badges & Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs mt-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" size="sm">
                        <Presentation className="w-3 h-3 mr-1" />
                        {cls.boardCount || 0} Tahta
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        <Users className="w-3 h-3 mr-1" />
                        {cls.studentCount || 0} Öğrenci
                      </Badge>
                    </div>

                    <div className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 font-medium text-xs transition-colors">
                      Detay <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </AnimatedItem>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateClassModal
        isOpen={isCreateClassOpen}
        onClose={() => {
          setIsCreateClassOpen(false);
          setEditingClass(null);
        }}
        onSuccess={(saved) => {
          if (editingClass) {
            handleClassUpdated(saved);
          } else {
            handleClassCreated(saved);
          }
        }}
        initialData={editingClass}
      />

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={handleStudentAdded}
        classes={classes}
      />
    </DashboardLayout>
  );
};

export default ClassesPage;
