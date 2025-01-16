export const PLANS = {
    PROFESSIONAL: {
      name: 'Professional',
      id: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID!,
      price: 12.99,
    },
  } as const;

export type PlanType = keyof typeof PLANS;