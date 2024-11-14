import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
  typescript: true,
}); 

export const PLANS = {
    ENGAGED_CITIZEN: {
      name: 'Engaged Citizen',
      id: process.env.NEXT_PUBLIC_STRIPE_ENGAGED_CITIZEN_PRICE_ID!,
      price: 4.99,
    },
    PROFESSIONAL: {
      name: 'Professional',
      id: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID!,
      price: 15.99,
    },
  } as const;