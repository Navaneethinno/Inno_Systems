import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { loginSchema } from "../schema/loginSchema";
import { useAuth } from "../hooks/useAuth";
import { TextField } from "../../../components/ui/TextField";
import { Button } from "../../../components/ui/Button";
import logoIcon from "../../../assets/logo-icon.png";
import logoWordmark from "../../../assets/logo-wordmark.png";
import "./LoginPage.css";

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "256-bit", label: "Encryption" },
  { value: "24/7", label: "Support" },
];

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values) => {
    try {
      await login(values);
      navigate("/", { replace: true });
    } catch {
      // error surfaced via auth context state
    }
  };

  return (
    <div className="login">
      <div className="login__brand-panel">
        <div className="login__brand-glow" aria-hidden="true" />
        <div className="login__brand-grid" aria-hidden="true" />

        <div className="login__brand-content">
          <div className="login__logo">
            <img src={logoIcon} alt="" className="login__logo-icon" />
            <img src={logoWordmark} alt="Innovitegra Solutions" className="login__logo-word" />
          </div>

          <h1 className="login__headline">
            Build. Integrate.
            <br />
            Scale with confidence.
          </h1>
          <p className="login__subline">
            A unified workspace for your teams, services, and data — secured end to end.
          </p>

          <ul className="login__features">
            <li>Enterprise-grade authentication &amp; access control</li>
            <li>Real-time visibility across every integration</li>
            <li>Built for reliability at scale</li>
          </ul>

          <div className="login__stats">
            {stats.map((stat) => (
              <div className="login__stat" key={stat.label}>
                <span className="login__stat-value">{stat.value}</span>
                <span className="login__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login__footer-note">© {new Date().getFullYear()} Innovitegra Solutions. All rights reserved.</div>
      </div>

      <div className="login__form-panel">
        <div className="login__form-card">
          <div className="login__mobile-logo">
            <img src={logoIcon} alt="Innovitegra Solutions" />
          </div>

          <h2 className="login__title">Welcome back</h2>
          <p className="login__desc">Sign in to continue to your dashboard.</p>

          {error && (
            <div className="login__alert" role="alert">
              {error}
              <button type="button" onClick={clearError} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}

          <form className="login__form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              id="username"
              label="Username"
              type="text"
              icon="user"
              placeholder="Enter your username"
              autoComplete="username"
              error={errors.username?.message}
              {...register("username")}
            />

            <TextField
              id="password"
              label="Password"
              type="password"
              icon="lock"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <label className="login__checkbox">
              <input type="checkbox" {...register("rememberMe")} />
              <span>Remember me</span>
            </label>

            <Button type="submit" fullWidth loading={isLoading}>
              {isLoading ? (
                "Signing in…"
              ) : (
                <>
                  Sign in
                  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </Button>
          </form>

          <p className="login__security-note">
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
              <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Your connection to this site is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
