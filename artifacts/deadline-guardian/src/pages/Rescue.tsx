import { motion } from "framer-motion";
import { subscribeTasks, saveRescuePlan } from "@/services/taskService";
import { generateRescuePlan } from "@/services/aiService";
import { Task } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function Rescue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rescuingId, setRescuingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeTasks((fetchedTasks) => {
      setTasks(fetchedTasks);
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const criticalTasks = tasks.filter(t => t.status !== 'completed' && (t.riskScore || 0) >= 70);

  async function handleRescue(task: Task) {
    setRescuingId(task.id);
    try {
      const result = await generateRescuePlan({
        title: task.title,
        deadline: task.deadline,
        progress: task.progress,
        riskScore: task.riskScore || 75,
        estimatedHours: task.estimatedHours || 4,
        description: task.description || "",
      });

      await saveRescuePlan(task.id, result);
      toast.success("Emergency protocols activated");
    } catch (error) {
      console.error(error);
      toast.error("Rescue protocol generation failed");
    } finally {
      setRescuingId(null);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-red-500" /> Emergency Rescue
        </h1>
        <p className="text-muted-foreground mt-2">Critical intervention protocols for failing deadlines.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full bg-white/5 rounded-xl border border-white/10" />
        ) : criticalTasks.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <p className="text-xl font-medium text-foreground">No Critical Emergencies</p>
            <p className="mt-2">All tasks are currently operating within acceptable risk parameters.</p>
          </div>
        ) : (
          criticalTasks.map((task) => {
            const plan = task.rescuePlan ? JSON.parse(task.rescuePlan) : null;
            const isRescuing = rescuingId === task.id;

            return (
              <motion.div layout key={task.id}>
                <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  
                  <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Code Red Protocol Required</span>
                      </div>
                      <CardTitle className="text-2xl">{task.title}</CardTitle>
                    </div>
                    
                    {!plan && (
                      <Button 
                        onClick={() => handleRescue(task)} 
                        disabled={isRescuing}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                      >
                        {isRescuing ? (
                          <><Zap className="w-4 h-4 mr-2 animate-pulse" /> Compiling Stratagem...</>
                        ) : (
                          <><Zap className="w-4 h-4 mr-2" /> Activate Rescue Plan</>
                        )}
                      </Button>
                    )}
                  </CardHeader>

                  {plan && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        {/* Strategy Overview */}
                        <div className="md:col-span-1 space-y-6">
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Scope Reduction</h4>
                            <p className="text-sm text-foreground/90">{plan.scopeReduction}</p>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Recovery Strategy</h4>
                            <p className="text-sm text-foreground/90">{plan.recoveryStrategy}</p>
                          </div>
                          
                          <Button 
                            onClick={() => handleRescue(task)} 
                            disabled={isRescuing}
                            variant="outline"
                            className="w-full border-white/10 hover:bg-white/5 text-xs"
                          >
                            <Zap className="w-3 h-3 mr-2" /> Regenerate Protocol
                          </Button>
                        </div>

                        {/* Timeline & Actions */}
                        <div className="md:col-span-2 bg-black/20 rounded-lg p-5 border border-white/5">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Execution Timeline
                          </h4>
                          
                          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                            {plan.timeline?.map((item: any, i: number) => (
                              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white/20 bg-background text-white/50 group-[.is-active]:bg-primary group-[.is-active]:text-primary-foreground group-[.is-active]:border-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                </div>
                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white/5 p-3 rounded-md border border-white/5 shadow-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-xs text-primary">{item.time}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                      item.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                      item.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }`}>{item.priority}</span>
                                  </div>
                                  <p className="text-sm text-foreground/90">{item.action}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}