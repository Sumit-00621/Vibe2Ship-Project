import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Risk from "@/pages/Risk";
import Rescue from "@/pages/Rescue";
import Coach from "@/pages/Coach";
import Analytics from "@/pages/Analytics";

const queryClient = new QueryClient();

function Router() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/risk" component={Risk} />
        <Route path="/rescue" component={Rescue} />
        <Route path="/coach" component={Coach} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" className="!bg-card !border-white/10 !text-foreground" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;