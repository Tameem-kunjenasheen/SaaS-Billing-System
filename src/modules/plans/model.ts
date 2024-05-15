import { db, schema } from "../../db/client";
import { trpcError } from "../../trpc/core";
import { and, eq, gte, lte } from "drizzle-orm";

interface Plan {
  id: number;
  name: string;
  price: number;
  billingCycle: "month" | "year";
}

// Update Subscription type to include billing cycle
type Subscription = {
  userId: number;
  teamId: number;
  planId: number;
  startDate: Date;
  endDate: Date;
  status: string;
  billingCycle: string; // Add billing cycle property
};

export const createPlan = async (
  name: string,
  price: number,
  billingCycle: string
) => {
  try {
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
};

export const updatePlan = async (
  planId: number,
  newName: string,
  newPrice: number
) => {
  try {
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
};

export const readPlan = async (id: number): Promise<Plan | null> => {
  try {
    const plan = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, id))
      .limit(1);

    if (plan.length === 0) {
      return null;
    }

    return plan[0] as Plan;
  } catch (error) {
    throw error;
  }
};

// CRUD operations for subscriptions
export const createSubscription = async ({
  userId,
  planId,
  teamId,
  startDate,
  billingCycle,
}: {
  userId: number;
  planId: number;
  teamId: number;
  startDate: Date;
  billingCycle: string;
}): Promise<Subscription | undefined> => {
  try {
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Invalid plan ID",
      });
    }

    // Calculate end date based on billing cycle
    let endDate: Date;
    if (billingCycle === "monthly") {
      endDate = calculateEndDate(startDate, 1); // Monthly subscription
    } else if (billingCycle === "yearly") {
      endDate = calculateEndDate(startDate, 12); // Yearly subscription
    } else {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Invalid billing cycle",
      });
    }

    const newSubscription = await db
      .insert(schema.subscriptions)
      .values({
        userId,
        planId,
        teamId,
        startDate,
        endDate,
        status: "active", // Initial status
        billingCycle: billingCycle,
      })
      .returning(); // Return all fields of the new subscription

    return newSubscription[0]; // Return the newly created subscription
  } catch (error) {
    throw error; // Re-throw any caught error
  }
};
export const getActiveSubscriptions = async () => {
  const activeSubscriptions = await db.query.subscriptions.findMany({
    where: eq(schema.subscriptions.status, "active"),
  });

  return activeSubscriptions;
};

// Issuing orders via background cron jobs
export const issueOrders = async () => {
  const activeSubscriptions = await getActiveSubscriptions();

  for (const subscription of activeSubscriptions) {
    const currentPeriodStartDate = new Date(); // Assuming current date as the start date of the current billing period
    const currentPeriodEndDate = new Date(); // Assuming current date as the end date of the current billing period

    // Check if an activation record exists for the current period
    const activationRecordExists =
      await db.query.subscriptionActivations.findFirst({
        where: and(
          eq(schema.subscriptionActivations.subscriptionId, subscription.id),
          gte(
            schema.subscriptionActivations.activationDate,
            currentPeriodStartDate
          ),
          lte(
            schema.subscriptionActivations.activationDate,
            currentPeriodEndDate
          )
        ),
      });

    if (!activationRecordExists) {
      // Create an order for the subscription
      const newOrder = await createOrder(subscription.userId, subscription.id);

      // Update subscription status to pending or awaiting payment
      await updateSubscription(subscription.id, "pending");

      // Further order processing can be handled here, such as sending payment reminders, etc.
      if (newOrder) {
        console.log(
          `Order ${newOrder.id} issued for subscription ${subscription.id}`
        );
      }
    }
  }
};

export const createOrder = async (userId: number, subscriptionId: number) => {
  const newOrder = await db
    .insert(schema.orders)
    .values({
      userId: userId,
      subscriptionId: subscriptionId,
      amount: calculateOrderAmount(subscriptionId), // Calculate order amount based on subscription details
      currency: "USD", // Assuming currency is USD
      status: "pending", // Order status initially set to pending
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newOrder[0]; // Return the first element of the returned array, which contains the created order
};

export const calculateOrderAmount = (subscriptionId: number) => {
  const fixedPrice: number = 49;
  return subscriptionId + fixedPrice;
};
export const updateSubscription = async (
  subscriptionId: number,
  newStatus: string
) => {
  const updatedSubscription = await db
    .update(schema.subscriptions)
    .set({
      status: newStatus,
    })
    .where(eq(schema.subscriptions.id, subscriptionId))
    .returning();

  return updatedSubscription;
};
// Helper function to calculate end date based on billing cycle
const calculateEndDate = (startDate: Date, monthsToAdd: number): Date => {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + monthsToAdd);
  return endDate;
};
export const calculateUpgradePrice = async (
  currentPlanId: number,
  newPlanId: number
): Promise<number | null> => {
  try {
    // Get current and new plans
    const currentPlan = await getPlanById(currentPlanId);
    const newPlan = await getPlanById(newPlanId);

    // Check if plans exist
    if (!currentPlan || !newPlan) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Invalid plan IDs",
      });
    }

    // Calculate the difference in price
    const upgradePrice = newPlan.price - currentPlan.price;

    return upgradePrice > 0 ? upgradePrice : 0; // Ensure upgrade price is non-negative
  } catch (error) {
    throw error;
  }
};
export const getPlanById = async (planId: number) => {
  const plan = await db.query.plans.findFirst({
    where: eq(schema.plans.id, planId),
  });

  return plan;
};

// Create subscription activation upon order payment
export const createSubscriptionActivation = async (orderId: number) => {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (order && order.status === "paid") {
    const newSubscriptionActivation = await db
      .insert(schema.subscriptionActivations)
      .values({
        orderId: orderId,
        subscriptionId: order.subscriptionId,
        activationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newSubscriptionActivation;
  }

  return null;
};

export const handlePayment = async (subscriptionId: number): Promise<void> => {
  try {
    // Fetch subscription details
    const subscription = await readSubscription(subscriptionId);
    if (!subscription) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Subscription not found",
      });
    }

    // Fetch user details from subscription or provide userId in the function parameters
    const userId = subscription.userId;

    // Fetch current plan
    const currentPlan = await getPlanById(subscription.planId);
    if (!currentPlan) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Current plan not found",
      });
    }

    // Assuming new plan ID is provided or fetched from somewhere
    const newPlanId = subscription.planId; // Adjust this according to your logic

    // Fetch new plan
    const newPlan = await getPlanById(newPlanId);
    if (!newPlan) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "New plan not found",
      });
    }

    // Calculate upgrade price
   calculateUpgradePrice(currentPlan.id, newPlanId);
    // Now you can use the correct insert function call with appropriate values

    // Create order
    const [newOrder] = await db
      .insert(schema.orders)
      .values({
        userId: userId,
        subscriptionId: subscriptionId,
        amount: calculateOrderAmount(subscriptionId), // Calculate order amount based on subscription details
        currency: "USD", // Assuming currency is USD
        status: "pending", // Order status initially set to pending
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!newOrder) {
      throw new trpcError({
        code: "BAD_REQUEST",
        message: "Failed to create order",
      });
    }

    // Update subscription status or create subscription activation here if necessary
    // For example, you can update subscription status to "active" if it was pending payment

    // For demonstration, let's update subscription status to "active"
    await db
      .update(schema.subscriptions)
      .set({ status: "active" })
      .where(eq(schema.subscriptions.id, subscriptionId));
  } catch (error) {
    throw error;
  }
};
// Function to read subscription details
export const readSubscription = async (
  subscriptionId: number
): Promise<Subscription | null> => {
  try {
    const subscription = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, subscriptionId))
      .limit(1);

    if (subscription.length === 0) {
      return null;
    }

    return subscription[0] as Subscription;
  } catch (error) {
    throw error;
  }
};
