import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dog, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentWithDetails {
  id: string;
  pet_name: string;
  service_name: string;
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  service_status?: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  provider_name?: string;
}

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load user's appointments from the database with detailed information
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching appointments for user:', user.id);
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time,
            status,
            service_status,
            notes,
            user_id,
            provider_id,
            pets:pet_id (name),
            services:service_id (name)
          `)
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Raw appointments data:', data);
        
        if (data) {
          // Get provider details for each appointment that has a provider
          const formattedData = await Promise.all(
            data.map(async (apt) => {
              let providerName = null;
              if (apt.provider_id) {
                const { data: providerData } = await supabase
                  .from('provider_profiles')
                  .select('user_id')
                  .eq('id', apt.provider_id)
                  .single();
                
                if (providerData?.user_id) {
                  const { data: providerUserData } = await supabase.auth.admin.getUserById(providerData.user_id);
                  providerName = providerUserData.user?.user_metadata?.name || null;
                }
              }

              return {
                id: apt.id,
                pet_name: apt.pets?.name || 'Pet',
                service_name: apt.services?.name || 'Serviço',
                date: new Date(apt.date),
                time: apt.time,
                status: apt.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
                service_status: apt.service_status as 'not_started' | 'in_progress' | 'completed' | undefined,
                notes: apt.notes || undefined,
                provider_name: providerName
              };
            })
          );
          
          console.log('Formatted appointments:', formattedData);
          setAppointments(formattedData);
        }
      } catch (error: unknown) {
        console.error('Error fetching appointments:', error.message);
        toast.error('Erro ao carregar os agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user]);
  
  const cancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setAppointments(
        appointments.map(appointment => 
          appointment.id === id
            ? { ...appointment, status: 'cancelled' as const }
            : appointment
        )
      );
      
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        toast.success(`Agendamento para ${appointment.pet_name} foi cancelado.`);
      }
    } catch (error: unknown) {
      console.error('Error cancelling appointment:', error.message);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const getStatusBadge = (status: string, serviceStatus?: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando Aprovação
          </Badge>
        );
      case 'confirmed':
        // Show service status for confirmed appointments
        if (serviceStatus) {
          switch (serviceStatus) {
            case 'not_started':
              return (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Confirmado - Não Iniciado
                </Badge>
              );
            case 'in_progress':
              return (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Play className="w-3 h-3 mr-1" />
                  Em Andamento
                </Badge>
              );
            case 'completed':
              return (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Serviço Concluído
                </Badge>
              );
          }
        }
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  const AppointmentDetailCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Dog className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold text-lg">{appointment.pet_name}</h3>
            <p className="text-sm text-muted-foreground">{appointment.service_name}</p>
          </div>
        </div>
        {getStatusBadge(appointment.status, appointment.service_status)}
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <span className="font-medium w-20">Data:</span>
          <span>{format(appointment.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium w-20">Horário:</span>
          <span>{appointment.time}</span>
        </div>
        {appointment.provider_name && (
          <div className="flex items-center text-sm">
            <span className="font-medium w-20">Profissional:</span>
            <span>{appointment.provider_name}</span>
          </div>
        )}
        {appointment.notes && (
          <div className="flex items-start text-sm">
            <span className="font-medium w-20">Notas:</span>
            <span className="flex-1">{appointment.notes}</span>
          </div>
        )}
      </div>

      {appointment.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <Clock className="w-4 h-4 inline mr-1" />
            Aguardando aprovação da nossa equipe. Você receberá uma confirmação em breve.
          </p>
        </div>
      )}

      {/* Only show cancel button for pending appointments */}
      {appointment.status === 'pending' && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => cancelAppointment(appointment.id)}
          className="w-full sm:w-auto"
        >
          Cancelar Agendamento
        </Button>
      )}
    </div>
  );
  
  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'pending' || apt.status === 'confirmed'
  );
  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || apt.status === 'cancelled'
  );

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Meus <span className="text-primary">Agendamentos</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize e gerencie todos os seus agendamentos de tosa.
          </p>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="upcoming">
                Próximos {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}
              </TabsTrigger>
              <TabsTrigger value="past">
                Passados {pastAppointments.length > 0 && `(${pastAppointments.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Carregando agendamentos...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingAppointments.map(appointment => (
                    <AppointmentDetailCard 
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                  <Dog className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
                  <h3 className="text-xl font-bold mb-2">Nenhum Agendamento Próximo</h3>
                  <p className="text-muted-foreground mb-6">
                    Você não tem nenhum agendamento de tosa próximo.
                  </p>
                  <Button asChild>
                    <Link to="/book">Agendar uma Tosa</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Carregando agendamentos...</p>
                </div>
              ) : pastAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastAppointments.map(appointment => (
                    <AppointmentDetailCard 
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                  <Dog className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
                  <h3 className="text-xl font-bold mb-2">Nenhum Agendamento Passado</h3>
                  <p className="text-muted-foreground mb-6">
                    Seu histórico de agendamentos aparecerá aqui depois que você tiver serviços conosco.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Appointments;
