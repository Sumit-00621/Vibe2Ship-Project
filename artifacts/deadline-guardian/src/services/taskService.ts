import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp
} from "firebase/firestore";
import { Task } from "../types/task";

const tasksCollection = collection(db, "tasks");
const rescuePlansCollection = collection(db, "rescuePlans");
const riskReportsCollection = collection(db, "riskReports");
const coachReportsCollection = collection(db, "coachReports");

export function subscribeTasks(callback: (tasks: Task[]) => void, onError?: (error: Error) => void) {
  const q = query(tasksCollection, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        deadline: data.deadline || "",
        estimatedHours: data.estimatedHours || 0,
        availableHours: data.availableHours || 0,
        energyLevel: data.energyLevel || "medium",
        progress: data.progress || 0,
        priority: data.priority || "medium",
        status: data.status || "todo",
        riskScore: data.riskScore !== undefined ? data.riskScore : null,
        riskLevel: data.riskLevel !== undefined ? data.riskLevel : null,
        subtasks: data.subtasks || null,
        riskAnalysis: data.riskAnalysis || null,
        rescuePlan: data.rescuePlan || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });
    callback(tasks);
  }, (err) => {
    console.error("Firestore onSnapshot error:", err);
    if (onError) onError(err);
  });
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'progress'> & { progress?: number }) {
  const docRef = await addDoc(tasksCollection, {
    ...task,
    progress: task.progress ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) {
  const docRef = doc(db, "tasks", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id: string) {
  const docRef = doc(db, "tasks", id);
  await deleteDoc(docRef);
}

export async function saveRescuePlan(taskId: string, plan: any) {
  // Update task first
  await updateTask(taskId, {
    rescuePlan: JSON.stringify(plan)
  });
  
  // Save to rescuePlans collection
  await addDoc(rescuePlansCollection, {
    taskId,
    plan,
    createdAt: serverTimestamp()
  });
}

export async function saveRiskReport(taskId: string, report: any) {
  // Update task first
  await updateTask(taskId, {
    riskScore: report.riskScore,
    riskLevel: report.riskLevel,
    riskAnalysis: JSON.stringify(report)
  });
  
  // Save to riskReports collection
  await addDoc(riskReportsCollection, {
    taskId,
    report,
    createdAt: serverTimestamp()
  });
}

export async function saveCoachReport(report: any) {
  // Save to coachReports collection
  await addDoc(coachReportsCollection, {
    report,
    createdAt: serverTimestamp()
  });
}
