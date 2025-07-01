import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Dog, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingAppointment {
  id: string;
  date: string;
  time: string;
  notes?: string;
  pet_name: string;
  service_name: string;
  user_name: string;
  user_email: string;
  provider_name?: string;
}

const PendingApprovalsSection = () => {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  const fetchPendingAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          notes,
          user_id,
          provider_id,
          pets:pet_id (name),
          services:service_id (name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user details and provider details for each appointment
      const appointmentsWithUserData = await Promise.all(
        (data || []).map(async (apt) => {
          // Get user data
          const { data: userData } = await supabase.auth.admin.getUserById(apt.user_id);
          
          // Get provider data if provider_id exists
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
            date: apt.date,
            time: apt.time,
            notes: apt.notes,
            pet_name: apt.pets?.name || 'Pet',
            service_name: apt.services?.name || 'Serviço',
            user_name: userData.user?.user_metadata?.name || 'Cliente',
            user_email: userData.user?.email || 'N/A',
            provider_name: providerName
          };
        })
      );

      setPendingAppointments(appointmentsWithUserData);
    } catch (error: unknown) {
      console.error('Error fetching pending appointments:', error);
      toast.error('Erro ao carregar agendamentos pendentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (appointmentId: string, action: 'confirmed' | 'cancelled') => {
    setProcessingIds(prev => new Set(prev).add(appointmentId));
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: action })
        .eq('id', appointmentId);

      if (error) throw error;

      // Remove from pending list
      setPendingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      
      const actionText = action === 'confirmed' ? 'aprovado' : 'rejeitado';
      toast.success(`Agendamento ${actionText} com sucesso!`);
      
    } catch (error: unknown) {
      console.error(`Error ${action} appointment:`, error);
      toast.error(`Erro ao ${action === 'confirmed' ? 'aprovar' : 'rejeitar'} agendamento`);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aprovações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">Carregando agendamentos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Aprovações Pendentes
        </CardTitle>
        <CardDescription>
          {pendingAppointments.length} agendamento(s) aguardando aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum agendamento pendente no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAppointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 bg-amber-50/50">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Dog className="h-4 w-4" />
                      {appointment.pet_name} - {appointment.service_name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {appointment.user_name}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    Pendente
                  </Badge>
                </div>

                {appointment.provider_name && (
                  <p className="text-sm mb-2">
                    <strong>Profissional:</strong> {appointment.provider_name}
                  </p>
                )}

                {appointment.notes && (
                  <p className="text-sm mb-3 p-2 bg-gray-50 rounded">
                    <strong>Observações:</strong> {appointment.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproval(appointment.id, 'confirmed')}
                    disabled={processingIds.has(appointment.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApproval(appointment.id, 'cancelled')}
                    disabled={processingIds.has(appointment.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsSection;
