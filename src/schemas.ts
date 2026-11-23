import { z } from "zod";

/** Shared creative shape used by predict / agent / dco. */
export const creativeSchema = z.object({
  headline: z.string(),
  description: z.string(),
  callToAction: z.string(),
  hadImage: z.boolean().optional(),
});

export const audienceSchema = z
  .object({
    ageRange: z.string().optional(),
    gender: z.string().optional(),
    location: z.string().optional(),
    interests: z.array(z.string()).optional(),
  })
  .passthrough();

export const adInputSchema = z
  .object({
    name: z.string(),
    companyName: z.string().optional(),
    agencyName: z.string().optional(),
    platform: z.string(),
    objective: z.string(),
    budget: z.union([z.number(), z.string()]),
    duration: z.union([z.number(), z.string()]),
    audience: audienceSchema,
    creative: creativeSchema,
  })
  .passthrough();

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const emptySchema = z.object({}).strict();

export const predictCallSchema = z.object({
  input: adInputSchema,
  campaignId: z.string().optional(),
});

export const getCampaignSchema = z.object({ id: z.string() });

export const createCampaignSchema = z.object({
  formData: z.record(z.string(), z.unknown()),
  prediction: z.record(z.string(), z.unknown()),
});

export const agentHistorySchema = z.object({
  campaignId: z.string().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export const logAiUsageSchema = z.object({
  campaignId: z.string().optional(),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  model: z.string(),
});

export const checkoutSchema = z.object({
  planId: z.enum(["professional", "pay_as_you_go"]),
});

export const enterpriseEnquirySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  company: z.string(),
  message: z.string(),
});

// ── Admin tool schemas ──────────────────────────────────────────────────

export const adminDashboardSchema = z.object({
  metric: z
    .enum(["overview", "revenue", "ai-cost", "usage", "campaigns", "system", "inbox", "audit"])
    .optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const adminDeleteUserSchema = z.object({
  userId: z.string().min(1),
});

export const adminGrantSubscriptionSchema = z.object({
  userId: z.string().min(1),
  planId: z.enum(["pay_as_you_go", "professional", "enterprise"]),
  days: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const adminUpdateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  status: z.string().optional(),
  planId: z.string().optional(),
  periodEnd: z.string().optional(),
  extendDays: z.number().int().positive().optional(),
});

export const adminCancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
});

export const adminRefundSchema = z
  .object({
    paymentIntentId: z.string().optional(),
    sessionId: z.string().optional(),
    amount: z.number().positive().optional(),
    reason: z.string().optional(),
  })
  .refine((v) => v.paymentIntentId || v.sessionId, {
    message: "paymentIntentId or sessionId required",
  });

export const adminBroadcastSchema = z.object({
  subject: z.string().min(1),
  body_html: z.string().min(1),
  body_text: z.string().optional(),
  audience: z.enum(["all", "professional", "pay_as_you_go", "active", "inactive"]),
});

export const adminExportSchema = z.object({
  type: z.enum(["users", "campaigns", "revenue", "usage", "audit"]),
});

export const adminProvisionAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(["professional", "pay_as_you_go"]),
  clientName: z.string().optional(),
});
