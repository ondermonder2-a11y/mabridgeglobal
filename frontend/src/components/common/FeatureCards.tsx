import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Gift,
  Clock,
  Award,
  Lock,
  BadgeCheck,
  Package,
  Phone,
  Heart,
  Star,
  Headphones,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/services/api';

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  'rotate-ccw': RotateCcw,
  headphones: Headphones,
  'shield-check': ShieldCheck,
  'credit-card': CreditCard,
  gift: Gift,
  clock: Clock,
  award: Award,
  lock: Lock,
  'badge-check': BadgeCheck,
  package: Package,
  phone: Phone,
  heart: Heart,
  star: Star,
};

const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'delivery',
    icon: 'package',
    title: 'Teslimat',
    description: 'Ürünleriniz siparişin onaylanmasının ardından 1-3 iş günü içerisinde kargoya teslim edilir.',
  },
  {
    id: 'shipping',
    icon: 'truck',
    title: 'Ücretsiz & Hızlı Kargo',
    description: '750₺ üzeri alışverişlerinizde kargo bedava.',
  },
  {
    id: 'returns',
    icon: 'rotate-ccw',
    title: '14 Gün Kolay İade',
    description: 'Koşulsuz iade ve kolay değişim garantisi.',
  },
  {
    id: 'payment',
    icon: 'shield-check',
    title: 'Güvenli Ödeme Altyapısı',
    description: 'Ödemelerinizi 256-bit SSL şifreleme ve PayTR Sanal POS altyapısıyla güvenle gerçekleştirin.',
  },
];

export function FeatureCards() {
  const { data } = useQuery({
    queryKey: ['feature-cards'],
    queryFn: async () => (await api.get<{ success: boolean; data: FeatureCard[] }>('/feature-cards')).data.data,
    staleTime: 1000 * 60 * 10,
  });

  const cards = data?.length ? data : DEFAULT_FEATURE_CARDS;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-sm sm:p-7">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {cards.map((card) => {
            const Icon = FEATURE_ICONS[card.icon] ?? Package;
            return (
              <div key={card.id} className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold leading-tight">{card.title}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
