import { useEffect } from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
import BasicInfoForm from './appointment/BasicInfoForm';
import DateTimeForm from './appointment/DateTimeForm';
import GroomerSelectionForm from './appointment/GroomerSelectionForm';

interface AppointmentFormProps {
  serviceType: 'grooming' | 'veterinary';
}

const AppointmentForm = ({ serviceType = 'grooming' }: AppointmentFormProps) => {
  const {
    date,
    setDate,
    selectedGroomerId,
    setSelectedGroomerId,
    selectedTimeSlotId, 
    setSelectedTimeSlotId,
    selectedPet,
    setSelectedPet,
    selectedService,
    setSelectedService,
    notes,
    setNotes,
    timeSlots,
    isLoading,
    nextAvailable,
    activeTab,
    setActiveTab,
    formStep,
    setFormStep,
    userPets,
    services,
    groomers,
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
    serviceRequiresGroomer,
    serviceRequirementsLoaded,
  } = useAppointmentForm(serviceType);

  // Fetch appropriate services when service type changes
  useEffect(() => {
    fetchServices(serviceType);
  }, [serviceType, fetchServices]);

  // Dynamic step calculation based on service requirements
  const getStepTitle = (step: number) => {
    if (step === 1) return "1. Informações Básicas";
    if (step === 2) return "2. Escolha da Data";
    if (step === 3 && serviceRequiresGroomer) return "3. Seleção do Profissional";
    if (step === 3 && !serviceRequiresGroomer) return "3. Confirme o Horário";
    if (step === 4) return "4. Confirme o Horário";
    return "";
  };

  // Fixed step progression logic - only allow progression if service requirements are loaded
  const getNextStep = (currentStep: number) => {
    if (currentStep === 1) return 2;
    if (currentStep === 2) {
      // Only allow progression if we know the service requirements
      if (!serviceRequirementsLoaded) return 2;
      // From step 2: go to step 3 if groomer required, otherwise skip to step 4 (final)
      return serviceRequiresGroomer ? 3 : 4;
    }
    if (currentStep === 3 && serviceRequiresGroomer) return 4;
    return currentStep;
  };

  const getPreviousStep = (currentStep: number) => {
    if (currentStep === 2) return 1;
    if (currentStep === 3) return 2;
    if (currentStep === 4) {
      // From step 4: go back to step 3 if groomer was required, otherwise step 2
      return serviceRequiresGroomer ? 3 : 2;
    }
    return currentStep;
  };

  // A step is final if it's the time confirmation step
  const isFinalStep = (step: number) => {
    return (step === 3 && !serviceRequiresGroomer) || (step === 4);
  };

  // Helper function to handle next button with proper validation
  const handleNextStep = (currentStep: number) => {
    const nextStep = getNextStep(currentStep);
    
    // Prevent progression from step 2 if service requirements aren't loaded yet
    if (currentStep === 2 && !serviceRequirementsLoaded) {
      console.log('🔍 DEBUG: Service requirements not loaded yet, waiting...');
      return;
    }
    
    console.log('🔍 DEBUG: Moving from step', currentStep, 'to step', nextStep);
    setFormStep(nextStep);
  };

  console.log('🔍 DEBUG: AppointmentForm render - Service requires groomer:', serviceRequiresGroomer);
  console.log('🔍 DEBUG: Service requirements loaded:', serviceRequirementsLoaded);
  console.log('🔍 DEBUG: Current form step:', formStep);
  console.log('🔍 DEBUG: Is final step:', isFinalStep(formStep));

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {formStep === 1 && (
        <BasicInfoForm
          userPets={userPets}
          services={services}
          selectedPet={selectedPet}
          setSelectedPet={setSelectedPet}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          onNext={() => handleNextStep(1)}
          serviceType={serviceType}
        />
      )}
      
      {formStep === 2 && (
        <DateTimeForm
          date={date}
          setDate={setDate}
          timeSlots={timeSlots}
          selectedTimeSlotId={selectedTimeSlotId}
          setSelectedTimeSlotId={setSelectedTimeSlotId}
          nextAvailable={nextAvailable}
          handleNextAvailableSelect={handleNextAvailableSelect}
          isLoading={isLoading || !serviceRequirementsLoaded}
          activeTab={activeTab}
          setActiveTab={(tab: 'calendar' | 'next-available') => setActiveTab(tab)}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setFormStep(getPreviousStep(2))}
          onNext={() => handleNextStep(2)}
          showTimeSlots={false}
          showSubmitButton={false}
          stepTitle={getStepTitle(2)}
        />
      )}
      
      {/* Groomer selection - only show if service requires groomer AND we're on step 3 */}
      {formStep === 3 && serviceRequiresGroomer && (
        <GroomerSelectionForm
          groomers={groomers}
          selectedGroomerId={selectedGroomerId}
          setSelectedGroomerId={setSelectedGroomerId}
          date={date}
          onNext={() => handleNextStep(3)}
          onBack={() => setFormStep(getPreviousStep(3))}
          serviceType={serviceType}
        />
      )}
      
      {/* Final step - time slot selection and confirmation (step 3 for no-groomer, step 4 for groomer) */}
      {isFinalStep(formStep) && (
        <DateTimeForm
          date={date}
          setDate={setDate}
          timeSlots={timeSlots}
          selectedTimeSlotId={selectedTimeSlotId}
          setSelectedTimeSlotId={setSelectedTimeSlotId}
          nextAvailable={nextAvailable}
          handleNextAvailableSelect={handleNextAvailableSelect}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={(tab: 'calendar' | 'next-available') => setActiveTab(tab)}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setFormStep(getPreviousStep(formStep))}
          onSubmit={handleSubmit}
          showTimeSlots={true}
          showSubmitButton={true}
          stepTitle={getStepTitle(formStep)}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
