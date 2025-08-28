import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { getCurrentUser } from '../store/slices/authSlice';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    // Check for existing session on app start
    dispatch(getCurrentUser());
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


