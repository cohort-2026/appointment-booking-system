import prisma from "../src/lib/prisma.js";
try {
  const count = await prisma.$executeRaw`DELETE FROM "AuthRateLimit" WHERE "expiresAt" < NOW() - INTERVAL '1 day'`;
  console.log(`Removed ${count} expired rate-limit buckets`);
} finally {
  await prisma.$disconnect();
}
