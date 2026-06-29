import { motion } from "framer-motion";
import { useListTasks, useAnalyzeRisk, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Risk() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks();
  const analyzeRisk = useAnalyzeRisk();
  const updateTask = useUpdateTask();
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const activeTasks = tasks?.filter(t => t.status !== 'completed') || [];

  function handleAnalyze(task: any) {
    setAnalyzingId(task.id);
    analyzeRisk.mutate({
      data: {
        taskId: task.id,
        title: task.title,
        deadline: task.deadline,
        progress: task.progress,
        estimatedHours: task.estimatedHours || 4,
        description: task.description || "",
        energyLevel: task.energyLevel || "medium"
      }
    }, {
      onSuccess: (result) => {
        // Save the result
        updateTask.mutate({
          id: task.id,
          data: {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            riskAnalysis: JSON.stringify(result)
          }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            toast.success("Risk analysis complete");
            setAnalyzingId(null);
          }
        });
      },
      onError: () => {
        toast.error("Failed to analyze risk");
        setAnalyzingId(null);
      }
    });
  }

  const getRiskColor = (level?: string | null) => {
    switch(level) {
      case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-red-500 to-rose-600 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" /> Threat Intelligence
        </h1>
        <p className="text-muted-foreground mt-2">AI-powered deadline vulnerability assessment.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full bg-white/5 rounded-xl border border-white/10" />
          ))
        ) : activeTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed flex flex-col items-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium text-foreground">No active threats detected</p>
            <p className="text-sm mt-1">Your task queue is clear.</p>
          </div>
        ) : (
          activeTasks.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).map((task) => {
            const analysis = task.riskAnalysis ? JSON.parse(task.riskAnalysis) : null;
            const isAnalyzing = analyzingId === task.id;

            return (
              <motion.div layout key={task.id}>
                <Card className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden relative">
                  <div className="flex flex-col md:flex-row gap-6 p-6">
                    {/* Left side: Basic info & action */}
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold text-foreground">{task.title}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getRiskColor(task.riskLevel)}`}>
                          {task.riskLevel || 'unassessed'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div>Deadline: {new Date(task.deadline).toLocaleDateString()}</div>
                        <div>Progress: {task.progress}%</div>
                      </div>

                      <Button 
                        onClick={() => handleAnalyze(task)} 
                        disabled={isAnalyzing}
                        variant={task.riskScore ? "outline" : "default"}
                        className={task.riskScore ? "border-white/10 hover:bg-white/5" : "bg-primary hover:bg-primary/90"}
                      >
                        {isAnalyzing ? (
                          <><Activity className="w-4 h-4 mr-2 animate-pulse" /> Scanning Vectors...</>
                        ) : (
                          <><Activity className="w-4 h-4 mr-2" /> {task.riskScore ? "Re-evaluate Risk" : "Analyze Risk"}</>
                        )}
                      </Button>
                    </div>

                    {/* Right side: Analysis Results */}
                    {task.riskScore !== null && task.riskScore !== undefined && (
                      <div className="w-full md:w-1/2 flex flex-col md:border-l md:border-white/10 md:pl-6 pt-4 md:pt-0 border-t border-white/10 mt-4 md:mt-0">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={task.riskScore >= 70 ? "#ef4444" : task.riskScore >= 40 ? "#f59e0b" : "#10b981"}
                                strokeWidth="3"
                                strokeDasharray={`${task.riskScore}, 100`}
                              />
                            </svg>
                            <div className="absolute font-bold text-sm">{task.riskScore}</div>
                          </div>
                          <div>
                            <p className="text-sm text-foreground leading-relaxed">{analysis?.explanation || "High probability of deadline slip based on current velocity."}</p>
                          </div>
                        </div>

                        {analysis?.recommendations && (
                          <div className="space-y-2 mt-auto">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tactical Recommendations</p>
                            <ul className="space-y-1.5">
                              {analysis.recommendations.slice(0, 2).map((rec: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2 text-foreground/80">
                                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                                  <span className="line-clamp-2">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}