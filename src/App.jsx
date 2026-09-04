import { AuthProvider } from "./store/AuthContext";
import { LoginPage } from "./features/auth/components/LoginPage";

function App() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

export default App;
