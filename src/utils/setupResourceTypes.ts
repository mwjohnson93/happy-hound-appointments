
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const setupResourceTypes = async () => {
  try {
    console.log('🔧 Setting up resource types...');

    // Define the resource types with their capacities
    const resourceTypes = [
      {
        name: 'groomer',
        description: 'Individual groomer - 1 appointment per 30min slot',
        slot_duration_minutes: 30,
        capacity_per_slot: 1
      },
      {
        name: 'shower',
        description: 'Shared shower resource for animal baths - 5 animals per 30min slot',
        slot_duration_minutes: 30,
        capacity_per_slot: 5
      },
      {
        name: 'veterinary',
        description: 'Individual veterinarian - capacity varies by service',
        slot_duration_minutes: 30,
        capacity_per_slot: 1
      }
    ];

    // Insert or update resource types
    for (const resourceType of resourceTypes) {
      // TODO: Table 'resource_types' does not exist in current schema; cannot upsert
      // Uncomment or fix below if/when resource_types table exists
      // const { error } = await supabase
      //   .from('resource_types')
      //   .upsert(resourceType, { onConflict: 'name' });

      // if (error) {
      //   console.error(`Error setting up resource type ${resourceType.name}:`, error);
      //   throw error;
      // }
    }

    console.log('✅ Resource types set up successfully');
    return true;
  } catch (error: unknown) {
    console.error('💥 Error setting up resource types:', error);
    toast.error('Erro ao configurar tipos de recursos');
    return false;
  }
};
