
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TIME_SLOT_CONFIG } from '@/utils/timeSlotConfig';
import { toast } from 'sonner';

interface AvailabilityFallbackProps {
  targetDate?: Date;
  onAvailabilityEnsured?: () => void;
}

export default function AvailabilityFallback({ 
  targetDate = new Date(), 
  onAvailabilityEnsured 
}: AvailabilityFallbackProps) {
  const [isChecking, setIsChecking] = useState(false);

  const ensureAvailabilityExists = async (date: Date) => {
    setIsChecking(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if shower availability exists for this date
      const { data: showerData, error: showerError } = await supabase
        .from('shower_availability')
        .select('date')
        .eq('date', dateStr)
        .limit(1);

      if (showerError) {
        console.error('Error checking shower availability:', showerError);
        return;
      }

      // If no availability exists, generate it
      if (!showerData || showerData.length === 0) {
        console.log('🔧 No availability found for', dateStr, '- generating...');
        
        // Call database function to ensure availability
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + TIME_SLOT_CONFIG.SHOWER_DAYS);
        
        const { error: ensureError } = await supabase.rpc('ensure_shower_availability', {
          start_date: dateStr,
          end_date: endDate.toISOString().split('T')[0]
        });

        if (ensureError) {
          console.error('Error ensuring availability:', ensureError);
          toast.error('Erro ao gerar disponibilidade automaticamente');
        } else {
          console.log('✅ Availability generated successfully');
          onAvailabilityEnsured?.();
        }
      }
    } catch (error: unknown) {
      console.error('Error in availability fallback:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    ensureAvailabilityExists(targetDate);
  }, [targetDate]);

  // This component is invisible but ensures availability exists
  return null;
}
