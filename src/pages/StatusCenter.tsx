import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, PawPrint, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  pet_name: string;
  service_name: string;
  user_name: string;
  user_email: string;
  provider_name?: string;
}

function StatusCenter() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get appointments with related data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          notes,
          user_id,
          provider_id,
          pets:pet_id (name),
          services:service_id (name)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        throw appointmentError;
      }

      if (!appointmentData || appointmentData.length === 0) {
        setAppointments([]);
        return;
      }

      // Get user data for each appointment
      const appointmentsWithUserData = await Promise.all(
        appointmentData.map(async (apt) => {
          // Get user data from clients table
          const { data: userData } = await supabase
            .from('clients')
            .select('name')
            .eq('user_id', apt.user_id)
            .single();

          // Get provider data if provider_id exists
          let providerName = null;
          if (apt.provider_id) {
            const { data: providerProfile } = await supabase
              .from('provider_profiles')
              .select('user_id')
              .eq('user_id', apt.provider_id)
              .single();
            
            if (providerProfile?.user_id) {
              const { data: providerData } = await supabase
                .from('groomers')
                .select('name')
                .eq('user_id', providerProfile.user_id)
                .single();
              
              if (!providerData) {
                const { data: vetData } = await supabase
                  .from('veterinarians')
                  .select('name')
                  .eq('user_id', providerProfile.user_id)
                  .single();
                providerName = vetData?.name;
              } else {
                providerName = providerData.name;
              }
            }
          }
          
          return {
            id: apt.id,
            date: apt.date,
            time: apt.time,
            status: apt.status,
            notes: apt.notes,
            pet_name: apt.pets?.name || 'Pet',
            service_name: apt.services?.name || 'Serviço',
            user_name: userData?.name || 'Cliente',
            user_email: 'N/A', // We don't have direct access to email from clients table
            provider_name: providerName
          };
        })
      );

      setAppointments(appointmentsWithUserData);
    } catch (err: any) {
      console.error('Error in fetchAppointments:', err);
      setError('Erro ao carregar dados dos agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'confirmed':
        return 'default';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <section className="bg-secondary/50 py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-semibold text-center">Central de Status</h1>
            <p className="text-muted-foreground text-center mt-2">
              Acompanhe os agendamentos e o status dos serviços.
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="container mx-auto px-4">
            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="flex items-center gap-2 pt-6">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando agendamentos...</p>
              </div>
            ) : appointments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum agendamento encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há agendamentos registrados no sistema no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointments.map((appointment) => (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <PawPrint className="h-4 w-4" />
                          {appointment.pet_name}
                        </CardTitle>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {appointment.service_name} - {appointment.user_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{appointment.time}</span>
                      </div>
                      {appointment.provider_name && (
                        <div className="text-sm">
                          <span className="font-medium">Profissional:</span> {appointment.provider_name}
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">Observações:</span> {appointment.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default StatusCenter;
