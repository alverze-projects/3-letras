import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const TOKEN_KEY = 'admin_token';

interface TokenPayload {
  sub: string;
  nickname: string;
  isGuest: boolean;
  isAdmin: boolean;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  user: TokenPayload | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const user = token ? decodeToken(token) : null;

  const login = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
