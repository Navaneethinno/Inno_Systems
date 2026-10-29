import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";
import { SHELL_ROUTES } from "./routeTable";
import { NotFound } from "./NotFound";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/components/LoginPage";

// The login page is the first screen for anyone signed out, so it ships in
// the main bundle; every page inside the shell loads on demand.
export function AppRoutes() {
  return (
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
        {SHELL_ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} Component={Component} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
