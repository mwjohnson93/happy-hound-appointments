
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract error from URL query params if present
        const queryParams = new URLSearchParams(window.location.search);
        const error = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');

        // Handle errors from the URL
        if (error) {
          console.error("Auth error:", error, errorDescription);
          toast.error(errorDescription || 'Authentication error');
          navigate('/login', { replace: true });
          return;
        }

        // Handle session from the hash or cookie
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        if (data?.session) {
          console.log("Session found:", data.session);
          toast.success('Autenticação realizada com sucesso!');
          
          // Use setTimeout to avoid the redirect loop
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 0);
          return;
        }

        // No session found, redirect to login
        toast.error('Sessão não encontrada');
        navigate('/login', { replace: true });
      } catch (error: unknown) {
        console.error("Auth callback error:", error);
        toast.error(error.message || 'Erro na autenticação');
        navigate('/login', { replace: true });
      }
    };
    
    handleCallback();
  }, [navigate]);
  
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Processando autenticação...</h2>
        <div className="animate-pulse text-primary">Aguarde um momento</div>
      </div>
    </div>
  );
};

export default AuthCallback;
