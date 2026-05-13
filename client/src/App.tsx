import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AssistantChatbot } from "@/components/AssistantChatbot";
import { useAuth } from "@/hooks/use-auth";
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
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import TeamJoin from "@/pages/TeamJoin";
import TeamSession from "@/pages/TeamSession";
import NotFound from "@/pages/not-found";

function HomeOrPractice() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  if (user) return <Redirect to="/practice" />;
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeOrPractice} />
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
      <Route path="/teams" component={Teams} />
      <Route path="/teams/join/:code" component={TeamJoin} />
      <Route path="/teams/:id/sessions/:roundId" component={TeamSession} />
      <Route path="/teams/:id" component={TeamDetail} />
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
