import { useTranslations } from 'next-intl';
import { ShieldCheck, Headphones } from 'lucide-react';

export function ServiceBar() {
  const t = useTranslations('service');

  const services = [
    { icon: ShieldCheck, title: t('securePayment'), desc: t('securePaymentDesc') },
    { icon: Headphones, title: t('support'), desc: t('supportDesc') },
  ];

  return (
    <section className="py-12 bg-white border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center text-brand-mauve">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-bold text-brand-charcoal">{service.title}</h3>
                <p className="text-xs text-muted-foreground">{service.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
