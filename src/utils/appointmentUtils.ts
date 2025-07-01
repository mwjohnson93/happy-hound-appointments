
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ✅ CLEAN BOOKING: Minimal validation, trust the RPC-validated slots
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  providerProfileId: string | null, // This is now provider_profile_id directly
  date: Date,
  timeSlot: string,
  notes?: string
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any; error?: any }> {
  try {
    console.log('🚀 [CREATE_APPOINTMENT] Starting booking (slots already validated by RPC):', {
      userId,
      petId,
      serviceId,
      providerProfileId, // This is provider_profile_id
      date: date.toISOString(),
      timeSlot,
      notes,
      timestamp: new Date().toISOString()
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // ✅ SIMPLIFIED: Trust the slots already validated by get_available_slots_for_service RPC
    console.log('📤 [CREATE_APPOINTMENT] Proceeding with booking - slots already validated by RPC');

    // Get user, pet, service data for notifications
    const { data: userData } = await supabase.auth.getUser();
    const { data: petData } = await supabase
      .from('pets')
      .select('name')
      .eq('id', petId)
      .single();
    
    const { data: serviceData } = await supabase
      .from('services')
      .select('name, duration_minutes')
      .eq('id', serviceId)
      .single();

    console.log('📊 [CREATE_APPOINTMENT] Basic data retrieved:', {
      user: userData?.user?.user_metadata?.name,
      pet: petData?.name,
      service: serviceData?.name,
      duration: serviceData?.duration_minutes
    });

    let providerData = null;
    
    // Get provider data if provider is selected
    if (providerProfileId) {
      console.log('👥 [CREATE_APPOINTMENT] Fetching provider data for:', providerProfileId);

      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('user_id, type')
        .eq('id', providerProfileId)
        .single();
      
      console.log('📊 [CREATE_APPOINTMENT] Provider profile data:', providerProfile);

      if (providerProfile) {
        // Get user name for the provider
        const { data: providerUserData } = await supabase
          .from('clients')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        const { data: groomerData } = await supabase
          .from('groomers')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        const { data: vetData } = await supabase
          .from('veterinarians')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        providerData = {
          id: providerProfileId,
          user_id: providerProfile.user_id,
          name: providerUserData?.name || groomerData?.name || vetData?.name || 'Provider'
        };

        console.log('✅ [CREATE_APPOINTMENT] Provider data assembled:', providerData);
      }
    }

    // 🔧 FIXED: Ensure time slot is in correct HH:MM:SS format
    let formattedTimeSlot = timeSlot;
    
    // If timeSlot is already in HH:MM:SS format, use it as-is
    // If it's in HH:MM format, add :00
    if (timeSlot.split(':').length === 2) {
      formattedTimeSlot = timeSlot + ':00';
    } else if (timeSlot.split(':').length === 3) {
      formattedTimeSlot = timeSlot; // Already in correct format
    }

    console.log('🕐 [CREATE_APPOINTMENT] Time slot formatting:', {
      original_time_slot: timeSlot,
      formatted_time_slot: formattedTimeSlot,
      segments_original: timeSlot.split(':').length,
      segments_formatted: formattedTimeSlot.split(':').length
    });

    // ✅ SIMPLIFIED: Direct booking call with enhanced error handling
    const bookingParams = {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerProfileId ? [providerProfileId] : [],
      _booking_date: isoDate,
      _time_slot: formattedTimeSlot, // Use properly formatted time slot
      _notes: notes || null
    };

    console.log('📤 [CREATE_APPOINTMENT] 🔥 CALLING create_booking_atomic RPC:', bookingParams);
    
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', bookingParams);

    console.log('📨 [CREATE_APPOINTMENT] 🔥 RPC create_booking_atomic RESPONSE:', {
      appointmentId,
      error,
      success: !error && !!appointmentId,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [CREATE_APPOINTMENT] RPC ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        full_error: error
      });
      
      // Enhanced error message handling
      let userErrorMessage = 'Erro no agendamento';
      
      if (error.message.includes('not available') || error.message.includes('Provider') && error.message.includes('not available')) {
        userErrorMessage = 'Profissional não disponível para o horário selecionado.';
      } else if (error.message.includes('capacity exceeded') || error.message.includes('Shower capacity exceeded')) {
        userErrorMessage = 'Capacidade de banho excedida para este horário.';
      } else if (error.message.includes('conflicting appointment')) {
        userErrorMessage = 'Profissional já tem compromisso neste horário.';
      } else if (error.message.includes('Vagas de banho esgotadas')) {
        userErrorMessage = 'Vagas de banho esgotadas para este horário.';
      } else if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
        userErrorMessage = 'Erro de permissão. Verifique se você está logado.';
      } else if (error.message.includes('violates')) {
        userErrorMessage = 'Erro de validação de dados.';
      } else if (error.message.includes('invalid input syntax for type time')) {
        userErrorMessage = 'Formato de horário inválido. Por favor, tente novamente.';
      } else {
        userErrorMessage = `Erro: ${error.message}`;
      }
      
      toast.error(userErrorMessage);
      
      return { 
        success: false, 
        error: {
          ...error,
          userMessage: userErrorMessage
        }
      };
    }

    if (!appointmentId) {
      console.error('❌ [CREATE_APPOINTMENT] NO APPOINTMENT ID: RPC succeeded but returned no ID');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return { 
        success: false, 
        error: 'No appointment ID returned from RPC'
      };
    }

    // Prepare booking data for success page
    const bookingData = {
      appointmentId,
      petName: petData?.name || 'Pet',
      serviceName: serviceData?.name || 'Serviço',
      date: isoDate,
      time: timeSlot,
      providerName: providerData?.name,
      notes,
      userName: userData?.user?.user_metadata?.name || 'Cliente',
      userEmail: userData?.user?.email
    };

    console.log('🎉 [CREATE_APPOINTMENT] BOOKING SUCCESS:', {
      appointmentId,
      bookingData,
      timestamp: new Date().toISOString()
    });
    toast.success('Agendamento enviado com sucesso!');
    
    return { 
      success: true, 
      appointmentId, 
      bookingData 
    };

  } catch (error: unknown) {
    console.error('💥 [CREATE_APPOINTMENT] CRITICAL ERROR:', {
      error_message: error?.message,
      error_stack: error?.stack,
      full_error: error,
      timestamp: new Date().toISOString()
    });
    toast.error('Erro crítico no sistema de agendamento');
    return { 
      success: false, 
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        fullError: error
      }
    };
  }
}

// Helper function to get service resource requirements
export async function getServiceResources(serviceId: string) {
  try {
    const { data, error } = await supabase
      .from('service_resources')
      .select('*')
      .eq('service_id', serviceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching service resources:', error);
    return [];
  }
}

// Helper function to check if service requires shower
export async function serviceRequiresShower(serviceId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('service_resources')
      .select('resource_type')
      .eq('service_id', serviceId)
      .eq('resource_type', 'shower')
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

// Debug function to audit current system state
export async function auditBookingSystemState() {
  console.log('🔍 SYSTEM STATE AUDIT:');
  
  try {
    // Check services and their resources
    const { data: services } = await supabase.from('services').select('*');
    const { data: serviceResources } = await supabase.from('service_resources').select('*');
    
    console.log('📋 SERVICES:', services);
    console.log('🔧 SERVICE RESOURCES:', serviceResources);
    
    // Check availability data for today
    const today = new Date().toISOString().split('T')[0];
    const { data: showerAvail } = await supabase
      .from('shower_availability')
      .select('*')
      .eq('date', today)
      .order('time_slot');
    
    const { data: providerAvail } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('date', today)
      .order('time_slot');
    
    console.log('🚿 SHOWER AVAILABILITY TODAY:', showerAvail);
    console.log('👨‍⚕️ PROVIDER AVAILABILITY TODAY:', providerAvail);
    
    // Check provider profiles
    const { data: providers } = await supabase.from('provider_profiles').select('*');
    console.log('👥 PROVIDER PROFILES:', providers);
    
  } catch (error) {
    console.error('❌ AUDIT ERROR:', error);
  }
}
