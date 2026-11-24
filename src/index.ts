#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { signIn } from "./auth.js";
import { state } from "./state.js";

async function main() {
  // Optional pre-minted JWT bootstrap (for live demos / CI without passwords)
  const bootJwt = process.env.ADSIQ_BOOTSTRAP_JWT;
  const bootEmail = process.env.ADSIQ_BOOTSTRAP_EMAIL;
  const bootUserId = process.env.ADSIQ_BOOTSTRAP_USER_ID;
  if (bootJwt) {
    state.jwt = bootJwt;
    state.user = { id: bootUserId || "bootstrap", email: bootEmail || null };
    console.error(`[adsiq-mcp] bootstrapped session for ${bootEmail || "<unknown>"}`);
  }

  // Optional auto sign-in from env
  const email = process.env.ADSIQ_EMAIL;
  const password = process.env.ADSIQ_PASSWORD;
  if (email && password) {
    try {
      await signIn(email, password);
      console.error(`[adsiq-mcp] signed in as ${email}`);
    } catch (err) {
      console.error(
        `[adsiq-mcp] auto sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[adsiq-mcp] ready on stdio");
}

main().catch((err) => {
  console.error("[adsiq-mcp] fatal:", err);
  process.exit(1);
});
