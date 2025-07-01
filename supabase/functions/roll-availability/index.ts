
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting daily availability roll...');

    // Call the database function to roll provider availability
    const { error: providerError } = await supabase.rpc('roll_daily_availability');

    if (providerError) {
      console.error('❌ Error rolling provider availability:', providerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Provider availability error: ${providerError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Provider availability rolled successfully');

    // Generate shower availability for the target date (today + 90 days)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 90);
    const dateString = targetDate.toISOString().split('T')[0];

    console.log(`🚿 Adding shower availability for ${dateString}`);

    // Generate time slots (09:00-16:30 every 30 minutes)
    const timeSlots = [];
    for (let hour = 9; hour < 17; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
      if (hour < 16) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
      }
    }

    // Create availability entries
    const showerSlots = timeSlots.map((time) => ({
      date: dateString,
      time_slot: time,
      available_spots: 5,
    }));

    console.log(`📋 Inserting ${showerSlots.length} shower slots for ${dateString}`);

    // Insert shower availability slots
    const { error: showerError } = await supabase
      .from('shower_availability')
      .upsert(showerSlots, {
        onConflict: 'date,time_slot'
      });

    if (showerError) {
      console.error('❌ Error inserting shower availability:', showerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Shower availability error: ${showerError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Shower availability added successfully');
    console.log('🎉 Daily availability roll completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily availability rolled successfully',
        details: {
          providerAvailability: 'Updated via roll_daily_availability function',
          showerAvailability: `Added ${showerSlots.length} slots for ${dateString}`,
          targetDate: dateString
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('💥 Unexpected error in roll-availability:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
