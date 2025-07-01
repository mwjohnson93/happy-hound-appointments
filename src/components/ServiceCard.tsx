import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';
import { useAuth } from '@/hooks/useAuth';

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  popular?: boolean;
  badge?: string;
  backgroundColor?: string;
  className?: string;
}

function ServiceCard({
  title, 
  description, 
  price, 
  icon, 
  popular = false,
  badge,
  backgroundColor,
  className
}: ServiceCardProps) {
  const cardAnimation = useScrollAnimation<HTMLDivElement>({ delay: Math.random() * 300 });
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      // Redirect to login if user is not logged in
      navigate('/login');
    } else {
      // Navigate to booking page with service pre-selected
      navigate('/book', { state: { service: title } });
    }
  };

  return (
    <Card 
      ref={cardAnimation.ref}
      className={cn(
        "relative overflow-hidden border-0 group cursor-pointer",
        "hover:shadow-xl transition-all duration-500 ease-out",
        popular && "ring-2 ring-primary/20 shadow-md",
        animationClasses.scaleIn,
        cardAnimation.isVisible ? animationClasses.scaleInActive : animationClasses.scaleInInactive,
        className
      )}
      style={{ backgroundColor: backgroundColor || '#FFFFFF' }}
    >
      {(popular || badge) && (
        <div className="absolute top-4 right-4 z-10">
          <Badge 
            variant="default" 
            className="bg-primary/10 text-primary border-primary/20 shadow-sm transition-all duration-300 group-hover:bg-primary group-hover:text-white"
          >
            {badge || 'Popular'}
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="text-primary mb-2 p-2 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20" style={{ backgroundColor: 'rgba(33, 102, 172, 0.1)' }}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors duration-300">{title}</CardTitle>
        <div className="text-2xl font-bold text-primary">{price}</div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="min-h-[80px] text-muted-foreground leading-relaxed mb-4">
          {description}
        </CardDescription>
        <Button 
          onClick={handleBookingClick}
          className="w-full bg-primary hover:bg-primary/90 text-white transition-all duration-300 hover:shadow-lg group-hover:scale-105"
        >
          Agendar Agora
        </Button>
      </CardContent>
    </Card>
  );
}

export default ServiceCard;
