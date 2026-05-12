import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('hrm_token');
        if (token) {
            authApi.me()
                .then(userData => setUser(userData))
                .catch(() => {
                    localStorage.removeItem('hrm_token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const data = await authApi.login(username, password);
        localStorage.setItem('hrm_token', data.access_token);
        const userData = await authApi.me();
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('hrm_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
