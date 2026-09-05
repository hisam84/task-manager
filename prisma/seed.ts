import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Task Manager database...");

  await prisma.taskActivity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      name: "Platform Super Admin",
      email: "superadmin@platform.com",
      username: "superadmin",
      passwordHash,
      role: "SUPER_ADMIN",
      designation: "Platform Operator",
    },
  });

  const vercelCompany = await prisma.company.create({
    data: {
      name: "Vercel Engineering",
      slug: "vercel-eng",
      isActive: true,
      contactEmail: "ops@vercel.com",
      contactPhone: "+1-555-0100",
    },
  });

  const engineering = await prisma.department.create({
    data: {
      name: "Engineering",
      description: "Product engineering teams",
      companyId: vercelCompany.id,
    },
  });

  const design = await prisma.department.create({
    data: {
      name: "Design Systems",
      description: "Interface and design language",
      companyId: vercelCompany.id,
    },
  });

  const vercelAdmin = await prisma.user.create({
    data: {
      name: "Sarah Connor",
      email: "admin@vercel.com",
      username: "admin_vercel",
      passwordHash,
      role: "ADMIN",
      designation: "Company Admin",
      companyId: vercelCompany.id,
      departmentId: engineering.id,
      joiningDate: new Date("2023-01-15"),
      employeeCode: "VE-001",
    },
  });

  const elena = await prisma.user.create({
    data: {
      name: "Elena Rostova",
      email: "elena@vercel.com",
      username: "elena",
      passwordHash,
      role: "EMPLOYEE",
      designation: "Product Designer",
      companyId: vercelCompany.id,
      departmentId: design.id,
      joiningDate: new Date("2023-06-01"),
      employeeCode: "VE-014",
      phone: "+1-555-0142",
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: "Marcus Chen",
      email: "marcus@vercel.com",
      username: "marcus",
      passwordHash,
      role: "EMPLOYEE",
      designation: "Backend Engineer",
      companyId: vercelCompany.id,
      departmentId: engineering.id,
      joiningDate: new Date("2022-11-20"),
      employeeCode: "VE-008",
    },
  });

  const acmeCompany = await prisma.company.create({
    data: {
      name: "Acme Cloud Corp",
      slug: "acme-corp",
      isActive: true,
      contactEmail: "it@acme.com",
    },
  });

  const security = await prisma.department.create({
    data: {
      name: "Security",
      description: "Security and reliability",
      companyId: acmeCompany.id,
    },
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      name: "Robert Vance",
      email: "admin@acme.com",
      username: "admin_acme",
      passwordHash,
      role: "ADMIN",
      designation: "Company Admin",
      companyId: acmeCompany.id,
      departmentId: security.id,
      employeeCode: "AC-001",
    },
  });

  const bruce = await prisma.user.create({
    data: {
      name: "Bruce Wayne",
      email: "bruce@acme.com",
      username: "bruce",
      passwordHash,
      role: "EMPLOYEE",
      designation: "Security Engineer",
      companyId: acmeCompany.id,
      departmentId: security.id,
      employeeCode: "AC-007",
    },
  });

  const t1 = await prisma.task.create({
    data: {
      title: "Design Next.js 15 Dark Theme Interface",
      description: "Implement a clean dark interface with crisp borders and minimal cards.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      progress: 75,
      dueDate: new Date(Date.now() + 86400000 * 2),
      startDate: new Date(Date.now() - 86400000 * 3),
      companyId: vercelCompany.id,
      departmentId: design.id,
      assigneeId: elena.id,
      creatorId: vercelAdmin.id,
    },
  });

  const t2 = await prisma.task.create({
    data: {
      title: "Implement Geolocation Edge Routing",
      description: "Configure edge header parsing and region failovers.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      progress: 50,
      dueDate: new Date(Date.now() + 86400000 * 4),
      companyId: vercelCompany.id,
      departmentId: engineering.id,
      assigneeId: marcus.id,
      creatorId: vercelAdmin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Audit Tenant Isolation Protocols",
      description: "Ensure API routes filter tasks and users by company from the session.",
      status: "COMPLETED",
      priority: "MEDIUM",
      progress: 100,
      completedAt: new Date(Date.now() - 86400000),
      dueDate: new Date(Date.now() - 86400000),
      companyId: vercelCompany.id,
      departmentId: engineering.id,
      assigneeId: marcus.id,
      creatorId: vercelAdmin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Review personal onboarding notes",
      description: "Self task to organize onboarding checklist.",
      status: "PENDING",
      priority: "LOW",
      progress: 0,
      isSelfTask: true,
      dueDate: new Date(Date.now() + 86400000 * 7),
      companyId: vercelCompany.id,
      departmentId: design.id,
      assigneeId: elena.id,
      creatorId: elena.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Deploy Zero-Trust Infrastructure Policy",
      description: "Configure IAM boundaries for production clusters.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      progress: 25,
      dueDate: new Date(Date.now() + 86400000 * 3),
      companyId: acmeCompany.id,
      departmentId: security.id,
      assigneeId: bruce.id,
      creatorId: acmeAdmin.id,
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        body: "Mockups updated with Geist font family and clean borders.",
        taskId: t1.id,
        authorId: elena.id,
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
      {
        body: "Looks crisp. Please finish the remaining screens.",
        taskId: t1.id,
        authorId: vercelAdmin.id,
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ],
  });

  await prisma.taskActivity.createMany({
    data: [
      { action: "created", detail: "Task created", taskId: t1.id, actorId: vercelAdmin.id },
      { action: "progress_updated", detail: "Progress set to 75%", taskId: t1.id, actorId: elena.id },
      { action: "created", detail: "Task created", taskId: t2.id, actorId: vercelAdmin.id },
    ],
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
