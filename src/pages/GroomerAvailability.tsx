
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id: string;
  time: string;
  available: boolean;
  hasAppointment: boolean;
}

const GroomerAvailability = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);

  // Generate default time slots (9am to 5pm)
  const generateDefaultSlots = (): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push({
        id: `${hour}:00`,
        time: `${hour}:00`,
        available: true,
        hasAppointment: false
      });
      if (hour < 16) {
        slots.push({
          id: `${hour}:30`,
          time: `${hour}:30`,
          available: true,
          hasAppointment: false
        });
      }
    }
    return slots;
  };

  useEffect(() => {
    if (user) {
      getProviderProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && providerProfileId) {
      fetchAvailability();
    }
  }, [selectedDate, providerProfileId]);

  const getProviderProfile = async () => {
    if (!user) return;

    try {
      const { data: providerProfile, error } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'groomer')
        .single();

      if (error) {
        console.error('Error fetching provider profile:', error);
        return;
      }

      setProviderProfileId(providerProfile?.id || null);
    } catch (error) {
      console.error('Error getting provider profile:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDate || !providerProfileId) return;
    
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get provider availability
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerProfileId)
        .eq('date', dateStr);

      if (availError && availError.code !== 'PGRST116') {
        console.error('Error fetching availability:', availError);
      }

      // Get existing appointments for this date
      const { data: appointmentData, error: apptError } = await supabase
        .from('appointments')
        .select(`
          time,
          services!inner(duration_minutes),
          appointment_providers!inner(provider_id)
        `)
        .eq('appointment_providers.provider_id', providerProfileId)
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (apptError) {
        console.error('Error fetching appointments:', apptError);
      }

      // Generate slots with availability and appointment info
      const slots = generateDefaultSlots().map(slot => {
        const providerAvailability = availability?.find(a => a.time_slot === slot.time);
        const isProviderAvailable = providerAvailability ? providerAvailability.available : true;
        
        // Check if there's an appointment at this time slot
        const hasAppointment = appointmentData?.some(apt => {
          const appointmentTime = apt.time;
          const duration = apt.services?.duration_minutes || 30;
          const appointmentEndTime = new Date(`1970-01-01 ${appointmentTime}`);
          appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + duration);
          
          const slotTime = new Date(`1970-01-01 ${slot.time}`);
          
          return slotTime >= new Date(`1970-01-01 ${appointmentTime}`) && 
                 slotTime < appointmentEndTime;
        }) || false;

        return {
          ...slot,
          available: isProviderAvailable,
          hasAppointment
        };
      });

      setAvailabilitySlots(slots);
    } catch (error: unknown) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (timeSlot: string) => {
    if (!selectedDate || !providerProfileId) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentSlot = availabilitySlots.find(slot => slot.time === timeSlot);
    if (!currentSlot) return;

    // Don't allow changing availability if there's an appointment
    if (currentSlot.hasAppointment) {
      toast.error('Não é possível alterar disponibilidade de horários com agendamentos');
      return;
    }

    // Don't allow changing availability for today or past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    
    if (selectedDateStart <= today) {
      toast.error('Não é possível alterar disponibilidade para hoje ou datas passadas');
      return;
    }

    const newAvailability = !currentSlot.available;

    try {
      const { error } = await supabase
        .from('provider_availability')
        .upsert({
          provider_id: providerProfileId,
          date: dateStr,
          time_slot: timeSlot,
          available: newAvailability
        }, {
          onConflict: 'provider_id,date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setAvailabilitySlots(prev => 
        prev.map(slot => 
          slot.time === timeSlot 
            ? { ...slot, available: newAvailability }
            : slot
        )
      );

      toast.success('Disponibilidade atualizada');
    } catch (error: unknown) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const isWeekend = selectedDate?.getDay() === 0; // Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateStart = selectedDate ? new Date(selectedDate) : new Date();
  selectedDateStart.setHours(0, 0, 0, 0);
  const isPastOrToday = selectedDateStart <= today;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Gerenciar Disponibilidade</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data futura para configurar sua disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => {
                  const dateStart = new Date(date);
                  dateStart.setHours(0, 0, 0, 0);
                  return dateStart <= today || date.getDay() === 0;
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Disponibilidade para {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
              <CardDescription>
                {isWeekend ? 'Fechado aos domingos' : 
                 isPastOrToday ? 'Não é possível editar datas passadas ou de hoje' :
                 'Configure seus horários disponíveis'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : isWeekend ? (
                <p className="text-muted-foreground">Não atendemos aos domingos.</p>
              ) : isPastOrToday ? (
                <p className="text-muted-foreground">Selecione uma data futura para editar a disponibilidade.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {availabilitySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={slot.id} className="font-medium">
                          {slot.time}
                          {slot.hasAppointment && (
                            <span className="ml-2 text-xs text-blue-600">(Agendado)</span>
                          )}
                        </Label>
                        <Switch
                          id={slot.id}
                          checked={slot.available}
                          onCheckedChange={() => toggleAvailability(slot.time)}
                          disabled={slot.hasAppointment}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const slotsWithoutAppointments = availabilitySlots.filter(slot => !slot.hasAppointment);
                        const allAvailable = slotsWithoutAppointments.every(slot => slot.available);
                        slotsWithoutAppointments.forEach(slot => {
                          if (slot.available === allAvailable) {
                            toggleAvailability(slot.time);
                          }
                        });
                      }}
                      className="w-full"
                    >
                      {availabilitySlots.filter(slot => !slot.hasAppointment).every(slot => slot.available) 
                        ? 'Desabilitar Tudo' 
                        : 'Habilitar Tudo'}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>• Horários com agendamentos não podem ter a disponibilidade alterada</p>
                    <p>• Não é possível alterar disponibilidade para hoje ou datas passadas</p>
                    <p>• Use esta ferramenta para planejar seus horários futuros</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerAvailability;
