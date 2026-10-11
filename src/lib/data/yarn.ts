import { prisma } from "@/lib/db";

/**
 * YARN REPOSITORY
 * ===============
 * One model holds both "what this yarn is" (brand, weight, length per skein)
 * and "what I own" (quantity in the stash). Splitting those into two tables
 * would be tidier but adds a join for a single-user product with one obvious
 * use. The `materials` relation on Pattern already lets a pattern point at a
 * specific yarn, which is the extensibility hook that matters.
 */

export async function listYarns(userId: string) {
  return prisma.yarn.findMany({
    where: { userId },
    orderBy: [{ weight: "asc" }, { colorName: "asc" }],
    include: { _count: { select: { materials: true } } },
  });
}

export async function createYarn(
  userId: string,
  input: {
    brand: string;
    name: string;
    colorName: string;
    colorHex: string;
    weight: string;
    metersPerSkein: number | null;
    gramsPerSkein: number;
    quantity: number;
  },
) {
  return prisma.yarn.create({ data: { userId, ...input } });
}

export async function updateYarnQuantity(userId: string, yarnId: string, quantity: number) {
  // updateMany with userId in the where clause = ownership check in one call.
  const result = await prisma.yarn.updateMany({
    where: { id: yarnId, userId },
    data: { quantity },
  });
  return result.count > 0;
}

export async function deleteYarn(userId: string, yarnId: string) {
  const result = await prisma.yarn.deleteMany({ where: { id: yarnId, userId } });
  return result.count > 0;
}

/** Total metres / grams owned, for the stash summary. */
export async function yarnTotals(userId: string) {
  const yarns = await listYarns(userId);
  return {
    skeins: yarns.reduce((sum, yarn) => sum + yarn.quantity, 0),
    grams: yarns.reduce((sum, yarn) => sum + yarn.quantity * yarn.gramsPerSkein, 0),
    meters: yarns.reduce(
      (sum, yarn) => sum + yarn.quantity * (yarn.metersPerSkein ?? 0),
      0,
    ),
    colours: yarns.length,
  };
}
