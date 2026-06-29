import { useEffect, useState, useMemo } from "react";
import { subscribeTasks } from "@/services/taskService";
import { Task } from "@/types/task";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, AlertOctagon, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
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

  const summary = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const highRiskTasks = tasks.filter(
      (t) => t.riskLevel === "high" || t.riskLevel === "critical"
    ).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const riskedTasks = tasks.filter((t) => t.riskScore != null);
    const averageRisk =
      riskedTasks.length > 0
        ? riskedTasks.reduce((sum, t) => sum + (t.riskScore ?? 0), 0) / riskedTasks.length
        : 0;

    const productivityScore = Math.min(
      100,
      Math.round(completionRate * 0.6 + (100 - averageRisk) * 0.4)
    );

    const now = new Date();
    const upcomingDeadlines = tasks
      .filter((t) => {
        const deadline = new Date(t.deadline);
        const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return t.status !== "completed" && diffDays >= 0 && diffDays <= 7;
      })
      .slice(0, 5);

    const recentActivity = tasks.slice(0, 5);

    return {
      totalTasks,
      completedTasks,
      highRiskTasks,
      productivityScore,
      completionRate,
      averageRisk,
      upcomingDeadlines,
      recentActivity,
    };
  }, [tasks]);

  const statCards = [
    { title: "Total Tasks", value: summary.totalTasks, icon: Activity, color: "text-blue-500" },
    { title: "Completed", value: summary.completedTasks, icon: CheckCircle2, color: "text-emerald-500" },
    { title: "High Risk", value: summary.highRiskTasks, icon: AlertOctagon, color: "text-red-500" },
    { title: "Productivity", value: `${summary.productivityScore}%`, icon: TrendingUp, color: "text-purple-500" },
  ];

  const chartData = [
    { name: "Completed", value: summary.completedTasks },
    { name: "Remaining", value: summary.totalTasks - summary.completedTasks }
  ];
  const COLORS = ['#10b981', '#334155'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-2">Your proactive productivity overview.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 bg-white/5 rounded-xl border border-white/10" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Completion Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {isLoading ? <Skeleton className="w-full h-full bg-white/5 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
              </div>
            ) : summary?.recentActivity && summary.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {summary.recentActivity.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <p className="font-medium text-sm text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(task.deadline).toLocaleDateString()}</p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}