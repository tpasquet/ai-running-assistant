import { prisma } from "../src/infra/db/prisma.js";
import { redis } from "../src/infra/cache/redis.js";
import { AggregationService } from "../src/domain/aggregation/AggregationService.js";

const user = await prisma.user.findUnique({ where: { email: "terry.pasquet@proton.me" } });
if (!user) { console.error("User not found"); process.exit(1); }

console.log(`Computing aggregates for ${user.email}...`);
const svc = new AggregationService(prisma, redis);
await svc.recalculateAll(user.id);

const count = await prisma.weeklyAggregate.count({ where: { userId: user.id } });
console.log(`✅ ${count} weeks computed`);

await prisma.$disconnect();
redis.disconnect();
