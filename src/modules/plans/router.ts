import { router, trpcError, protectedProcedure } from "../../trpc/core";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { eq } from "drizzle-orm";

export const plansRouter = router({
  createPlan: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number(),
        billingCycle: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { name, price, billingCycle } = input;
      try {
        // Admin check can be added here

        const [newPlan] = await db
          .insert(schema.plans)
          .values({
            name,
            price,
            billingCycle,
          })
          .returning();

        if (!newPlan) {
          throw new trpcError({
            code: "BAD_REQUEST",
            message: "Failed to create plan",
          });
        }

        return newPlan;
      } catch (error) {
        throw error;
      }
    }),

  updatePlan: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        newName: z.string(),
        newPrice: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { planId, newName, newPrice } = input;
      try {
        // Admin check can be added here

        const updatedPlan = await db
          .update(schema.plans)
          .set({
            name: newName,
            price: newPrice,
          })
          .where(eq(schema.plans.id, planId))
          .returning();

        return updatedPlan;
      } catch (error) {
        throw error;
      }
    }),

 
});
