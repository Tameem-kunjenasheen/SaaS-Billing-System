import { beforeAll, describe, expect, it } from "vitest";
import resetDb from "../helpers/resetDb";
import {
  createPlan,
  updatePlan,
  readPlan,
  createSubscription,
  getActiveSubscriptions,
  issueOrders,
  calculateUpgradePrice,
} from "../../modules/plans/model";

describe("Plans Module Integration Tests", async () => {
  beforeAll(async () => {
    await resetDb();
  });

  describe("Create Plan", async () => {
    // Set up test data
    const plan = {
      id: 1,
      name: "Basic",
      price: 10,
      billingCycle: "month",
    };

    it("should create a new plan successfully", async () => {
      await createPlan(plan.name, plan.price, plan.billingCycle);
      const fetchedPlan = await readPlan(plan.id);
      expect(fetchedPlan).toEqual(plan);
    });
  });

  describe("Update Plan", async () => {
    const plan = {
      id: "1",
      name: "Basic",
      price: 10,
    };

    it("should update an existing plan successfully", async () => {
      // Create a plan first
      await createPlan(plan.name, plan.price, "month");

      const updatedPlan = {
        name: "Premium",
        price: 20,
      };

      await updatePlan(parseInt(plan.id), updatedPlan.name, updatedPlan.price);
      const fetchedPlan = await readPlan(parseInt(plan.id));
      expect(fetchedPlan).toEqual({ ...plan, ...updatedPlan });
    });
  });

  describe("Create Subscription", async () => {
    it("should create a new subscription successfully", async () => {
      const userId = 1;
      const planId = 1;
      const teamId = 1;
      const startDate = new Date();
      const billingCycle = "month";

      await createSubscription({
        userId,
        planId,
        teamId,
        startDate,
        billingCycle,
      });

      const activeSubscriptions = await getActiveSubscriptions();
      expect(activeSubscriptions.length).toBe(1);
    });
  });

  describe("Calculate Upgrade Price", async () => {
    it("should calculate prorated upgrade price correctly", async () => {
      const currentPlanId = 1;
      const newPlanId = 2;

      const upgradePrice = await calculateUpgradePrice(
        currentPlanId,
        newPlanId
      );
      expect(upgradePrice).toBe(10); // Assuming the upgrade price is $10
    });
  });

  // Add more test cases as needed to cover other scenarios
});
