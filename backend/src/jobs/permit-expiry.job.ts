import cron from "node-cron";

import { expirePermits } from "../services/permit-expiry.service";

export function startPermitExpiryJob() {
  // Run every minute.
  cron.schedule("* * * * *", async () => {
    try {
      const expiredCount = await expirePermits();

      if (expiredCount > 0) {
        console.log(
          `⏰ Automatically expired ${expiredCount} permit(s)`
        );
      }
    } catch (error) {
      console.error(
        "Permit expiry job failed:",
        error
      );
    }
  });

  console.log("⏰ Permit expiry job started");
}