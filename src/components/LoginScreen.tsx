/**
 * LoginScreen — Premium glassmorphism login over video background
 * Credentials: kaabi4321 / 1234 (hardcoded), plus localStorage-registered users
 */

import React, { useState } from "react";
import { CloudSun, Eye, EyeOff, User, Lock, LogIn, UserPlus, AlertCircle } from "lucide-react";

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// Hardcoded admin credentials
const HARDCODED_USERS: Record<string, string> = {
  "kaabi4321": "1234",
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getAllUsers = (): Record<string, string> => {
    try {
      const stored = JSON.parse(localStorage.getItem("vw_users") || "{}");
      return { ...HARDCODED_USERS, ...stored };
    } catch {
      return { ...HARDCODED_USERS };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    // Simulate auth delay for premium feel
    await new Promise((r) => setTimeout(r, 900));

    const allUsers = getAllUsers();

    if (mode === "login") {
      if (allUsers[username.trim()] === password) {
        localStorage.setItem(
          "vw_session",
          JSON.stringify({ username: username.trim(), loginTime: Date.now() })
        );
        onLogin(username.trim());
      } else {
        setError("Incorrect username or password. Please try again.");
        setIsLoading(false);
      }
    } else {
      // Register
      const u = username.trim();
      if (u.length < 3) {
        setError("Username must be at least 3 characters.");
        setIsLoading(false);
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters.");
        setIsLoading(false);
        return;
      }
      if (allUsers[u]) {
        setError("Username is already taken. Please choose another.");
        setIsLoading(false);
        return;
      }
      // Save new user
      try {
        const stored = JSON.parse(localStorage.getItem("vw_users") || "{}");
        stored[u] = password;
        localStorage.setItem("vw_users", JSON.stringify(stored));
        localStorage.setItem(
          "vw_session",
          JSON.stringify({ username: u, loginTime: Date.now() })
        );
        onLogin(u);
      } catch {
        setError("Failed to create account. Please try again.");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Glassmorphism overlay on video */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-cyan-950/30 to-slate-950/70 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-sm animate-slide-in-up">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 bg-cyan-400/25 rounded-3xl blur-3xl scale-150 animate-pulse" />
            <div className="relative glass-card p-5 rounded-3xl">
              <CloudSun className="w-12 h-12 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gradient tracking-tight">Vibe Weather</h1>
          <p className="text-cyan-300/75 text-xs font-mono tracking-widest uppercase mt-2">
            {mode === "login" ? "Welcome back — sign in to continue" : "Create your account to start"}
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                id="inp-username"
                type="text"
                placeholder="Username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 hover:bg-white/7 border border-white/10 focus:border-cyan-500/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                id="inp-password"
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 hover:bg-white/7 border border-white/10 focus:border-cyan-500/50 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Toggle login / register */}
          <div className="mt-5 pt-4 border-t border-white/5 text-center">
            <button
              id="btn-toggle-auth-mode"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError("");
                setPassword("");
              }}
              className="text-xs text-slate-500 hover:text-cyan-300 transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Create one →"
                : "Already have an account? Sign in →"}
            </button>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">
          Data saved locally • No server required
        </p>
      </div>
    </div>
  );
}
