import { motion } from "framer-motion";
import { subscribeTasks } from "@/services/taskService";
import { Task } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export default function Analytics() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeTasks((fetchedTasks) => {
      setTasks(fetchedTasks);
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    return days.map((day, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (now.getDay() - i + 7) % 7);
      const dateStr = date.toDateString();

      const dayTasks = tasks.filter((t) => {
        return t.updatedAt ? new Date(t.updatedAt).toDateString() === dateStr : false;
      });

      const completed = dayTasks.filter((t) => t.status === "completed").length;
      const created = tasks.filter((t) => {
        return t.createdAt ? new Date(t.createdAt).toDateString() === dateStr : false;
      }).length;

      const risked = dayTasks.filter((t) => t.riskScore != null);
      const riskAvg =
        risked.length > 0
          ? risked.reduce((s, t) => s + (t.riskScore ?? 0), 0) / risked.length
          : 0;

      return { day, completed, created, riskAvg: Math.round(riskAvg) };
    });
  }, [tasks]);

  // Mock data if database is empty to keep UI populated on first load
  const defaultData = [
    { day: "Mon", completed: 4, created: 5, riskAvg: 45 },
    { day: "Tue", completed: 7, created: 3, riskAvg: 40 },
    { day: "Wed", completed: 5, created: 6, riskAvg: 55 },
    { day: "Thu", completed: 8, created: 4, riskAvg: 30 },
    { day: "Fri", completed: 3, created: 8, riskAvg: 65 },
    { day: "Sat", completed: 2, created: 1, riskAvg: 50 },
    { day: "Sun", completed: 6, created: 2, riskAvg: 35 },
  ];

  const chartData = tasks.length > 0 ? weeklyData : defaultData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
              <span className="font-bold text-foreground">{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-cyan-400" /> Telemetry
        </h1>
        <p className="text-muted-foreground mt-2">Historical velocity and risk metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-md border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Velocity: Created vs Completed</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? <Skeleton className="w-full h-full bg-white/5 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="created" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Average Risk Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? <Skeleton className="w-full h-full bg-white/5 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="riskAvg" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}