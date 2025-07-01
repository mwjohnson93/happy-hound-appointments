import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { Pet, Service } from '@/hooks/useAppointmentForm';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

interface BasicInfoFormProps {
  userPets: Pet[];
  services: Service[];
  selectedPet: string;
  setSelectedPet: (petId: string) => void;
  selectedService: string;
  setSelectedService: (serviceId: string) => void;
  onNext: () => void;
  serviceType: 'grooming' | 'veterinary';
}

function BasicInfoForm({
  userPets,
  services,
  selectedPet,
  setSelectedPet,
  selectedService,
  setSelectedService,
  onNext,
  serviceType
}: BasicInfoFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const canProceed = selectedPet && selectedService;

  const handleAddNewPet = () => {
    navigate('/pets');
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">1. Informações Básicas</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Selecione o Pet e Serviço</CardTitle>
          <CardDescription>
            {serviceType === 'grooming'
              ? 'Escolha seu pet e o tipo de tosa desejado'
              : 'Escolha seu pet e o tipo de consulta veterinária'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pet">Seu Pet</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={selectedPet}
                onValueChange={setSelectedPet}
              >
                <SelectTrigger id="pet">
                  <SelectValue placeholder="Selecione um pet" />
                </SelectTrigger>
                <SelectContent>
                  {userPets.length > 0 ? (
                    userPets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} {pet.breed ? `(${pet.breed})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Nenhum pet cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddNewPet}
                className="flex items-center justify-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Novo Pet
              </Button>
            </div>
            {userPets.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Você precisa cadastrar ao menos um pet para fazer um agendamento.
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="service">
              {serviceType === 'grooming' ? 'Tipo de Tosa' : 'Tipo de Consulta'}
            </Label>
            <Select
              value={selectedService}
              onValueChange={setSelectedService}
            >
              <SelectTrigger id="service">
                <SelectValue placeholder={serviceType === 'grooming' ? 'Selecione o tipo de tosa' : 'Selecione o tipo de consulta'} />
              </SelectTrigger>
              <SelectContent>
                {services.length > 0 ? (
                  services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - R$ {service.price.toFixed(2)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    {serviceType === 'grooming' ? 'Nenhum serviço de tosa disponível' : 'Nenhum serviço veterinário disponível'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={onNext} 
            disabled={!canProceed}
          >
            Continuar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default BasicInfoForm;
