import { createContext, useCallback, useMemo, useState } from "react";
import { authService } from "../features/auth/services/authService";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  // No /me endpoint exists on this backend — rehydrate the user we cached
  // at login time as long as a token is still present.
  const [user, setUser] = useState(() => (authService.isAuthenticated() ? authService.getStoredUser() : null));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const authUser = await authService.login(payload);
      setUser(authUser);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, error, login, logout, clearError }),
    [user, isLoading, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
