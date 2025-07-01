
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    stock_quantity: number;
  };
}

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!user) {
      toast.error('Por favor, faça login para acessar o carrinho');
      navigate('/login');
      return;
    }
    
    fetchCartItems();
  }, [user, navigate]);
  
  const fetchCartItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          product:products(id, name, price, image_url, stock_quantity)
        `)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setCartItems(data || []);
    } catch (error: unknown) {
      toast.error('Erro ao carregar itens do carrinho: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      const item = cartItems.find(item => item.id === itemId);
      if (!item) return;
      
      // Check stock availability
      if (newQuantity > item.product.stock_quantity) {
        toast.error(`Apenas ${item.product.stock_quantity} unidades disponíveis`);
        return;
      }
      
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
        
      if (error) throw error;
      
      setCartItems(cartItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (error: unknown) {
      toast.error('Erro ao atualizar quantidade: ' + error.message);
    }
  };
  
  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      setCartItems(cartItems.filter(item => item.id !== itemId));
      toast.success('Item removido do carrinho');
    } catch (error: unknown) {
      toast.error('Erro ao remover item: ' + error.message);
    }
  };
  
  const clearCart = async () => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setCartItems([]);
      toast.success('Carrinho esvaziado');
    } catch (error: unknown) {
      toast.error('Erro ao limpar carrinho: ' + error.message);
    }
  };
  
  const checkout = async () => {
    if (!address.trim()) {
      toast.error('Por favor, informe o endereço de entrega');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const totalAmount = cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity, 
        0
      );
      
      // 1. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: totalAmount,
          shipping_address: address,
        })
        .select('id')
        .single();
        
      if (orderError) throw orderError;
      
      // 2. Create order items
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
        
      if (itemsError) throw itemsError;
      
      // 3. Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user?.id);
        
      if (clearError) throw clearError;
      
      // 4. Success
      setCartItems([]);
      setAddress('');
      toast.success('Pedido realizado com sucesso!');
      navigate('/confirmation');
    } catch (error: unknown) {
      toast.error('Erro ao processar pedido: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + (item.product.price * item.quantity), 
    0
  );
  
  if (!user) {
    return (
      <Layout>
        <div className="py-16 px-6 text-center">
          <h1>Faça login para acessar seu carrinho</h1>
          <Button asChild className="mt-4">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Meu <span className="text-primary">Carrinho</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Revise seus itens e finalize sua compra
          </p>
        </div>
      </section>
      
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p>Carregando seu carrinho...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-20 bg-secondary/30 rounded-lg">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
              <h3 className="text-xl font-bold mb-2">Seu Carrinho está Vazio</h3>
              <p className="text-muted-foreground mb-6">
                Adicione produtos ao seu carrinho para começar a comprar
              </p>
              <Button asChild>
                <Link to="/shop">Ver Produtos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Itens do Carrinho ({totalItems})</span>
                      <Button variant="outline" size="sm" onClick={clearCart}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar Carrinho
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-4 border-b pb-4">
                          <div className="w-20 h-20 rounded bg-secondary/20">
                            <img
                              src={item.product.image_url || "/placeholder.svg"}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.product.name}</h3>
                            <p className="text-primary font-medium">
                              R$ {item.product.price.toFixed(2)}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-r-none"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="px-4 h-8 flex items-center justify-center border-y">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-l-none"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500 h-8 w-8"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo do Pedido</CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Subtotal ({totalItems} itens)</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Frete</span>
                        <span>R$ {(subtotal >= 150 ? 0 : 15).toFixed(2)}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>R$ {(subtotal + (subtotal >= 150 ? 0 : 15)).toFixed(2)}</span>
                      </div>
                      
                      <div className="pt-4">
                        <Label htmlFor="address">Endereço de Entrega</Label>
                        <Input
                          id="address"
                          placeholder="Digite seu endereço completo"
                          className="mt-2"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={checkout}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processando...' : 'Finalizar Compra'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
