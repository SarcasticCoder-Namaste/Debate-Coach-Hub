import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AssistantChatbot } from "@/components/AssistantChatbot";
import Home from "@/pages/Home";
import SignIn from "@/pages/SignIn";
import PracticeBot from "@/pages/PracticeBot";
import Topics from "@/pages/Topics";
import TopicDetail from "@/pages/TopicDetail";
import SharedClip from "@/pages/SharedClip";
import Pricing from "@/pages/Pricing";
import Research from "@/pages/Research";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Coaches from "@/pages/Coaches";
import AdminLeads from "@/pages/AdminLeads";
import Drills from "@/pages/Drills";
import DrillRunner from "@/pages/DrillRunner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/practice" component={PracticeBot} />
      <Route path="/topics" component={Topics} />
      <Route path="/topics/:id" component={TopicDetail} />
      <Route path="/share/:id" component={SharedClip} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/research" component={Research} />
      <Route path="/research/:id" component={Research} />
      <Route path="/drills" component={Drills} />
      <Route path="/drills/:id" component={DrillRunner} />
      <Route path="/drill" component={Drills} />
      <Route path="/my-research" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/coaches" component={Coaches} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <AssistantChatbot />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
