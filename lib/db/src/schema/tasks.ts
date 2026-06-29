import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  deadline: text("deadline").notNull(),
  estimatedHours: real("estimated_hours"),
  availableHours: real("available_hours"),
  energyLevel: text("energy_level"),
  progress: integer("progress").notNull().default(0),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  riskScore: integer("risk_score"),
  riskLevel: text("risk_level"),
  subtasks: text("subtasks"),
  riskAnalysis: text("risk_analysis"),
  rescuePlan: text("rescue_plan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
