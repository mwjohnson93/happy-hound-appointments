
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'client' | 'groomer' | 'vet' | 'admin'>('client');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeRequired, setCodeRequired] = useState(false);
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const suggestGroomerRole = location.state?.suggestGroomerRole;
  
  useEffect(() => {
    if (suggestGroomerRole) {
      setRole('groomer');
      setCodeRequired(true);
    }
  }, [suggestGroomerRole]);
  
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Update code requirement when role changes
  useEffect(() => {
    setCodeRequired(role === 'groomer' || role === 'vet' || role === 'admin');
  }, [role]);
  
  const validateAndUseRegistrationCode = async () => {
    if (!codeRequired) return true;
    
    try {
      // Validate the registration code
      const { data: isValid, error: validateError } = await supabase.rpc('validate_registration_code', {
        code_value: registrationCode,
        role_value: role
      });
      
      if (validateError) {
        console.error('Error validating code:', validateError);
        setError('Erro ao validar código de registro.');
        return false;
      }
      
      if (!isValid) {
        const roleText = role === 'groomer' ? 'tosador' : 
                        role === 'vet' ? 'veterinário' : 
                        role === 'admin' ? 'administrador' : role;
        setError(`Código de registro inválido para ${roleText}.`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception during code validation:', error);
      setError('Erro ao validar código de registro.');
      return false;
    }
  };

  const markCodeAsUsed = async () => {
    if (!codeRequired) return;
    
    try {
      await supabase.rpc('mark_code_as_used', {
        code_value: registrationCode
      });
    } catch (error) {
      console.error('Error marking code as used:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (codeRequired && !registrationCode) {
      const roleText = role === 'groomer' ? 'tosadores' : 
                      role === 'vet' ? 'veterinários' : 
                      role === 'admin' ? 'administradores' : role;
      setError(`Código de registro é obrigatório para ${roleText}.`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate registration code if required
      if (codeRequired) {
        const isValid = await validateAndUseRegistrationCode();
        if (!isValid) {
          setIsLoading(false);
          return;
        }
      }
      
      // Create the user account (the handle_new_user trigger will handle everything)
      await signUp(email, password, name, role);
      
      // Mark the code as used after successful signup
      if (codeRequired) {
        await markCodeAsUsed();
      }
      
      // Show success message based on role
      if (role === 'groomer') {
        toast.success('Registro realizado! Sua disponibilidade foi configurada automaticamente. Verifique seu email para confirmar a conta.');
      } else if (role === 'vet') {
        toast.success('Registro realizado! Sua agenda foi configurada automaticamente. Verifique seu email para confirmar a conta.');
      } else if (role === 'admin') {
        toast.success('Registro de administrador realizado! Verifique seu email para confirmar a conta.');
      } else {
        toast.success('Registro realizado! Verifique seu email para confirmar a conta.');
      }
      
      // Signup function will navigate to login
    } catch (error: unknown) {
      setError(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="flex justify-center items-center py-12">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para se registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Tipo de Conta</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value: 'client' | 'groomer' | 'vet' | 'admin') => setRole(value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client">Cliente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="groomer" id="groomer" />
                      <Label htmlFor="groomer">Tosador</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vet" id="vet" />
                      <Label htmlFor="vet">Veterinário</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin">Administrador</Label>
                    </div>
                  </RadioGroup>
                  
                  {role !== 'client' && (
                    <Alert className="mt-2">
                      <AlertDescription>
                        {role === 'groomer' && (
                          <>
                            Ao se cadastrar como tosador, você terá acesso ao calendário de agendamentos e será listado como 
                            profissional disponível para os clientes. Sua disponibilidade será configurada automaticamente para os próximos 90 dias.
                          </>
                        )}
                        {role === 'vet' && (
                          <>
                            Ao se cadastrar como veterinário, você terá acesso ao calendário de agendamentos e será listado como 
                            profissional disponível para os clientes. Sua agenda será configurada automaticamente para os próximos 90 dias.
                          </>
                        )}
                        {role === 'admin' && (
                          <>
                            Ao se cadastrar como administrador, você terá acesso completo ao sistema, incluindo o painel administrativo 
                            para gerenciar agendamentos, usuários e configurações.
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {codeRequired && (
                  <div className="grid gap-2">
                    <Label htmlFor="registrationCode">Código de Registro</Label>
                    <Input
                      id="registrationCode"
                      type="text"
                      placeholder={`Insira o código de registro de ${
                        role === 'groomer' ? 'tosador' : 
                        role === 'vet' ? 'veterinário' : 
                        role === 'admin' ? 'administrador' : role
                      }`}
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Código fornecido pelo pet shop para registro de profissionais
                    </p>
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="text-center mt-2">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Faça Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Register;
