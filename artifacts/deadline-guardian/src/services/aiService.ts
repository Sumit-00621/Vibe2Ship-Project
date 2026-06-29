import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY not set — AI features will return mock responses");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helpers to call Gemini
async function generateContent(prompt: string): Promise<string> {
  if (!ai) {
    throw new Error("No API key configured");
  }
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  return response.text ?? "{}";
}

// 1. Task Breakdown
export async function generateBreakdown(title: string, description?: string, estimatedHours?: number, deadline?: string) {
  if (!ai) {
    return mockBreakdown();
  }
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
    const result = JSON.parse(raw);
    return Array.isArray(result.subtasks) ? result.subtasks : mockBreakdown();
  } catch (err) {
    console.error("Gemini breakdown error:", err);
    return mockBreakdown();
  }
}

// 2. Risk Assessment
export async function generateRiskAnalysis(task: {
  title: string;
  description?: string;
  deadline?: string;
  progress: number;
  estimatedHours?: number;
  availableHours?: number;
  energyLevel?: string;
}) {
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (!ai) {
    return mockRiskResult(task.progress, daysLeft);
  }

  const prompt = `You are a deadline risk analysis AI. Analyze this task and predict the risk of missing the deadline.

Task: "${task.title}"
Description: "${task.description ?? "None"}"
Deadline: ${task.deadline ?? "Not set"} (${daysLeft != null ? daysLeft + " days left" : "unknown"})
Current Progress: ${task.progress}%
Estimated Hours: ${task.estimatedHours ?? "Unknown"}
Available Hours: ${task.availableHours ?? "Unknown"}
Energy Level: ${task.energyLevel ?? "Not specified"}

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
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gemini risk analysis error:", err);
    return mockRiskResult(task.progress, daysLeft);
  }
}

// 3. Rescue Plan
export async function generateRescuePlan(task: {
  title: string;
  description?: string;
  deadline?: string;
  progress: number;
  estimatedHours?: number;
  availableHours?: number;
  riskScore?: number;
}) {
  if (!ai) {
    return mockRescuePlan();
  }

  const prompt = `You are an emergency project rescue AI. This task is at critical risk. Generate an emergency rescue plan.

Task: "${task.title}"
Description: "${task.description ?? "None"}"
Deadline: ${task.deadline ?? "Not set"}
Current Progress: ${task.progress}%
Estimated Hours: ${task.estimatedHours ?? "Unknown"}
Available Hours: ${task.availableHours ?? "Unknown"}
Risk Score: ${task.riskScore ?? 75}/100

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
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gemini rescue plan error:", err);
    return mockRescuePlan();
  }
}

// 4. Coach Insights
export async function generateCoachInsights(tasks: Array<{
  title: string;
  status: string;
  progress: number;
  riskLevel?: string | null;
}>) {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status !== "completed").length;
  const highRisk = tasks.filter((t) => t.riskLevel === "high" || t.riskLevel === "critical").length;
  const avgProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length)
      : 0;

  if (!ai) {
    return mockCoachResult(completed, tasks.length);
  }

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
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gemini coach insights error:", err);
    return mockCoachResult(completed, tasks.length);
  }
}

// Fallback Mock data
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
