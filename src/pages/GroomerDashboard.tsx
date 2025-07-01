import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, Settings } from 'lucide-react';

interface Appointment {
  id: string;
  pet_name: string;
  service: string;
  time: string;
  owner_name: string;
  status: string;
  notes?: string;
  service_duration?: number;
  date: string;
}

const GroomerDashboard = () => {
  const { user } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);

  // Get provider profile ID for the current user
  const fetchProviderProfileId = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'groomer')
        .single();

      if (error) {
        console.error('Error fetching provider profile:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      return null;
    }
  };

  // Initialize provider profile
  useEffect(() => {
    const initialize = async () => {
      if (user) {
        const profileId = await fetchProviderProfileId();
        setProviderProfileId(profileId);
      }
    };
    initialize();
  }, [user]);

  useEffect(() => {
    if (providerProfileId) {
      fetchAppointments();
    }
  }, [providerProfileId]);

  const fetchAppointments = async () => {
    if (!providerProfileId) return;
    
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      // Fetch appointments using appointment_providers table
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services!inner(name, duration_minutes),
          pets!inner(name),
          clients!inner(name),
          appointment_providers!inner(provider_id)
        `)
        .eq('appointment_providers.provider_id', providerProfileId)
        .gte('date', today)
        .lte('date', nextWeekStr)
        .in('status', ['pending', 'confirmed'])
        .order('date')
        .order('time');

      if (error) throw error;
      
      const enhancedAppointments = (data || []).map((apt: any) => ({
        id: apt.id,
        pet_name: apt.pets?.name || 'Pet',
        service: apt.services?.name || 'Service',
        owner_name: apt.clients?.name || 'Client',
        time: apt.time,
        status: apt.status,
        notes: apt.notes ?? undefined,
        service_duration: apt.services?.duration_minutes || 30,
        date: apt.date,
      }));

      // Split into today and upcoming
      const todayAppts = enhancedAppointments.filter((apt: Appointment) => apt.date === today);
      const upcomingAppts = enhancedAppointments.filter((apt: Appointment) => apt.date > today);
      
      setTodayAppointments(todayAppts);
      setUpcomingAppointments(upcomingAppts);
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
      
      // Log the status change
      await supabase.from('appointment_events').insert({
        appointment_id: appointmentId,
        event_type: newStatus as any,
        notes: `Status changed to ${newStatus} by provider`,
        created_by: user?.id
      });
      
      // Update both arrays
      const updateAppointment = (apt: Appointment) => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt;
      
      setTodayAppointments(prev => prev.map(updateAppointment));
      setUpcomingAppointments(prev => prev.map(updateAppointment));
      
      toast.success('Status atualizado com sucesso');
    } catch (error: unknown) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getNextAppointment = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Check if there are appointments later today
    const laterToday = todayAppointments
      .filter(apt => apt.time > currentTime)
      .sort((a, b) => a.time.localeCompare(b.time));
    
    if (laterToday.length > 0) {
      return laterToday[0];
    }
    
    // Otherwise, return the earliest upcoming appointment
    return upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  };

  const nextAppointment = getNextAppointment();

  if (!providerProfileId) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600">Erro: Perfil de tosador não encontrado</p>
              <p className="text-sm text-muted-foreground">Entre em contato com o suporte</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Painel do Tosador</h1>
          <Link to="/groomer-availability">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Gerenciar Disponibilidade
            </Button>
          </Link>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Serviço</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div>
                  <div className="text-2xl font-bold">{nextAppointment.time}</div>
                  <p className="text-xs text-muted-foreground">
                    {nextAppointment.pet_name} - {nextAppointment.service}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(nextAppointment.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum serviço agendado</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                {todayAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                próximos {upcomingAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos de Hoje</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : todayAppointments.length === 0 ? (
                <p className="text-muted-foreground">Nenhum agendamento para hoje.</p>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{appointment.time}</h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} - {appointment.owner_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duração: {appointment.service_duration || 30} min
                          </p>
                        </div>
                        <Badge variant={
                          appointment.status === 'completed' ? 'default' :
                          appointment.status === 'confirmed' ? 'default' :
                          appointment.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }>
                          {appointment.status === 'pending' ? 'Pendente' :
                           appointment.status === 'confirmed' ? 'Confirmado' :
                           appointment.status === 'completed' ? 'Concluído' :
                           appointment.status === 'cancelled' ? 'Cancelado' :
                           appointment.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-2"><strong>Serviço:</strong> {appointment.service}</p>
                      {appointment.notes && (
                        <p className="text-sm mb-2"><strong>Observações:</strong> {appointment.notes}</p>
                      )}
                      
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <div className="flex gap-2 mt-3">
                          {appointment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            >
                              Confirmar
                            </Button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            >
                              Marcar como Concluído
                            </Button>
                          )}
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

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>
                Próximos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground">Nenhum agendamento próximo.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {new Date(appointment.date).toLocaleDateString('pt-BR')} - {appointment.time}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} - {appointment.owner_name}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {appointment.status === 'pending' ? 'Pendente' : 'Confirmado'}
                        </Badge>
                      </div>
                      <p className="text-sm"><strong>Serviço:</strong> {appointment.service}</p>
                    </div>
                  ))}
                  {upcomingAppointments.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{upcomingAppointments.length - 5} mais agendamentos
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerDashboard;
