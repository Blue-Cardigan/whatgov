export const PLANS = {
    ENGAGED_CITIZEN: {
      name: 'Engaged Citizen',
      id: process.env.NEXT_PUBLIC_STRIPE_ENGAGED_CITIZEN_PRICE_ID!,
      price: 2.49,
    },
    PROFESSIONAL: {
      name: 'Professional',
      id: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID!,
      price: 15.99,
    },
  } as const;

export type PlanType = keyof typeof PLANS;