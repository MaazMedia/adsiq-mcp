import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodTypeAny } from "zod";

import { apiRequest } from "./api.js";
import { signIn, signOut, whoami } from "./auth.js";
import {
  adminBroadcastSchema,
  adminCancelSubscriptionSchema,
  adminDashboardSchema,
  adminDeleteUserSchema,
  adminExportSchema,
  adminGrantSubscriptionSchema,
  adminProvisionAccountSchema,
  adminRefundSchema,
  adminUpdateSubscriptionSchema,
  agentHistorySchema,
  checkoutSchema,
  createCampaignSchema,
  emptySchema,
  enterpriseEnquirySchema,
  getCampaignSchema,
  logAiUsageSchema,
  predictCallSchema,
  signInSchema,
} from "./schemas.js";

// ─────────────────────────────────────────────────────────────────────────
// Tool registry
// ─────────────────────────────────────────────────────────────────────────

interface ToolDef<S extends ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: Tool["inputSchema"];
  zod: S;
  handler: (args: any) => Promise<unknown>;
}

const EMPTY_SCHEMA: Tool["inputSchema"] = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const AD_INPUT_SCHEMA = {
  type: "object",
  required: ["name", "platform", "objective", "budget", "duration", "audience", "creative"],
  properties: {
    name: { type: "string" },
    companyName: { type: "string" },
    agencyName: { type: "string" },
    platform: { type: "string" },
    objective: { type: "string" },
    budget: { type: ["number", "string"] },
    duration: { type: ["number", "string"] },
    audience: {
      type: "object",
      properties: {
        ageRange: { type: "string" },
        gender: { type: "string" },
        location: { type: "string" },
        interests: { type: "array", items: { type: "string" } },
      },
    },
    creative: {
      type: "object",
      required: ["headline", "description", "callToAction"],
      properties: {
        headline: { type: "string" },
        description: { type: "string" },
        callToAction: { type: "string" },
        hadImage: { type: "boolean" },
      },
    },
  },
} as const;

const PREDICT_CALL_SCHEMA: Tool["inputSchema"] = {
  type: "object",
  required: ["input"],
  properties: {
    input: AD_INPUT_SCHEMA,
    campaignId: { type: "string" },
  },
};

const tools: Array<ToolDef<ZodTypeAny>> = [
  {
    name: "sign_in",
    description:
      "Sign in to AdsIQ via Supabase. Stores the JWT in memory and attaches it to every subsequent API call.",
    inputSchema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    zod: signInSchema,
    handler: async ({ email, password }) => signIn(email, password),
  },
  {
    name: "sign_out",
    description: "Clear the in-memory AdsIQ session.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => signOut(),
  },
  {
    name: "whoami",
    description: "Return the currently signed-in AdsIQ user, or null.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => whoami(),
  },
  {
    name: "predict_ad",
    description:
      "Run the AdsIQ performance prediction on an ad concept. Proxies POST /api/predict with endpoint='predict'.",
    inputSchema: PREDICT_CALL_SCHEMA,
    zod: predictCallSchema,
    handler: async ({ input, campaignId }) =>
      apiRequest("/api/predict", {
        method: "POST",
        body: { endpoint: "predict", input, campaignId },
      }),
  },
  {
    name: "run_agent",
    description:
      "Run the AdsIQ Agentic Orchestrator on a campaign snapshot. Proxies POST /api/predict with endpoint='agent'.",
    inputSchema: PREDICT_CALL_SCHEMA,
    zod: predictCallSchema,
    handler: async ({ input, campaignId }) =>
      apiRequest("/api/predict", {
        method: "POST",
        body: { endpoint: "agent", input, campaignId },
      }),
  },
  {
    name: "generate_dco",
    description:
      "Generate Dynamic Creative Optimisation prompts. Proxies POST /api/predict with endpoint='dco'.",
    inputSchema: PREDICT_CALL_SCHEMA,
    zod: predictCallSchema,
    handler: async ({ input, campaignId }) =>
      apiRequest("/api/predict", {
        method: "POST",
        body: { endpoint: "dco", input, campaignId },
      }),
  },
  {
    name: "list_campaigns",
    description: "List campaigns the signed-in user owns. GET /api/campaigns.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/campaigns"),
  },
  {
    name: "get_campaign",
    description: "Fetch a single campaign by id. GET /api/campaigns/{id}.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    zod: getCampaignSchema,
    handler: async ({ id }) => apiRequest(`/api/campaigns/${encodeURIComponent(id)}`),
  },
  {
    name: "create_campaign",
    description:
      "Persist a new campaign with its prediction. POST /api/campaigns with body { formData, prediction }.",
    inputSchema: {
      type: "object",
      required: ["formData", "prediction"],
      properties: {
        formData: { type: "object" },
        prediction: { type: "object" },
      },
    },
    zod: createCampaignSchema,
    handler: async ({ formData, prediction }) =>
      apiRequest("/api/campaigns", {
        method: "POST",
        body: { formData, prediction },
      }),
  },
  {
    name: "get_agent_history",
    description:
      "Get autonomous agent run history. GET /api/agent/history?campaignId=&limit=.",
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 500 },
      },
    },
    zod: agentHistorySchema,
    handler: async ({ campaignId, limit }) =>
      apiRequest("/api/agent/history", {
        query: { campaignId, limit },
      }),
  },
  {
    name: "log_ai_usage",
    description: "Record AI token usage. POST /api/log-ai-usage.",
    inputSchema: {
      type: "object",
      required: ["prompt_tokens", "completion_tokens", "model"],
      properties: {
        campaignId: { type: "string" },
        prompt_tokens: { type: "integer", minimum: 0 },
        completion_tokens: { type: "integer", minimum: 0 },
        model: { type: "string" },
      },
    },
    zod: logAiUsageSchema,
    handler: async (args) =>
      apiRequest("/api/log-ai-usage", { method: "POST", body: args }),
  },
  {
    name: "verify_subscription",
    description: "Return the signed-in user's subscription status. GET /api/verify-subscription.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/verify-subscription"),
  },
  {
    name: "cancel_subscription",
    description: "Cancel the signed-in user's subscription. POST /api/cancel-subscription.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/cancel-subscription", { method: "POST", body: {} }),
  },
  {
    name: "create_checkout_session",
    description:
      "Create a Stripe checkout session for an AdsIQ plan. POST /api/create-checkout-session. Returns { url }.",
    inputSchema: {
      type: "object",
      required: ["planId"],
      properties: { planId: { type: "string", enum: ["professional", "pay_as_you_go"] } },
    },
    zod: checkoutSchema,
    handler: async ({ planId }) =>
      apiRequest("/api/create-checkout-session", {
        method: "POST",
        body: { planId },
      }),
  },
  {
    name: "enterprise_enquiry",
    description: "Submit an enterprise sales enquiry. POST /api/enterprise-enquiry.",
    inputSchema: {
      type: "object",
      required: ["name", "email", "company", "message"],
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        company: { type: "string" },
        message: { type: "string" },
      },
    },
    zod: enterpriseEnquirySchema,
    handler: async (args) =>
      apiRequest("/api/enterprise-enquiry", { method: "POST", body: args }),
  },
  {
    name: "list_agencies",
    description: "List agencies visible to the signed-in user. GET /api/agencies.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/agencies"),
  },

  // ── Admin tools (require an admin-role Supabase user) ──────────────────
  {
    name: "admin_dashboard",
    description:
      "Admin read-side metrics. GET /api/admin/dashboard?metric=<overview|revenue|ai-cost|usage|campaigns|system|inbox|audit>. For 'audit', optional limit/offset paginate the admin audit log.",
    inputSchema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["overview", "revenue", "ai-cost", "usage", "campaigns", "system", "inbox", "audit"],
        },
        limit: { type: "integer", minimum: 1, maximum: 500 },
        offset: { type: "integer", minimum: 0 },
      },
    },
    zod: adminDashboardSchema,
    handler: async ({ metric, limit, offset }) =>
      apiRequest("/api/admin/dashboard", {
        query: { metric: metric ?? "overview", limit, offset },
      }),
  },
  {
    name: "admin_list_users",
    description:
      "List every AdsIQ user with plan, subscription, campaign count, and sign-in metadata. GET /api/admin/users.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/admin/users"),
  },
  {
    name: "admin_delete_user",
    description:
      "Permanently delete a Supabase auth user. DELETE /api/admin/users?userId=. The admin cannot delete themselves.",
    inputSchema: {
      type: "object",
      required: ["userId"],
      properties: { userId: { type: "string" } },
    },
    zod: adminDeleteUserSchema,
    handler: async ({ userId }) =>
      apiRequest("/api/admin/users", { method: "DELETE", query: { userId } }),
  },
  {
    name: "admin_grant_subscription",
    description:
      "Manually grant or overwrite a user's subscription (bypasses Stripe). POST /api/admin/subscription with { userId, planId, days?, notes? }.",
    inputSchema: {
      type: "object",
      required: ["userId", "planId"],
      properties: {
        userId: { type: "string" },
        planId: { type: "string", enum: ["pay_as_you_go", "professional", "enterprise"] },
        days: { type: "integer", minimum: 1 },
        notes: { type: "string" },
      },
    },
    zod: adminGrantSubscriptionSchema,
    handler: async (args) =>
      apiRequest("/api/admin/subscription", { method: "POST", body: args }),
  },
  {
    name: "admin_update_subscription",
    description:
      "Modify an existing subscription row. PATCH /api/admin/subscription with { subscriptionId, status?, planId?, periodEnd?, extendDays? }.",
    inputSchema: {
      type: "object",
      required: ["subscriptionId"],
      properties: {
        subscriptionId: { type: "string" },
        status: { type: "string" },
        planId: { type: "string" },
        periodEnd: { type: "string" },
        extendDays: { type: "integer", minimum: 1 },
      },
    },
    zod: adminUpdateSubscriptionSchema,
    handler: async (args) =>
      apiRequest("/api/admin/subscription", { method: "PATCH", body: args }),
  },
  {
    name: "admin_cancel_subscription_record",
    description:
      "Soft-cancel a subscription row (sets status='canceled'). DELETE /api/admin/subscription?id=<subscriptionId>.",
    inputSchema: {
      type: "object",
      required: ["subscriptionId"],
      properties: { subscriptionId: { type: "string" } },
    },
    zod: adminCancelSubscriptionSchema,
    handler: async ({ subscriptionId }) =>
      apiRequest("/api/admin/subscription", {
        method: "DELETE",
        query: { id: subscriptionId },
      }),
  },
  {
    name: "admin_refund",
    description:
      "Issue a Stripe refund. POST /api/admin/refund with { paymentIntentId? | sessionId?, amount? (USD), reason? }.",
    inputSchema: {
      type: "object",
      properties: {
        paymentIntentId: { type: "string" },
        sessionId: { type: "string" },
        amount: { type: "number", exclusiveMinimum: 0 },
        reason: { type: "string" },
      },
    },
    zod: adminRefundSchema,
    handler: async (args) =>
      apiRequest("/api/admin/refund", { method: "POST", body: args }),
  },
  {
    name: "admin_broadcast",
    description:
      "Send an email broadcast to a user audience. POST /api/admin/broadcast with { subject, body_html, body_text?, audience }. audience: all|professional|pay_as_you_go|active|inactive.",
    inputSchema: {
      type: "object",
      required: ["subject", "body_html", "audience"],
      properties: {
        subject: { type: "string" },
        body_html: { type: "string" },
        body_text: { type: "string" },
        audience: {
          type: "string",
          enum: ["all", "professional", "pay_as_you_go", "active", "inactive"],
        },
      },
    },
    zod: adminBroadcastSchema,
    handler: async (args) =>
      apiRequest("/api/admin/broadcast", { method: "POST", body: args }),
  },
  {
    name: "admin_list_broadcasts",
    description: "List past admin email broadcasts. GET /api/admin/broadcast.",
    inputSchema: EMPTY_SCHEMA,
    zod: emptySchema,
    handler: async () => apiRequest("/api/admin/broadcast"),
  },
  {
    name: "admin_export",
    description:
      "Export CSV of users|campaigns|revenue|usage|audit. GET /api/admin/export?type=<type>. Returns raw CSV text.",
    inputSchema: {
      type: "object",
      required: ["type"],
      properties: {
        type: {
          type: "string",
          enum: ["users", "campaigns", "revenue", "usage", "audit"],
        },
      },
    },
    zod: adminExportSchema,
    handler: async ({ type }) =>
      apiRequest("/api/admin/export", { query: { type } }),
  },
  {
    name: "admin_provision_account",
    description:
      "Create a pre-confirmed Supabase user and activate their subscription (no Stripe). POST /api/admin/provision-account with { email, password (>=8), plan: professional|pay_as_you_go, clientName? }.",
    inputSchema: {
      type: "object",
      required: ["email", "password", "plan"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8 },
        plan: { type: "string", enum: ["professional", "pay_as_you_go"] },
        clientName: { type: "string" },
      },
    },
    zod: adminProvisionAccountSchema,
    handler: async (args) =>
      apiRequest("/api/admin/provision-account", { method: "POST", body: args }),
  },
];

const toolByName = new Map(tools.map((t) => [t.name, t] as const));

// ─────────────────────────────────────────────────────────────────────────
// MCP server factory
// ─────────────────────────────────────────────────────────────────────────

export function createServer(): Server {
  const server = new Server(
    { name: "adsiq-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    const def = toolByName.get(name);
    if (!def) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }

    let parsedArgs: unknown;
    try {
      parsedArgs = def.zod.parse(rawArgs ?? {});
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Invalid arguments for ${name}: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }

    try {
      const result = await def.handler(parsedArgs as never);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: msg }],
      };
    }
  });

  return server;
}

export { tools };
