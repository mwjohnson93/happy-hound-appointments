
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Search, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
}

const Shop = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (error: unknown) {
        toast.error('Erro ao carregar produtos: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  useEffect(() => {
    // Fetch cart count if user is logged in
    const fetchCartCount = async () => {
      if (!user) {
        setCartCount(0);
        return;
      }
      
      try {
        const { count, error } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (error) throw error;
        setCartCount(count || 0);
      } catch (error) {
        console.error('Error fetching cart count:', error);
      }
    };
    
    fetchCartCount();
  }, [user]);
  
  useEffect(() => {
    // Apply filters whenever search query or category changes
    let filtered = [...products];
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);
  
  const addToCart = async (product: Product) => {
    if (!user) {
      toast.error('Por favor, faça login para adicionar itens ao carrinho');
      return;
    }
    
    try {
      // Check if product is already in cart
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existingItem) {
        // Update quantity if already in cart
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
          
        if (error) throw error;
      } else {
        // Insert new item if not in cart
        const { error } = await supabase
          .from('cart_items')
          .insert({ 
            user_id: user.id, 
            product_id: product.id, 
            quantity: 1 
          });
          
        if (error) throw error;
      }
      
      setCartCount(prev => prev + 1);
      toast.success(`${product.name} adicionado ao carrinho!`);
    } catch (error: unknown) {
      toast.error('Erro ao adicionar ao carrinho: ' + error.message);
    }
  };
  
  const categories = ['all', 'food', 'toys', 'accessories', 'grooming', 'health'];
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'all': return 'Todos';
      case 'food': return 'Alimentação';
      case 'toys': return 'Brinquedos';
      case 'accessories': return 'Acessórios';
      case 'grooming': return 'Higiene';
      case 'health': return 'Saúde';
      default: return category;
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <p>Carregando produtos...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Produtos para <span className="text-primary">Pets</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Encontre tudo o que seu amigo de quatro patas precisa
          </p>
        </div>
      </section>
      
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="relative w-full md:w-80">
              <Input
                type="text"
                placeholder="Pesquisar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Categorias:</span>
              <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="overflow-x-auto">
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {getCategoryLabel(category)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            
            <Button variant="outline" className="flex items-center gap-2 w-full md:w-auto">
              <ShoppingCart className="h-4 w-4" />
              <span>Carrinho ({cartCount})</span>
            </Button>
          </div>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-secondary/30 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou a pesquisa
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="relative">
                    <AspectRatio ratio={1 / 1}>
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </AspectRatio>
                    <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                      {getCategoryLabel(product.category)}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-lg font-bold">R$ {product.price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">
                        {product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : 'Sem estoque'}
                      </span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="px-4 pb-4 pt-0">
                    <Button 
                      className="w-full" 
                      disabled={product.stock_quantity <= 0}
                      onClick={() => addToCart(product)}
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      
      <section className="py-12 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Informação de Entrega</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Entrega</h3>
              <p className="text-sm text-muted-foreground">
                Entregamos em todo o Brasil. Frete grátis para compras acima de R$ 150,00.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Pagamento</h3>
              <p className="text-sm text-muted-foreground">
                Aceitamos cartões de crédito, débito, boleto e pix.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Dúvidas</h3>
              <p className="text-sm text-muted-foreground">
                Entre em contato com nossa equipe de atendimento pelo telefone (11) 1234-5678.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Shop;
