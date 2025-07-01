
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RefreshAvailabilityResponse {
  success: boolean;
  message: string;
  totalSlots?: number;
  breakdown?: {
    groomers: number;
    veterinarians: number;
    daysGenerated: number;
    timeSlotsPerDay: number;
    groomerSlots: number;
    vetSlots: number;
    showerSlots: number;
  };
  error?: string;
}

export const refreshAvailability = async (): Promise<RefreshAvailabilityResponse> => {
  try {
    console.log('🔧 Calling refresh-availability edge function...');

    const { data, error } = await supabase.functions.invoke('refresh-availability', {
      body: {}
    });

    if (error) {
      console.error('💥 Error calling refresh-availability function:', error);
      toast.error('Erro ao atualizar disponibilidade: ' + error.message);
      return {
        success: false,
        message: 'Erro ao chamar função de atualização',
        error: error.message
      };
    }

    if (data.success) {
      console.log('✅ Availability refreshed successfully:', data);
      toast.success(data.message);
    } else {
      console.error('❌ Refresh availability failed:', data.error);
      toast.error('Erro ao atualizar disponibilidade: ' + data.error);
    }

    return data;

  } catch (error: unknown) {
    console.error('💥 Unexpected error in refreshAvailability:', error);
    toast.error('Erro inesperado ao atualizar disponibilidade');
    return {
      success: false,
      message: 'Erro inesperado',
      error: error.message
    };
  }
};

// New function to manually roll daily availability
export const rollDailyAvailability = async (): Promise<RefreshAvailabilityResponse> => {
  try {
    console.log('🔄 Calling roll-availability edge function...');

    const { data, error } = await supabase.functions.invoke('roll-availability', {
      body: {}
    });

    if (error) {
      console.error('💥 Error calling roll-availability function:', error);
      toast.error('Erro ao atualizar disponibilidade diária: ' + error.message);
      return {
        success: false,
        message: 'Erro ao chamar função de atualização diária',
        error: error.message
      };
    }

    if (data.success) {
      console.log('✅ Daily availability rolled successfully:', data);
      toast.success('Disponibilidade diária atualizada com sucesso!');
    } else {
      console.error('❌ Roll daily availability failed:', data.error);
      toast.error('Erro ao atualizar disponibilidade diária: ' + data.error);
    }

    return data;

  } catch (error: unknown) {
    console.error('💥 Unexpected error in rollDailyAvailability:', error);
    toast.error('Erro inesperado ao atualizar disponibilidade diária');
    return {
      success: false,
      message: 'Erro inesperado',
      error: error.message
    };
  }
};
