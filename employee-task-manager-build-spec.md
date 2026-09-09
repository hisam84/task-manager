# Employee Task Manager — Build Spec

Next.js app for assigning and tracking employee tasks. Multi-tenant: a **Super Admin** account creates companies, and each company's users/tasks are scoped to that company. Deploy target: Vercel + Neon (Postgres).

## Stack

- **Framework:** Next.js 15 (App Router), TypeScript
- **DB:** Neon (serverless Postgres)
- **ORM:** Prisma (or Drizzle — Prisma used below)
- **Auth:** Auth.js (NextAuth v5) — credentials or email magic link
- **UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Hosting:** Vercel

## 1. Project Setup

```bash
npx create-next-app@latest task-manager --typescript --tailwind --app --eslint
cd task-manager
npm install @prisma/client prisma zod bcryptjs
npm install next-auth@beta
npm install -D @types/bcryptjs
npx shadcn@latest init
```

## 2. Neon Database

1. Create project at https://neon.tech
2. Copy the pooled connection string (for app runtime) and the direct connection string (for migrations)
3. `.env`:

```env
DATABASE_URL="postgresql://<user>:<pass>@<pooled-host>/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<pass>@<direct-host>/<db>?sslmode=require"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

## 3. Prisma Schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  SUPER_ADMIN
  ADMIN
  MANAGER
  EMPLOYEE
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// A company/organization (tenant). Only SUPER_ADMIN can create these.
model Company {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  users     User[]
  tasks     Task[]
}

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(EMPLOYEE)
  department    String?
  createdAt     DateTime @default(now())

  // Null only for SUPER_ADMIN, who is not tied to any single company
  companyId     String?
  company       Company? @relation(fields: [companyId], references: [id])

  assignedTasks Task[]   @relation("AssignedTo")
  createdTasks  Task[]   @relation("CreatedBy")
  comments      Comment[]

  @@index([companyId])
}

model Task {
  id          String       @id @default(cuid())
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  companyId   String
  company     Company      @relation(fields: [companyId], references: [id])

  assigneeId  String
  assignee    User         @relation("AssignedTo", fields: [assigneeId], references: [id])

  creatorId   String
  creator     User         @relation("CreatedBy", fields: [creatorId], references: [id])

  comments    Comment[]

  @@index([companyId, status])
  @@index([assigneeId, status])
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  createdAt DateTime @default(now())

  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}
```

Run migration:

```bash
npx prisma migrate dev --name init
```

## 4. Prisma Client (Neon-safe singleton)

`lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## 5. Auth (Auth.js v5, credentials)

`auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const user = await prisma.user.findUnique({
          where: { email: creds.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          creds.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    session: ({ session, token }) => {
      (session.user as any).role = token.role;
      (session.user as any).companyId = token.companyId;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
```

`app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

## 6. Core Routes / Pages

```
app/
  login/page.tsx
  super-admin/
    page.tsx                    # super admin dashboard: list companies
    companies/
      new/page.tsx               # create company form
      [id]/page.tsx               # company detail (users, stats, activate/deactivate)
  dashboard/page.tsx          # role-aware: admin/manager see all in company, employee sees own
  tasks/
    page.tsx                  # list + filters (status, priority, assignee)
    [id]/page.tsx              # task detail + comments
    new/page.tsx                # create task (manager/admin only)
  team/page.tsx                # manager/admin: employee list + workload (scoped to company)
  api/
    companies/route.ts         # GET (list), POST (create) — SUPER_ADMIN only
    companies/[id]/route.ts    # GET, PATCH (rename/activate/deactivate) — SUPER_ADMIN only
    tasks/route.ts             # GET (list), POST (create) — scoped to session companyId
    tasks/[id]/route.ts        # GET, PATCH, DELETE
    tasks/[id]/comments/route.ts
    users/route.ts             # admin only, scoped to company (super admin can pass companyId)
```

## 7. Example API Route

`app/api/tasks/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const companyId = (session.user as any).companyId as string | null;
  if (role !== "SUPER_ADMIN" && !companyId) {
    return NextResponse.json({ error: "No company assigned" }, { status: 403 });
  }

  const isManager = ["ADMIN", "MANAGER"].includes(role);
  const tasks = await prisma.task.findMany({
    where: {
      companyId: companyId as string, // SUPER_ADMIN normally uses /super-admin views instead
      ...(isManager ? {} : { assigneeId: session.user!.id as string }),
    },
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const companyId = (session?.user as any)?.companyId as string | null;
  if (!session || !["ADMIN", "MANAGER"].includes(role) || !companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = createTaskSchema.parse(await req.json());
  const task = await prisma.task.create({
    data: { ...body, creatorId: session.user!.id as string, companyId },
  });
  return NextResponse.json(task, { status: 201 });
}
```

## 7b. Super Admin — Create Company

`app/api/companies/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true, tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = createCompanySchema.parse(await req.json());
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(body.adminPassword, 10);

  // Create the company and its first ADMIN user together
  const company = await prisma.company.create({
    data: {
      name: body.name,
      slug: body.slug,
      users: {
        create: {
          name: body.adminName,
          email: body.adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  return NextResponse.json(company, { status: 201 });
}
```

This is the "Company Creation" flow: Super Admin submits a form (company name, slug, and the company's first Admin's name/email/password) → this route creates the `Company` row and its initial `ADMIN` user in one transaction-like call. That Admin then logs in and invites Managers/Employees within their own company (all scoped by `companyId`).

## 8. Role-Based Access

- Middleware (`middleware.ts`) protects `/dashboard`, `/tasks`, `/team`, `/super-admin` — redirect to `/login` if no session; redirect non-super-admins away from `/super-admin`.
- Server-side role checks in every mutating API route (never trust the client).
- **Every company-scoped query must filter by `companyId` from the session** — this is what keeps tenants isolated from each other. Never let a client pass `companyId` for a non-super-admin request.
- `SUPER_ADMIN`: create/activate/deactivate companies, no direct task access (not tied to a company).
- `ADMIN`: manage users within their company, all tasks in their company.
- `MANAGER`: create/assign tasks, view team — scoped to their company.
- `EMPLOYEE`: view/update own tasks, comment — scoped to their company.

## 9. Seed Script

`prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Platform-level super admin — not attached to any company
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "superadmin@platform.com",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  // One sample company with its own admin/manager/employee
  await prisma.company.create({
    data: {
      name: "Demo Company",
      slug: "demo-company",
      users: {
        create: [
          { name: "Admin User", email: "admin@company.com", passwordHash, role: "ADMIN" },
          { name: "Manager User", email: "manager@company.com", passwordHash, role: "MANAGER" },
          { name: "Employee One", email: "emp1@company.com", passwordHash, role: "EMPLOYEE" },
        ],
      },
    },
  });
}

main().finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

## 10. Deploy to Vercel

1. Push repo to GitHub.
2. Import project at https://vercel.com/new
3. Set environment variables in Vercel dashboard (Project → Settings → Environment Variables):
   - `DATABASE_URL` (Neon pooled connection string)
   - `DIRECT_URL` (Neon direct connection string)
   - `AUTH_SECRET`
   - `NEXTAUTH_URL` → your production URL (e.g. `https://your-app.vercel.app`)
4. Build command stays default (`next build`); add a `postinstall` script so Prisma Client generates on Vercel:

```json
"scripts": {
  "postinstall": "prisma generate",
  "build": "prisma migrate deploy && next build"
}
```

5. Deploy. `prisma migrate deploy` runs your existing migrations against Neon on every build — don't use `migrate dev` in production.

## 11. Neon-Specific Notes

- Use the **pooled** connection string (PgBouncer, port 5432 with `-pooler` in host) for `DATABASE_URL` — serverless functions open many short-lived connections.
- Use the **direct** connection string for `DIRECT_URL` (Prisma migrations need a non-pooled connection).
- Enable Neon's "Autosuspend" only if acceptable cold-start latency for your use case; disable for always-on low latency.
- Neon branching is useful for preview deployments: create a branch per Vercel preview environment if you want isolated data per PR.

## 12. Nice-to-Haves (later)

- Email notifications on task assignment (Resend)
- Kanban board view (drag-and-drop with `@dnd-kit`)
- CSV export of tasks
- Activity log per task
- File attachments (Vercel Blob storage)

## Suggested Build Order

1. Scaffold + Prisma schema (with `Company` model) + Neon connection
2. Auth (login/logout, session, role + companyId in JWT)
3. Super Admin: company creation flow (`/super-admin`, `POST /api/companies`)
4. Task CRUD API routes — always scoped by `companyId` from session
5. Task list/detail UI + role-based filtering
6. Comments
7. Team/admin views (per company)
8. Deploy to Vercel, connect env vars, run `migrate deploy`
9. Seed production DB: one `SUPER_ADMIN` + a demo company
