import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Play, Droplets, Bell, BarChart3, Clock, Users, TrendingUp, Mail, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Landing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semiannual' | 'annual'>('semiannual');

  const plans = [
    {
      key: 'monthly' as const,
      label: 'Mensal',
      price: 149,
      discount: null,
      stripeLink: 'https://buy.stripe.com/cNi7sLfz20Q5fw22P12Ry09',
      popular: false,
    },
    {
      key: 'semiannual' as const,
      label: 'Semestral',
      price: 129,
      discount: '13% OFF',
      stripeLink: 'https://buy.stripe.com/6oU6oHbiM7et0B8gFR2Ry0a',
      popular: true,
    },
    {
      key: 'annual' as const,
      label: 'Anual',
      price: 109,
      discount: '27% OFF',
      stripeLink: 'https://buy.stripe.com/dRm3cv3QkfKZ3Nk0GT2Ry0b',
      popular: false,
    },
  ];

  const features = [
    "CRM de clientes ilimitado",
    "Gestão do pátio em tempo real",
    "WhatsApp automático",
    "Caixa do dia completo",
    "Mensagens automáticas",
    "Suporte via WhatsApp",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Lavgo</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Entrar</Button>
            <Button onClick={() => navigate('/auth?tab=signup')} className="gradient-primary border-0">
              Começar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 md:pt-40 md:pb-32 text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <Badge className="mb-6 bg-primary/20 text-primary-foreground border-primary/30 hover:bg-primary/20">
            7 dias grátis • Sem cartão de crédito
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Seu pátio fica cheio e os clientes ficam perguntando no WhatsApp se o carro já está pronto?
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 mb-4 max-w-2xl mx-auto">
            O problema não é falta de organização. <strong className="text-primary-foreground">É falta de automação no atendimento.</strong>
          </p>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            O <strong>Lavgo</strong> avisa automaticamente o cliente quando o carro fica pronto, organiza seu caixa e mantém seus clientes voltando.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="gradient-primary border-0 text-lg px-8 py-6 rounded-xl shadow-lg">
              Comece a usar agora
            </Button>
            <Button size="lg" className="text-lg px-8 py-6 rounded-xl bg-primary/30 hover:bg-primary/50 text-primary-foreground border border-primary/40" onClick={() => document.getElementById('screenshots')?.scrollIntoView({ behavior: 'smooth' })}>
              <Play className="mr-2 h-5 w-5" /> Ver como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-foreground">
            Por que lava-rápidos inteligentes usam <span className="text-gradient">automação</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Bell, title: "Automação melhora satisfação", description: "Sistemas que enviam notificações automáticas reduzem ligações e aumentam a satisfação do cliente ao avisar quando o serviço está pronto.", stat: "+40%", statLabel: "satisfação" },
              { icon: Clock, title: "Clientes valorizam rapidez", description: "Otimizar processos e informar tempo de espera melhora a experiência e aumenta a fidelização dos seus clientes.", stat: "3x", statLabel: "mais retorno" },
              { icon: TrendingUp, title: "Controle financeiro eficiente", description: "Lava-rápidos que controlam o caixa diariamente têm 60% mais chance de crescer de forma sustentável.", stat: "60%", statLabel: "crescimento" },
            ].map((item, i) => (
              <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="gradient-primary w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="text-3xl font-bold text-gradient mb-1">{item.stat}</div>
                  <div className="text-sm text-muted-foreground mb-3">{item.statLabel}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section id="screenshots" className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Veja o Lavgo em ação</h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">Conheça as principais telas do sistema que vai transformar seu lava-rápido.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { src: "/screenshots/dashboard.jpg", title: "Painel principal", desc: "Visão geral do seu negócio em tempo real" },
              { src: "/screenshots/clientes.jpg", title: "CRM de clientes", desc: "Cadastro completo com histórico de serviços" },
              { src: "/screenshots/patio.jpg", title: "Gestão do pátio", desc: "Controle de carros em tempo real" },
              { src: "/screenshots/caixa.jpg", title: "Controle financeiro", desc: "Entradas e saídas do dia organizadas" },
            ].map((item, i) => (
              <Card key={i} className="border-border/50 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video overflow-hidden">
                  <img src={item.src} alt={item.title} loading="lazy" width={800} height={512} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-4 pt-4">
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-foreground">Tudo que seu lava-rápido precisa</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, title: "CRM de clientes", desc: "Cadastro completo com histórico de serviços" },
              { icon: Droplets, title: "Gestão do pátio", desc: "Controle de carros em tempo real" },
              { icon: Bell, title: "WhatsApp automático", desc: "Aviso automático quando o carro fica pronto" },
              { icon: BarChart3, title: "Caixa do dia", desc: "Controle financeiro simples e visual" },
            ].map((feat, i) => (
              <Card key={i} className="border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="gradient-primary w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feat.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground">{feat.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Plano simples, sem surpresas</h2>
          <p className="text-muted-foreground mb-8">Comece com 7 dias grátis. Cancele quando quiser.</p>

          {/* Toggle */}
          <div className="flex justify-center gap-2 mb-10">
            {plans.map((plan) => (
              <div key={plan.key} className="relative">
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-orange-500 text-white border-0 text-xs whitespace-nowrap">
                    Mais popular
                  </Badge>
                )}
                <Button
                  variant={billingCycle === plan.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingCycle(plan.key)}
                  className={billingCycle === plan.key ? 'gradient-primary border-0' : ''}
                >
                  {plan.label}
                </Button>
              </div>
            ))}
          </div>

          {/* 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => {
              const isSelected = billingCycle === plan.key;
              return (
                <Card
                  key={plan.key}
                  className={`border-border/50 transition-all ${
                    isSelected ? 'border-primary shadow-lg scale-[1.02]' : 'opacity-80'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                        {plan.label}
                        {plan.discount && (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">
                            {plan.discount}
                          </Badge>
                        )}
                      </h3>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">R${plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <ul className="text-left space-y-2 mb-6">
                      {features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-success flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${isSelected ? 'gradient-primary border-0' : ''}`}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => window.open(plan.stripeLink, '_blank')}
                    >
                      Começar grátis
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Trial highlight */}
          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Unlock className="h-5 w-5 text-success" />
            <span className="text-sm font-medium">7 dias grátis, sem cartão de crédito</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-primary-foreground/80">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Droplets className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-primary-foreground">Lavgo</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <a href="mailto:suporte@lavgo.app" className="hover:text-primary-foreground transition-colors">
                suporte@lavgo.app
              </a>
            </div>
            <p className="text-sm text-primary-foreground/50">© 2024 Lavgo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
