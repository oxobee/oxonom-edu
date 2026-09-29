import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TeacherSignup from "./pages/TeacherSignup";
import Whiteboard from "./components/Whiteboard";
import Dashboard from "./pages/Dashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ClassesPage from "./pages/ClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import AttendancePage from "./pages/AttendancePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ExamsPage from "./pages/ExamsPage";
import TeacherMeetingsPage from "./pages/TeacherMeetingsPage";
import ReportsPage from "./pages/ReportsPage";
import ModulesPage from "./pages/ModulesPage";

import StudentBoardsPage from "./pages/StudentBoardsPage";
import StudentAssignmentsPage from "./pages/StudentAssignmentsPage";
import StudentExamsPage from "./pages/StudentExamsPage";
import StudentAttendancePage from "./pages/StudentAttendancePage";
import StudentAnnouncementsPage from "./pages/StudentAnnouncementsPage";
import StudentMeetingsPage from "./pages/StudentMeetingsPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
import LandingPage from "./pages/LandingPage";
import FeaturesPage from "./pages/FeaturesPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage"; 
import VerificationPending from "./pages/VerificationPending";
import AdminPanel from "./pages/AdminPanel";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import VerifyRegistrationOTP from "./pages/VerifyRegistrationOTP";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "./context/ThemeContext";
import { ModuleDockProvider } from "./context/ModuleDockContext";
import MinimizedModulesDock from "./components/MinimizedModulesDock";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const PrivateRoute = ({ children }) => {
  const location = useLocation();

  // Instant companion login from QR code (e.g. ?auth=<token>)
  const searchParams = new URLSearchParams(location.search);
  const authParam = searchParams.get('auth');
  if (authParam) {
    try {
      const payload = JSON.parse(atob(authParam.split('.')[1]));
      localStorage.setItem('token', authParam);
      localStorage.setItem('user', JSON.stringify({
        id: payload.id,
        role: payload.role || 'teacher',
        username: payload.username || 'Öğretmen',
        email: payload.email || 'ogretmen@oxonom.com',
        isVerified: true
      }));
      // Clean query params from URL without reload
      window.history.replaceState({}, '', location.pathname);
    } catch (e) {
      console.error('Failed to parse auth token from QR code URL', e);
    }
  }

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  if (user.role === "admin" && location.pathname === "/dashboard") {
    return <Navigate to="/admin" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (token) {
    if (user.isVerified) {
      if (user.role === "admin") {
        return <Navigate to="/admin" />;
      }
      return <Navigate to="/dashboard" />;
    }
    return <Navigate to="/verification-pending" />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const DashboardRoute = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user?.role === "teacher") {
    return <TeacherDashboard />;
  }
  return <Dashboard />;
};

const ProfileRoute = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user?.role === "teacher") {
    return <TeacherProfilePage />;
  }
  return <StudentProfilePage />;
};

// --- Main Layout Wrapper ---
const AppLayout = () => {
  const location = useLocation();
  const authRoutes = [
    "/login",
    "/signup",
    "/signup-teacher",
    "/signup/teacher",
    "/forgot-password",
    "/verify-otp",
    "/reset-password",
    "/verify-email",
  ];
  const publicRoutes = ["/", "/features", "/about", "/contact", "/faq", "/terms", "/terms-of-service", "/privacy-policy"];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans selection:bg-purple-500/30">
      <Navbar />
      <div className={isPublicRoute ? "pt-14" : ""}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* FIX 2: /faq route add kiya, duplicate /contact remove kiya */}
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />


          <Route
           path="/terms-of-service"
           element={<TermsOfService />}
          />
          <Route 
           path="/privacy-policy"
           element={<PrivacyPolicy />} 
           />
           
          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/signup-teacher"
            element={
              <PublicRoute>
                <TeacherSignup />
              </PublicRoute>
            }
          />
          <Route
            path="/signup/teacher"
            element={<Navigate to="/signup-teacher" replace />}
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <PublicRoute>
                <VerifyOTP />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <PublicRoute>
                <VerifyRegistrationOTP />
              </PublicRoute>
            }
          />

          {/* Private Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardRoute />
              </PrivateRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <PrivateRoute>
                <ClassesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/classes/:classId"
            element={
              <PrivateRoute>
                <ClassDetailPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/board/:roomId"
            element={
              <PrivateRoute>
                <Whiteboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/verification-pending"
            element={
              <PrivateRoute>
                <VerificationPending />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* Teacher Module Routes */}
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <AttendancePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <PrivateRoute>
                <AnnouncementsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <PrivateRoute>
                <AssignmentsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <PrivateRoute>
                <ExamsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <PrivateRoute>
                <TeacherMeetingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <PrivateRoute>
                <ModulesPage />
              </PrivateRoute>
            }
          />

          {/* Student Module Routes */}
          <Route
            path="/my-boards"
            element={
              <PrivateRoute>
                <StudentBoardsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-assignments"
            element={
              <PrivateRoute>
                <StudentAssignmentsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-exams"
            element={
              <PrivateRoute>
                <StudentExamsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-attendance"
            element={
              <PrivateRoute>
                <StudentAttendancePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-announcements"
            element={
              <PrivateRoute>
                <StudentAnnouncementsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-meetings"
            element={
              <PrivateRoute>
                <StudentMeetingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfileRoute />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ModuleDockProvider>
        <Router>
          <ScrollToTop />
          <AppLayout />
          <MinimizedModulesDock />
        </Router>
      </ModuleDockProvider>
    </ThemeProvider>
  );
}

export default App;