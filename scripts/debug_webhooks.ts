import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.webhookConfig.findMany();
    console.log("Webhook Configs:", configs);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
