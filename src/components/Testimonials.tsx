import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';

interface TestimonialProps {
  name: string;
  text: string;
  dogName: string;
  backgroundColor?: string;
}

const testimonials: TestimonialProps[] = [
  {
    name: "Mariana Silva",
    dogName: "Max",
    text: "A Vettale sempre acolhe o Max com muito carinho. A equipe é incrível — confiamos de olhos fechados!",
    backgroundColor: "#F5EEE5"
  },
  {
    name: "Miguel Santos",
    dogName: "Bella",
    text: "A equipe da Vettale é sensacional! Minha Bella fica animada toda vez que chegamos. A qualidade do atendimento é sempre excepcional.",
    backgroundColor: "#E9F3E1"
  },
  {
    name: "Júlia Oliveira",
    dogName: "Cooper",
    text: "Cooper nunca esteve melhor! O processo de agendamento da Vettale é super simples, e eles realmente entendem as necessidades de cada pet.",
    backgroundColor: "#F5EEE5"
  },
];

function Testimonials() {
  const headerAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });

  return (
    <section className="py-16" style={{ backgroundColor: '#FFFCF8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div 
          ref={headerAnimation.ref}
          className={`text-center mb-12 ${animationClasses.fadeIn} ${
            headerAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
          }`}
        >
          <h2 className="mb-4">O que Nossos <span className="text-primary">Clientes</span> Dizem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Não acredite apenas em nossa palavra. Veja o que os tutores em nossa comunidade dizem sobre o cuidado que oferecemos.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => {
            const cardAnimation = useScrollAnimation<HTMLDivElement>({ delay: index * 200 + 200 });
            
            return (
              <Card 
                key={index}
                ref={cardAnimation.ref}
                className={`border-0 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer hover:scale-105 ${animationClasses.slideUp} ${
                  cardAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
                }`}
                style={{ backgroundColor: testimonial.backgroundColor }}
              >
                <CardContent className="pt-6 pb-4">
                  <div className="space-y-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    
                    <p className="text-foreground font-medium leading-relaxed">"{testimonial.text}"</p>
                    
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">Tutor(a) de {testimonial.dogName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
