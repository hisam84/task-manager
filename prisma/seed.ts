import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Clean Task Manager Database...");

  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Platform Super Admin
  await prisma.user.create({
    data: {
      name: "Guillermo Rauch (Super Admin)",
      email: "superadmin@platform.com",
      username: "superadmin",
      passwordHash,
      role: "SUPER_ADMIN",
      department: "Platform Operations",
    },
  });

  // 2. Demo Company 1: Vercel Engineering
  const vercelCompany = await prisma.company.create({
    data: {
      name: "Vercel Engineering",
      slug: "vercel-eng",
      isActive: true,
    },
  });

  const vercelAdmin = await prisma.user.create({
    data: {
      name: "Sarah Connor",
      email: "admin@vercel.com",
      username: "admin_vercel",
      passwordHash,
      role: "ADMIN",
      department: "Engineering Leadership",
      companyId: vercelCompany.id,
    },
  });

  const vercelManager = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "manager@vercel.com",
      username: "manager_vercel",
      passwordHash,
      role: "MANAGER",
      department: "Frontend Core",
      companyId: vercelCompany.id,
    },
  });

  const elena = await prisma.user.create({
    data: {
      name: "Elena Rostova",
      email: "elena@vercel.com",
      username: "elena",
      passwordHash,
      role: "EMPLOYEE",
      department: "Design Systems",
      companyId: vercelCompany.id,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: "Marcus Chen",
      email: "marcus@vercel.com",
      username: "marcus",
      passwordHash,
      role: "EMPLOYEE",
      department: "Backend Infrastructure",
      companyId: vercelCompany.id,
    },
  });

  // 3. Demo Company 2: Acme Cloud Corp
  const acmeCompany = await prisma.company.create({
    data: {
      name: "Acme Cloud Corp",
      slug: "acme-corp",
      isActive: true,
    },
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      name: "Robert Vance",
      email: "admin@acme.com",
      username: "admin_acme",
      passwordHash,
      role: "ADMIN",
      department: "Executive Tech",
      companyId: acmeCompany.id,
    },
  });

  const bruce = await prisma.user.create({
    data: {
      name: "Bruce Wayne",
      email: "bruce@acme.com",
      username: "bruce",
      passwordHash,
      role: "EMPLOYEE",
      department: "Security & Reliability",
      companyId: acmeCompany.id,
    },
  });

  // 4. Create Essential Tasks
  const t1 = await prisma.task.create({
    data: {
      title: "Design Next.js 15 Dark Theme Interface",
      description: "Implement clean Vercel dark mode with crisp borders and minimal cards.",
      status: "IN_REVIEW",
      priority: "URGENT",
      dueDate: new Date(Date.now() + 86400000 * 2),
      companyId: vercelCompany.id,
      assigneeId: elena.id,
      creatorId: vercelManager.id,
    },
  });

  const t2 = await prisma.task.create({
    data: {
      title: "Implement Geolocation Edge Routing Middleware",
      description: "Configure edge header parsing and zero-latency region failovers.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 86400000 * 4),
      companyId: vercelCompany.id,
      assigneeId: marcus.id,
      creatorId: vercelManager.id,
    },
  });

  const t3 = await prisma.task.create({
    data: {
      title: "Audit Tenant Isolation Security Protocols",
      description: "Ensure all API routes strictly filter tasks and users by companyId from session.",
      status: "DONE",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() - 86400000 * 1),
      companyId: vercelCompany.id,
      assigneeId: vercelAdmin.id,
      creatorId: vercelAdmin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Deploy Zero-Trust Infrastructure Policy",
      description: "Configure IAM boundaries for production clusters.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      dueDate: new Date(Date.now() + 86400000 * 3),
      companyId: acmeCompany.id,
      assigneeId: bruce.id,
      creatorId: acmeAdmin.id,
    },
  });

  // 5. Comments
  await prisma.comment.createMany({
    data: [
      {
        body: "Mockups updated with Geist font family and clean borders.",
        taskId: t1.id,
        authorId: elena.id,
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
      {
        body: "Looks crisp and clean! Approved.",
        taskId: t1.id,
        authorId: vercelManager.id,
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
