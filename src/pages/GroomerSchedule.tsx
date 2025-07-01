
import { useState, useEffect } from 'react';
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
}

const GroomerSchedule = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);

  // Generate default time slots (8am to 5pm)
  const generateDefaultSlots = (): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    for (let hour = 8; hour < 17; hour++) {
      slots.push({
        id: `${hour}:00`,
        time: `${hour}:00`,
        available: true
      });
      if (hour < 16) {
        slots.push({
          id: `${hour}:30`,
          time: `${hour}:30`,
          available: true
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
      
      // Query provider_availability table
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerProfileId)
        .eq('date', dateStr);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching availability:', error);
      }

      if (data && data.length > 0) {
        const slots = generateDefaultSlots().map(slot => {
          const dbSlot = data.find(d => d.time_slot === slot.time);
          return {
            ...slot,
            available: dbSlot ? dbSlot.available : true
          };
        });
        setAvailabilitySlots(slots);
      } else {
        setAvailabilitySlots(generateDefaultSlots());
      }
    } catch (error: unknown) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
      setAvailabilitySlots(generateDefaultSlots());
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (timeSlot: string) => {
    if (!selectedDate || !providerProfileId) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentSlot = availabilitySlots.find(slot => slot.time === timeSlot);
    if (!currentSlot) return;

    const newAvailability = !currentSlot.available;

    try {
      // Use direct query to insert into the provider_availability table
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Minha Agenda</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data para configurar sua disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date() || date.getDay() === 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Disponibilidade para {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
              <CardDescription>
                {isWeekend ? 'Fechado aos domingos' : 'Configure seus horários disponíveis'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : isWeekend ? (
                <p className="text-muted-foreground">Não atendemos aos domingos.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {availabilitySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={slot.id} className="font-medium">
                          {slot.time}
                        </Label>
                        <Switch
                          id={slot.id}
                          checked={slot.available}
                          onCheckedChange={() => toggleAvailability(slot.time)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const allAvailable = availabilitySlots.every(slot => slot.available);
                        availabilitySlots.forEach(slot => {
                          if (slot.available === allAvailable) {
                            toggleAvailability(slot.time);
                          }
                        });
                      }}
                      className="w-full"
                    >
                      {availabilitySlots.every(slot => slot.available) ? 'Desabilitar Tudo' : 'Habilitar Tudo'}
                    </Button>
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

export default GroomerSchedule;
