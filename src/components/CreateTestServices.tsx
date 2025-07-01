
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateTestServices = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createTestServices = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating test services...');

      // Create test services
      const services = [
        {
          id: 'service-1',
          name: 'Banho Simples',
          service_type: 'grooming',
          price: 30.00,
          duration: 30,
          description: 'Banho básico para seu pet'
        },
        {
          id: 'service-2', 
          name: 'Tosa Completa',
          service_type: 'grooming',
          price: 60.00,
          duration: 60,
          description: 'Tosa completa com banho incluído'
        },
        {
          id: 'service-3',
          name: 'Banho e Tosa',
          service_type: 'grooming', 
          price: 80.00,
          duration: 90,
          description: 'Banho completo + tosa'
        },
        {
          id: 'service-4',
          name: 'Consulta Veterinária',
          service_type: 'veterinary',
          price: 120.00,
          duration: 30,
          description: 'Consulta geral veterinária'
        },
        {
          id: 'service-5',
          name: 'Exame Veterinário',
          service_type: 'veterinary',
          price: 200.00,
          duration: 60,
          description: 'Exames e avaliação completa'
        }
      ];

      // Insert services
      const { error: servicesError } = await supabase
        .from('services')
        .upsert(services, { onConflict: 'id' });

      if (servicesError) throw servicesError;

      console.log('✅ Test services created successfully');
      toast.success('Serviços de teste criados com sucesso!');

    } catch (error: unknown) {
      console.error('💥 Error creating test services:', error);
      toast.error('Erro ao criar serviços de teste: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar Serviços de Teste</CardTitle>
        <CardDescription>
          Criar serviços de exemplo (banho, tosa, veterinário)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createTestServices} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Criando...' : 'Criar Serviços de Teste'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateTestServices;
