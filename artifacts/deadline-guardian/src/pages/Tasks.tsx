import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Clock, AlertTriangle, Zap, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["todo", "in_progress", "completed"]),
  energyLevel: z.enum(["low", "medium", "high"]).optional(),
  estimatedHours: z.coerce.number().optional(),
});

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: new Date().toISOString().split('T')[0],
      priority: "medium",
      status: "todo",
      energyLevel: "medium",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTask.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsDialogOpen(false);
        form.reset();
        toast.success("Task created successfully");
      },
      onError: () => toast.error("Failed to create task")
    });
  }

  function handleStatusToggle(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    updateTask.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
      }
    });
  }

  function handleDelete(id: number) {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast.success("Task deleted");
      }
    });
  }

  const priorityColors = {
    low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
            Task Manifest
          </h1>
          <p className="text-muted-foreground mt-2">Manage your priorities and deadlines.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-foreground">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Complete MVP frontend..." className="bg-background/50 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-background/50 border-white/10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-white/10">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10 text-foreground">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={createTask.isPending}>
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-white/5 backdrop-blur-md border-white/10 h-48">
                  <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4 bg-white/10" />
                      <Skeleton className="h-4 w-1/2 bg-white/10" />
                    </div>
                    <Skeleton className="h-2 w-full bg-white/10 mt-4" />
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : tasks?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
              <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">No active tasks</p>
              <p className="text-sm mt-1">All clear. Create a task to get started.</p>
            </div>
          ) : (
            tasks?.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden hover:border-white/20 transition-colors group relative flex flex-col h-full">
                  {task.priority === 'critical' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                        {task.priority}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 leading-tight flex items-start gap-2">
                      <button 
                        onClick={() => handleStatusToggle(task.id, task.status)}
                        className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          task.status === 'completed' 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                            : 'border-white/30 hover:border-white/60 text-transparent hover:text-white/20'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}>
                        {task.title}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end pt-4">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      {task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {task.estimatedHours}h est.
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-1.5 bg-white/10" indicatorClassName={task.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}