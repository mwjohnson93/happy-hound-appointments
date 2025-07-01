
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // This function is now mainly for legacy support since the database trigger handles everything
  const createInitialAvailability = async (providerId: string) => {
    setIsCreatingAvailability(true);
    try {
      // The database trigger should have already handled this, but we can call it as a fallback
      const { error } = await supabase.rpc('ensure_provider_availability', {
        provider_profile_id: providerId,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (error) {
        console.error('❌ Error creating provider availability:', error);
        toast.error('Erro ao criar disponibilidade: ' + error.message);
        return false;
      }

      toast.success('Disponibilidade configurada!');
      return true;
    } catch (error: unknown) {
      console.error('❌ Unexpected error in createInitialAvailability:', error);
      toast.warning('Disponibilidade pode ter sido configurada automaticamente.');
      return false;
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  // This function is now simplified since the database trigger handles most of the work
  const setupNewGroomer = async (userId: string) => {
    // The database trigger should have already created everything we need
    // This function is kept for backwards compatibility
    console.log('✅ Groomer setup should be handled automatically by database triggers');
    toast.success('Conta de tosador configurada automaticamente!');
    return true;
  };

  return {
    setupNewGroomer,
    createInitialAvailability,
    isCreatingAvailability
  };
};
