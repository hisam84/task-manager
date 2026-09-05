import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required").max(255),
  password: z.string().min(1, "Password is required").max(256),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(256),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(120),
  slug: z
    .string()
    .min(1, "Company code is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Company code must contain only lowercase letters, numbers, and hyphens"),
  adminName: z.string().min(1, "Admin name is required").max(120),
  adminUsername: z
    .string()
    .min(3, "Admin username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  adminEmail: z.string().email("Valid admin email is required").max(255),
  adminPassword: passwordSchema,
  contactEmail: z.string().email("Valid contact email is required").max(255).optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const patchCompanySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().max(255).optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
  adminName: z.string().min(1).max(120).optional(),
  adminEmail: z.string().email().max(255).optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(120),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Full name is required").max(120),
  email: z.string().email("Valid email is required").max(255),
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  employeeCode: z.string().max(40).optional().nullable(),
  designation: z.string().max(120).optional().nullable(),
  departmentId: z.string().min(1).optional().nullable(),
  password: passwordSchema,
  isActive: z.boolean().optional(),
  joiningDate: z.string().optional().nullable(),
});

export const patchEmployeeSchema = createEmployeeSchema.partial().extend({
  password: passwordSchema.optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PENDING"),
  assigneeId: z.string().min(1).optional(),
  departmentId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  adminComment: z.string().max(2000).optional().nullable(),
  employeeComment: z.string().max(2000).optional().nullable(),
  isSelfTask: z.boolean().optional(),
});

export const patchTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().min(1).optional(),
  departmentId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  adminComment: z.string().max(2000).optional().nullable(),
  employeeComment: z.string().max(2000).optional().nullable(),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
});
