// TODO(M1-02): define `life_areas` and the delivery intents here once the docs are
// reconciled (life areas: doc 05 §3 vs doc 08 §5.4; intents: doc 00 vs doc 07 §3
// vs doc 08 §3.3). Until then this is an intentionally empty, typed placeholder.

export const LIFE_AREAS = [] as const satisfies readonly string[];
export type LifeArea = (typeof LIFE_AREAS)[number];

export const DELIVERY_INTENTS = [] as const satisfies readonly string[];
export type DeliveryIntent = (typeof DELIVERY_INTENTS)[number];
