const { execSync } = require("child_process");

if (process.env.DATABASE_URL) {
  try {
    console.log("[db-push] DATABASE_URL detected. Synchronizing Prisma schema to database...");
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("[db-push] Schema sync completed successfully.");
  } catch (err) {
    console.warn("[db-push] Warning: prisma db push encountered an issue:", err.message);
  }
} else {
  console.log("[db-push] No DATABASE_URL found in environment. Skipping database push.");
}
