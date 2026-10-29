import { createContext } from "react";

// Kept apart from their providers so those files export only components
// (Fast Refresh). Read them through useAuth() / useTheme().
export const AuthContext = createContext(undefined);
export const ThemeContext = createContext(undefined);
