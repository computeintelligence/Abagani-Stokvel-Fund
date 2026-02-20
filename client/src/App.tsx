import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { SupplierAuthProvider } from "@/lib/supplier-auth";
import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import SignUp from "@/pages/signup";
import SignIn from "@/pages/signin";
import Welcome from "@/pages/welcome";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import SupplierSignup from "@/pages/supplier-signup";
import SupplierLogin from "@/pages/supplier-login";
import SupplierDashboard from "@/pages/supplier-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route path="/supplier/signup" component={SupplierSignup} />
      <Route path="/supplier/login" component={SupplierLogin} />
      <Route path="/supplier/dashboard" component={SupplierDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <SupplierAuthProvider>
              <Toaster />
              <Router />
            </SupplierAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
