import { motion } from "framer-motion";
import { useListTasks, useGenerateCoachInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, Sparkles, Target, ArrowUpCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Coach() {
  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const generateInsights = useGenerateCoachInsights();
  const [insights, setInsights] = useState<any>(null);

  function handleGenerate() {
    if (!tasks || tasks.length === 0) {
      toast.error("Need active tasks to generate coaching insights");
      return;
    }

    generateInsights.mutate({ data: { tasks: tasks.filter(t => t.status !== 'completed') } }, {
      onSuccess: (result) => {
        setInsights(result);
        toast.success("Coach report generated");
      },
      onError: () => toast.error("Failed to connect to AI Coach")
    });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-purple-500" /> Neural Coach
          </h1>
          <p className="text-muted-foreground mt-2">Personalized performance analysis and optimization.</p>
        </div>
        
        <Button 
          onClick={handleGenerate} 
          disabled={tasksLoading || generateInsights.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]"
        >
          {generateInsights.isPending ? (
            <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Synthesizing...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Request Coaching Session</>
          )}
        </Button>
      </div>

      {!insights && !generateInsights.isPending && (
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-[spin_4s_linear_infinite]" />
              <BrainCircuit className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">Awaiting Initialization</h2>
            <p className="text-muted-foreground max-w-md">
              The neural coach analyzes your current workload, progress rates, and historical data to provide tactical advice.
            </p>
          </CardContent>
        </Card>
      )}

      {generateInsights.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-3 h-32 bg-white/5 rounded-xl border border-white/10" />
          <Skeleton className="md:col-span-2 h-64 bg-white/5 rounded-xl border border-white/10" />
          <Skeleton className="md:col-span-1 h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      )}

      {insights && !generateInsights.isPending && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Motivational Banner */}
          <Card className="md:col-span-3 bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent border-purple-500/30">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-purple-300 mb-2 font-mono uppercase tracking-widest text-xs">Direct Transmission</h3>
                <p className="text-2xl text-foreground font-serif italic">"{insights.motivationalMessage}"</p>
              </div>
              <div className="hidden md:flex w-24 h-24 rounded-full border-4 border-purple-500/30 items-center justify-center flex-col shadow-[0_0_30px_rgba(147,51,234,0.2)]">
                <span className="text-3xl font-bold text-foreground">{insights.productivityScore}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Score</span>
              </div>
            </CardContent>
          </Card>

          {/* Assessment & Feedback */}
          <Card className="md:col-span-2 bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-blue-400" /> Current Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-foreground/90 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                  {insights.assessment}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Performance Feedback</h4>
                <p className="text-foreground/80 leading-relaxed pl-4 border-l-2 border-purple-500/50">
                  {insights.feedback}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-white/5 backdrop-blur-md border-white/10 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> Optimization Vectors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {insights.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/80">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                        {i+1}
                      </div>
                      <span className="leading-snug">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}