import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./store/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./routes/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./features/auth/components/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { MasterCrudPage } from "./features/masterData/components/MasterCrudPage";
import { MasterListPage } from "./features/masterData/components/MasterListPage";
import { SystemFormPage } from "./features/system/components/SystemFormPage";
import { ProfileFormPage } from "./features/system/components/ProfileFormPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/master/:entityKey" element={<MasterCrudPage />} />
            <Route path="/reference/:entityKey" element={<MasterListPage />} />
            <Route path="/system/profile" element={<ProfileFormPage />} />
            <Route path="/system/:formKey" element={<SystemFormPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
