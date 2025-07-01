
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  pet_name: string;
  service: string;
  time: string;
  owner_name: string;
  status: string;
  notes?: string;
}

const GroomerCalendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedDate && user) {
      fetchAppointments();
    }
  }, [selectedDate, user]);

  const fetchAppointments = async () => {
    if (!selectedDate || !user) return;
    
    setIsLoading(true);
    try {
      // First get the provider profile for this user
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'groomer')
        .single();

      if (profileError || !providerProfile) {
        console.error('Provider profile not found:', profileError);
        setAppointments([]);
        return;
      }

      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', providerProfile.id)
        .eq('date', dateStr)
        .order('time');

      if (error) throw error;

      // Map for AppointmentCard
      const displayData: Appointment[] = (data ?? []).map((apt) => ({
        id: apt.id,
        pet_name: 'Pet',
        service: 'Serviço',
        time: apt.time,
        owner_name: 'Cliente',
        status: apt.status,
        notes: apt.notes,
      }));

      setAppointments(displayData);
    } catch (error: unknown) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );
      
      toast.success('Status atualizado com sucesso');
    } catch (error: unknown) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Calendário de Agendamentos</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data para ver os agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Agendamentos para {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
              <CardDescription>
                {appointments.length} agendamento(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{appointment.time}</h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} - {appointment.owner_name}
                          </p>
                        </div>
                        <Badge variant={
                          appointment.status === 'completed' ? 'default' :
                          appointment.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }>
                          {appointment.status === 'upcoming' ? 'Agendado' :
                           appointment.status === 'completed' ? 'Concluído' :
                           'Cancelado'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-2"><strong>Serviço:</strong> {appointment.service}</p>
                      {appointment.notes && (
                        <p className="text-sm mb-2"><strong>Observações:</strong> {appointment.notes}</p>
                      )}
                      
                      {appointment.status === 'upcoming' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          >
                            Marcar como Concluído
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
export default GroomerCalendar;
