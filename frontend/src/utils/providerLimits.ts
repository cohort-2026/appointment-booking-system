export type Plan = "Basic" | "Growth";

// How many providers each plan allows
export const planLimits: Record<Plan, number> = {
  Basic: 3,
  Growth: 10,
};

export function canAddProvider(plan: Plan, providersUsed: number): boolean {
  return providersUsed < planLimits[plan];
}

export function providerLimitMessage(plan: Plan): string {
  return `Your ${plan} plan allows up to ${planLimits[plan]} providers. Upgrade your plan to add more.`;
}