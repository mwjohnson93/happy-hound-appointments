
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateAvailabilitySlots = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const createAvailabilityForDate = async (date: string) => {
    try {
      console.log('🔧 Creating availability slots for date:', date);

      // Get all groomers from provider_profiles
      const { data: groomers, error: groomersError } = await supabase
        .from('provider_profiles')
        .select('id, user_id')
        .eq('type', 'groomer');

      if (groomersError) throw groomersError;

      // Get all veterinarians from provider_profiles
      const { data: vets, error: vetsError } = await supabase
        .from('provider_profiles')
        .select('id, user_id')
        .eq('type', 'vet');

      if (vetsError) throw vetsError;

      // Create time slots from 09:00 to 17:00 (every 30 minutes)
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }

      const availabilitySlots = [];

      // Create groomer availability
      for (const groomer of groomers || []) {
        for (const timeSlot of timeSlots) {
          availabilitySlots.push({
            provider_id: groomer.id,
            date: date,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      // Create veterinarian availability
      for (const vet of vets || []) {
        for (const timeSlot of timeSlots) {
          availabilitySlots.push({
            provider_id: vet.id,
            date: date,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      console.log('📅 Inserting availability slots to provider_availability:', availabilitySlots.length);

      // Insert all availability slots
      const { error: insertError } = await supabase
        .from('provider_availability')
        .upsert(availabilitySlots, { onConflict: 'provider_id,date,time_slot' });

      if (insertError) throw insertError;

      console.log('✅ Availability slots created successfully');
      return true;
    } catch (error: unknown) {
      console.error('💥 Error creating availability slots:', error);
      throw error;
    }
  };

  const handleCreateAvailability = async () => {
    setIsLoading(true);
    try {
      await createAvailabilityForDate(selectedDate);
      toast.success(`Disponibilidade criada para ${selectedDate}!`);
    } catch (error) {
      toast.error('Erro ao criar disponibilidade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWeekAvailability = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(selectedDate);
      const promises = [];
      
      // Create availability for the next 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(createAvailabilityForDate(dateStr));
      }
      
      await Promise.all(promises);
      toast.success('Disponibilidade criada para os próximos 7 dias!');
    } catch (error) {
      toast.error('Erro ao criar disponibilidade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar Disponibilidade</CardTitle>
        <CardDescription>
          Crie horários disponíveis para tosadores e veterinários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={handleCreateAvailability} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Criando...' : 'Criar para Esta Data'}
          </Button>
          
          <Button 
            onClick={handleCreateWeekAvailability} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Criando...' : 'Criar para 7 Dias'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• Tosadores: 1 agendamento por slot de 30min</p>
          <p>• Veterinários: 1 consulta por slot de 30min</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateAvailabilitySlots;
