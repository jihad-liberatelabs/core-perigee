/**
 * Debug script to check webhook configurations
 * 
 * Usage: npx tsx scripts/debug_webhooks.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching webhook configurations...\n");

    const configs = await prisma.webhookConfig.findMany();

    if (configs.length === 0) {
        console.log("No webhook configurations found.");
        console.log("Add webhooks via the Settings page in the UI.");
    } else {
        console.log("Webhook Configs:");
        configs.forEach(config => {
            console.log(`- ${config.name}: ${config.url}`);
        });
    }
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
