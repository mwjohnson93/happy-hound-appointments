
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isGroomer: boolean;
  isVet: boolean;
  userRole: string | null;
  userRoles: string[];
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  // Computed role states based on user_roles table
  const isAdmin = userRoles.includes('admin');
  const isClient = userRoles.includes('client');
  const isGroomer = userRoles.includes('groomer');
  const isVet = userRoles.includes('vet');
  
  // Primary role priority: admin > groomer > vet > client
  const userRole = isAdmin ? 'admin' : 
                   isGroomer ? 'groomer' : 
                   isVet ? 'vet' : 
                   isClient ? 'client' : null;

  const fetchUserRoles = async (userId: string) => {
    try {
      console.log('🎭 Fetching user roles for:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Role fetch timeout')), 10000);
      });

      const fetchPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Failed to fetch user roles:', error);
        return ['client']; // Default fallback role
      }

      const roles = data?.map(r => r.role) || ['client'];
      console.log('✅ User roles fetched:', roles);
      return roles;
    } catch (error) {
      console.error('💥 Error fetching user roles:', error);
      return ['client']; // Default fallback role
    }
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    console.log('🔐 Setting up auth state listener...');

    // Set timeout to prevent infinite loading 
    authTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    const initializeAuth = async () => {
      try {
        // Get initial session first
        console.log('🔍 Getting initial session...');
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          if (mounted) {
            setSession(null);
            setUser(null);
            setUserRoles([]);
            setLoading(false);
          }
          return;
        }

        console.log('🔐 Initial session:', initialSession?.user?.email || 'No session');

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch roles with error handling
          try {
            const roles = await fetchUserRoles(initialSession.user.id);
            if (mounted) {
              setUserRoles(roles);
            }
          } catch (roleError) {
            console.error('❌ Role fetch failed:', roleError);
            if (mounted) {
              setUserRoles(['client']); // Fallback
            }
          }
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setUserRoles([]);
        }

        if (mounted) {
          setLoading(false);
        }

      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email || 'No session');
        
        if (!mounted) return;

        clearTimeout(authTimeout);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Fetch roles in background with timeout
          setTimeout(async () => {
            if (mounted) {
              try {
                const roles = await fetchUserRoles(session.user.id);
                if (mounted) {
                  setUserRoles(roles);
                }
              } catch (error) {
                console.error('❌ Background role fetch failed:', error);
                if (mounted) {
                  setUserRoles(['client']);
                }
              }
            }
          }, 0);
        } else {
          setSession(null);
          setUser(null);
          setUserRoles([]);
        }
        
        setLoading(false);
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Erro ao fazer login com Google');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'client') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role, // This will be used by the handle_new_user trigger
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success('Conta criada com sucesso! Verifique seu email.');
      navigate('/login');
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      setUserRoles([]);

      // Try multiple logout approaches to handle edge cases
      try {
        // First attempt: standard logout
        await supabase.auth.signOut();
        console.log('✅ Standard logout successful');
      } catch (standarderror: unknown) {
        console.warn('⚠️ Standard logout failed, trying global logout:', standardError);
        
        try {
          // Second attempt: global logout
          await supabase.auth.signOut({ scope: 'global' });
          console.log('✅ Global logout successful');
        } catch (globalerror: unknown) {
          console.warn('⚠️ Global logout also failed:', globalError);
          
          // Third attempt: Clear session locally and continue
          // This handles cases where the server session is already invalid
          if (globalError.message?.includes('session_not_found') || 
              globalError.message?.includes('Session not found') ||
              globalError.status === 403) {
            console.log('🔄 Session already invalid on server, proceeding with local cleanup');
          } else {
            throw globalError; // Re-throw if it's a different error
          }
        }
      }

      toast.success('Logout realizado com sucesso!');
      
      // Navigate immediately after clearing state
      navigate('/', { replace: true });
      
    } catch (error: unknown) {
      console.error('💥 Sign out error:', error);
      
      // Even if there's an error, ensure we clear state and redirect
      // This prevents users from being stuck in a broken auth state
      setUser(null);
      setSession(null);
      setUserRoles([]);
      
      // Show a gentle message but still navigate
      toast.success('Sessão encerrada');
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        loading,
        isAdmin,
        isClient,
        isGroomer,
        isVet,
        userRole,
        userRoles,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
