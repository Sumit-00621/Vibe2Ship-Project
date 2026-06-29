export interface Subtask {
  title: string;
  estimatedTime?: string;
  difficulty: "easy" | "medium" | "hard";
  dependencies?: string[];
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  estimatedHours?: number;
  availableHours?: number;
  energyLevel?: "low" | "medium" | "high";
  progress: number;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "completed";
  riskScore?: number | null;
  riskLevel?: "low" | "medium" | "high" | "critical" | null;
  subtasks?: string | null; // JSON string of Subtask[]
  riskAnalysis?: string | null; // JSON string of risk details
  rescuePlan?: string | null; // JSON string of rescue plan details
  createdAt?: string;
  updatedAt?: string;
}
