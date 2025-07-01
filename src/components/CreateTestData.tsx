
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateTestData = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createTestData = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating test data...');

      // Create test groomers in provider_profiles table
      const groomerProfiles = [
        { id: 'groomer-profile-1', user_id: null, type: 'groomer', bio: 'Especialista em tosa criativa' },
        { id: 'groomer-profile-2', user_id: null, type: 'groomer', bio: 'Tosa profissional há 10 anos' },
        { id: 'groomer-profile-3', user_id: null, type: 'groomer', bio: 'Especialista em raças grandes' }
      ];

      // Create test vets in provider_profiles table
      const vetProfiles = [
        { id: 'vet-profile-1', user_id: null, type: 'vet', bio: 'Veterinário clínico geral' },
        { id: 'vet-profile-2', user_id: null, type: 'vet', bio: 'Especialista em dermatologia' }
      ];

      // Insert groomer profiles
      const { error: groomerError } = await supabase
        .from('provider_profiles')
        .upsert(groomerProfiles, { onConflict: 'id' });

      if (groomerError) throw groomerError;

      // Insert vet profiles
      const { error: vetError } = await supabase
        .from('provider_profiles')
        .upsert(vetProfiles, { onConflict: 'id' });

      if (vetError) throw vetError;

      // Create availability for the next 7 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create time slots
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }

      const availabilitySlots = [];

      // Create availability for all profiles
      const allProfiles = [...groomerProfiles, ...vetProfiles];
      for (const profile of allProfiles) {
        for (const dateStr of dates) {
          for (const timeSlot of timeSlots) {
            availabilitySlots.push({
              provider_id: profile.id,
              date: dateStr,
              time_slot: timeSlot,
              available: true
            });
          }
        }
      }

      // Insert availability
      const { error: availabilityError } = await supabase
        .from('provider_availability')
        .upsert(availabilitySlots, { onConflict: 'provider_id,date,time_slot' });

      if (availabilityError) throw availabilityError;

      console.log('✅ Test data created successfully with availability for next 7 days');
      toast.success('Dados de teste criados com sucesso!');

    } catch (error: unknown) {
      console.error('💥 Error creating test data:', error);
      toast.error('Erro ao criar dados de teste: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const createProviderAvailability = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating availability for all registered providers...');

      // Get all registered providers from the database
      const { data: registeredProviders, error: providerFetchError } = await supabase
        .from('provider_profiles')
        .select('id, type');

      if (providerFetchError) throw providerFetchError;

      if (!registeredProviders || registeredProviders.length === 0) {
        toast.info('Nenhum provedor encontrado no sistema');
        return;
      }

      // Create availability for the next 14 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      console.log(`📅 Creating availability for ${registeredProviders.length} providers for next 14 days`);

      // Create time slots
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }

      const availabilitySlots = [];

      // Create availability for all registered providers
      for (const provider of registeredProviders) {
        console.log(`👨‍💼 Processing provider: ${provider.type} (${provider.id})`);
        
        for (const dateStr of dates) {
          for (const timeSlot of timeSlots) {
            availabilitySlots.push({
              provider_id: provider.id,
              date: dateStr,
              time_slot: timeSlot,
              available: true
            });
          }
        }
      }

      // Insert availability in batches
      const batchSize = 100;
      for (let i = 0; i < availabilitySlots.length; i += batchSize) {
        const batch = availabilitySlots.slice(i, i + batchSize);
        const { error: batchError } = await supabase
          .from('provider_availability')
          .upsert(batch, { onConflict: 'provider_id,date,time_slot' });

        if (batchError) {
          console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, batchError);
        }
      }

      console.log('✅ Availability created for all registered providers');
      toast.success(`Disponibilidade criada para ${registeredProviders.length} provedores!`);

    } catch (error: unknown) {
      console.error('💥 Error creating provider availability:', error);
      toast.error('Erro ao criar disponibilidade: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Dados de Teste</CardTitle>
          <CardDescription>
            Criar provedores de teste com disponibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createTestData} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Criando...' : 'Criar Dados de Teste'}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Disponibilidade para Provedores</CardTitle>
          <CardDescription>
            Criar disponibilidade para todos os provedores registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createProviderAvailability} 
            disabled={isCreating}
            className="w-full"
            variant="outline"
          >
            {isCreating ? 'Criando...' : 'Criar Disponibilidade'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTestData;
