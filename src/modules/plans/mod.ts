// import { db, schema } from "../../db/client";
// import { trpcError } from "../../trpc/core";
// import { eq } from "drizzle-orm";

// // CRUD operations for plans
 

// export const getActiveSubscriptions = async () => {
//   const activeSubscriptions = await db.query.subscriptions.findMany({
//     where: { status: "active" },
//   });

//   return activeSubscriptions;
// };





// // Create subscription activation upon order payment
// export const createSubscriptionActivation = async (orderId: number) => {
//   const order = await db.query.orders.findFirst({
//     where: { id: orderId },
//   });

//   if (order && order.status === "paid") {
//     const newSubscriptionActivation = await db
//       .insert(schema.subscriptionActivations)
//       .values({
//         orderId: orderId,
//         subscriptionId: order.subscriptionId,
//         activationDate: new Date(),
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       })
//       .returning();

//     return newSubscriptionActivation;
//   }

//   return null;
// };
