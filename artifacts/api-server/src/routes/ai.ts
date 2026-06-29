import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  GenerateBreakdownBody,
  AnalyzeRiskBody,
  GenerateRescuePlanBody,
  GenerateCoachInsightsBody,
} from "@workspace/api-zod";
import { generateContent } from "../lib/gemini";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/ai/breakdown", async (req, res): Promise<void> => {
  const parsed = GenerateBreakdownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskId, title, description, estimatedHours, deadline } = parsed.data;

  const prompt = `You are a project planning AI. Break down this task into actionable subtasks.

Task: "${title}"
Description: "${description ?? "No description"}"
Estimated Hours: ${estimatedHours ?? "Unknown"}
Deadline: ${deadline ?? "Not set"}

Return a JSON object with this exact structure:
{
  "subtasks": [
    {
      "title": "subtask name",
      "estimatedTime": "e.g. 2 hours",
      "difficulty": "easy|medium|hard",
      "dependencies": ["optional list of dependency subtask titles"],
      "completed": false
    }
  ]
}

Generate 3-7 practical subtasks. Be specific and actionable.`;

  try {
    const raw = await generateContent(prompt);
    let parsed2: { subtasks: unknown[] };
    try {
      parsed2 = JSON.parse(raw);
    } catch {
      parsed2 = { subtasks: mockBreakdown() };
    }

    const subtasks = Array.isArray(parsed2.subtasks) ? parsed2.subtasks : mockBreakdown();

    await db
      .update(tasksTable)
      .set({ subtasks: JSON.stringify(subtasks), updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    res.json({ taskId, subtasks });
  } catch (err) {
    req.log.error({ err }, "Breakdown generation failed");
    const subtasks = mockBreakdown();
    res.json({ taskId, subtasks });
  }
});

router.post("/ai/risk", async (req, res): Promise<void> => {
  const parsed = AnalyzeRiskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskId, title, description, deadline, progress, estimatedHours, availableHours, energyLevel } = parsed.data;

  const deadlineDate = deadline ? new Date(deadline) : null;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const prompt = `You are a deadline risk analysis AI. Analyze this task and predict the risk of missing the deadline.

Task: "${title}"
Description: "${description ?? "None"}"
Deadline: ${deadline ?? "Not set"} (${daysLeft != null ? daysLeft + " days left" : "unknown"})
Current Progress: ${progress}%
Estimated Hours: ${estimatedHours ?? "Unknown"}
Available Hours: ${availableHours ?? "Unknown"}
Energy Level: ${energyLevel ?? "Not specified"}

Return a JSON object with this exact structure:
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "explanation": "<2-3 sentence explanation of the risk assessment>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Risk levels: low (0-30), medium (31-60), high (61-80), critical (81-100).`;

  try {
    const raw = await generateContent(prompt);
    let result: { riskScore: number; riskLevel: string; explanation: string; recommendations: string[] };
    try {
      result = JSON.parse(raw);
    } catch {
      result = mockRiskResult(progress, daysLeft);
    }

    await db
      .update(tasksTable)
      .set({
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        riskAnalysis: JSON.stringify(result),
        updatedAt: new Date(),
      })
      .where(eq(tasksTable.id, taskId));

    res.json({ taskId, ...result });
  } catch (err) {
    req.log.error({ err }, "Risk analysis failed");
    const fallback = mockRiskResult(progress, daysLeft);
    res.json({ taskId, ...fallback });
  }
});

router.post("/ai/rescue", async (req, res): Promise<void> => {
  const parsed = GenerateRescuePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskId, title, description, deadline, progress, estimatedHours, availableHours, riskScore } = parsed.data;

  const prompt = `You are an emergency project rescue AI. This task is at critical risk. Generate an emergency rescue plan.

Task: "${title}"
Description: "${description ?? "None"}"
Deadline: ${deadline ?? "Not set"}
Current Progress: ${progress}%
Estimated Hours: ${estimatedHours ?? "Unknown"}
Available Hours: ${availableHours ?? "Unknown"}
Risk Score: ${riskScore}/100

Return a JSON object with this exact structure:
{
  "criticalTasks": ["<must-do item 1>", "<must-do item 2>", "<must-do item 3>"],
  "tasksToSkip": ["<skip item 1>", "<skip item 2>"],
  "scopeReduction": "<what to cut to make it achievable>",
  "timeline": [
    { "time": "e.g. Next 2 hours", "action": "<specific action>", "priority": "critical|high|medium|low" },
    { "time": "e.g. Hours 3-6", "action": "<specific action>", "priority": "critical|high|medium|low" }
  ],
  "recoveryStrategy": "<2-3 sentence overall strategy>",
  "recommendedTools": ["<tool or technique 1>", "<tool or technique 2>"]
}`;

  try {
    const raw = await generateContent(prompt);
    let result: {
      criticalTasks: string[];
      tasksToSkip: string[];
      scopeReduction: string;
      timeline: { time: string; action: string; priority: string }[];
      recoveryStrategy: string;
      recommendedTools: string[];
    };
    try {
      result = JSON.parse(raw);
    } catch {
      result = mockRescuePlan();
    }

    await db
      .update(tasksTable)
      .set({ rescuePlan: JSON.stringify(result), updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    res.json({ taskId, ...result });
  } catch (err) {
    req.log.error({ err }, "Rescue plan generation failed");
    const fallback = mockRescuePlan();
    res.json({ taskId, ...fallback });
  }
});

router.post("/ai/coach", async (req, res): Promise<void> => {
  const parsed = GenerateCoachInsightsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tasks } = parsed.data;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status !== "completed").length;
  const highRisk = tasks.filter((t) => t.riskLevel === "high" || t.riskLevel === "critical").length;
  const avgProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length)
      : 0;

  const prompt = `You are an AI productivity coach. Analyze this person's task performance and provide personalized coaching.

Tasks Overview:
- Total tasks: ${tasks.length}
- Completed: ${completed}
- Pending: ${pending}
- High-risk tasks: ${highRisk}
- Average progress: ${avgProgress}%

Return a JSON object with this exact structure:
{
  "assessment": "<2-3 sentence overall performance assessment>",
  "feedback": "<specific, personalized feedback based on the data>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "recoveryActions": ["<immediate action 1>", "<immediate action 2>"],
  "motivationalMessage": "<inspiring, specific motivational message — not generic>",
  "productivityScore": <number 0-100>
}`;

  try {
    const raw = await generateContent(prompt);
    let result: {
      assessment: string;
      feedback: string;
      recommendations: string[];
      recoveryActions: string[];
      motivationalMessage: string;
      productivityScore: number;
    };
    try {
      result = JSON.parse(raw);
    } catch {
      result = mockCoachResult(completed, tasks.length);
    }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Coach insights generation failed");
    const fallback = mockCoachResult(completed, tasks.length);
    res.json(fallback);
  }
});

// Mock fallbacks so the app never crashes without AI
function mockBreakdown() {
  return [
    { title: "Research and planning", estimatedTime: "1 hour", difficulty: "easy", dependencies: [], completed: false },
    { title: "Initial implementation", estimatedTime: "2 hours", difficulty: "medium", dependencies: ["Research and planning"], completed: false },
    { title: "Testing and review", estimatedTime: "1 hour", difficulty: "medium", dependencies: ["Initial implementation"], completed: false },
    { title: "Final polish and delivery", estimatedTime: "30 minutes", difficulty: "easy", dependencies: ["Testing and review"], completed: false },
  ];
}

function mockRiskResult(progress: number, daysLeft: number | null) {
  const riskScore = Math.min(100, Math.max(0, 100 - progress - (daysLeft ?? 3) * 5));
  const riskLevel =
    riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";
  return {
    riskScore,
    riskLevel,
    explanation: `Based on current progress of ${progress}% and ${daysLeft ?? "unknown"} days remaining, this task has a ${riskLevel} risk level. Configure your Gemini API key for detailed AI analysis.`,
    recommendations: [
      "Increase daily work sessions",
      "Break down remaining work into smaller chunks",
      "Review and adjust your deadline if possible",
    ],
  };
}

function mockRescuePlan() {
  return {
    criticalTasks: ["Complete core functionality first", "Prepare minimal viable deliverable", "Test critical path only"],
    tasksToSkip: ["Nice-to-have features", "Extensive documentation", "Performance optimization"],
    scopeReduction: "Focus on the 20% of features that deliver 80% of the value. Cut all non-essential work.",
    timeline: [
      { time: "Next 2 hours", action: "Complete the most critical remaining tasks", priority: "critical" as const },
      { time: "Hours 3-5", action: "Test and verify core functionality", priority: "high" as const },
      { time: "Final hour", action: "Package and deliver minimum viable version", priority: "critical" as const },
    ],
    recoveryStrategy: "Focus entirely on the minimum viable deliverable. Communicate proactively with stakeholders about scope reduction. Quality over quantity — deliver something solid rather than something incomplete.",
    recommendedTools: ["Pomodoro timer for focused sessions", "Task checklist to track progress", "Time blocking to eliminate distractions"],
  };
}

function mockCoachResult(completed: number, total: number) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    assessment: `You have completed ${completed} out of ${total} tasks (${rate}% completion rate). Configure your Gemini API key for personalized AI coaching insights.`,
    feedback: "Keep pushing forward. Every completed task builds momentum toward your goals.",
    recommendations: [
      "Prioritize high-risk tasks first each day",
      "Set specific time blocks for focused work sessions",
      "Review and update task progress daily",
    ],
    recoveryActions: [
      "Identify your single most important task and start there",
      "Block out 2-hour focus sessions in your calendar",
    ],
    motivationalMessage: "Progress is built one task at a time. You have everything you need to succeed — now execute.",
    productivityScore: rate,
  };
}

export default router;
