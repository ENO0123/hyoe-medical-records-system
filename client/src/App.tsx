import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Doctors from "./pages/Doctors";
import DoctorDetail from "./pages/DoctorDetail";
import TestItems from "./pages/TestItems";
import Visits from "./pages/Visits";
import TestResults from "./pages/TestResults";
import AbnormalResults from "./pages/AbnormalResults";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/patients/:id"} component={PatientDetail} />
      <Route path={"/patients"} component={Patients} />
      <Route path={"/doctors/:id"} component={DoctorDetail} />
      <Route path={"/doctors"} component={Doctors} />
      <Route path={"/test-items"} component={TestItems} />
      <Route path={"/visits"} component={Visits} />
      <Route path={"/test-results"} component={TestResults} />
      <Route path={"/abnormal-results"} component={AbnormalResults} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
