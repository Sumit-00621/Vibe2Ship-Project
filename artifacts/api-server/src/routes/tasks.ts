import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .orderBy(desc(tasksTable.createdAt));

  res.json(
    tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  );
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      ...parsed.data,
      progress: parsed.data.progress ?? 0,
      priority: parsed.data.priority ?? "medium",
      status: parsed.data.status ?? "todo",
    })
    .returning();

  res.status(201).json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.get("/tasks/dashboard/summary", async (req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const highRiskTasks = tasks.filter(
    (t) => t.riskLevel === "high" || t.riskLevel === "critical",
  ).length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const riskedTasks = tasks.filter((t) => t.riskScore != null);
  const averageRisk =
    riskedTasks.length > 0
      ? riskedTasks.reduce((sum, t) => sum + (t.riskScore ?? 0), 0) / riskedTasks.length
      : 0;

  const productivityScore = Math.min(
    100,
    Math.round(completionRate * 0.6 + (100 - averageRisk) * 0.4),
  );

  const now = new Date();
  const upcomingDeadlines = tasks
    .filter((t) => {
      const deadline = new Date(t.deadline);
      const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return t.status !== "completed" && diffDays >= 0 && diffDays <= 7;
    })
    .slice(0, 5)
    .map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

  const recentActivity = tasks.slice(0, 5).map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  res.json({
    totalTasks,
    completedTasks,
    highRiskTasks,
    productivityScore,
    completionRate,
    averageRisk,
    upcomingDeadlines,
    recentActivity,
  });
});

router.get("/tasks/analytics/weekly", async (req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();

  const weekly = days.map((day, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (now.getDay() - i + 7) % 7);
    const dateStr = date.toDateString();

    const dayTasks = tasks.filter((t) => {
      return new Date(t.updatedAt).toDateString() === dateStr;
    });

    const completed = dayTasks.filter((t) => t.status === "completed").length;
    const created = tasks.filter(
      (t) => new Date(t.createdAt).toDateString() === dateStr,
    ).length;
    const risked = dayTasks.filter((t) => t.riskScore != null);
    const riskAvg =
      risked.length > 0
        ? risked.reduce((s, t) => s + (t.riskScore ?? 0), 0) / risked.length
        : 0;

    return { day, completed, created, riskAvg: Math.round(riskAvg) };
  });

  res.json(weekly);
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTaskParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTaskParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTaskParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
