#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { signIn } from "./auth.js";

async function main() {
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
