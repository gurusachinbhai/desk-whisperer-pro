import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Landing from "./pages/Landing.tsx";
import Admin from "./pages/Admin.tsx";
import About from "./pages/About.tsx";
import Customers from "./pages/Customers.tsx";
import Careers from "./pages/Careers.tsx";
import Contact from "./pages/Contact.tsx";
import Plans from "./pages/Plans.tsx";
import FreeTrial from "./pages/FreeTrial.tsx";
import Enterprise from "./pages/Enterprise.tsx";
import Blogs from "./pages/Blogs.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Guides from "./pages/Guides.tsx";
import CaseStudies from "./pages/CaseStudies.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Security from "./pages/Security.tsx";
import DeskBooking from "./pages/DeskBooking.tsx";
import Payroll from "./pages/Payroll.tsx";
import AttendanceLeave from "./pages/AttendanceLeave.tsx";
import CRM from "./pages/CRM.tsx";
import Help from "./pages/Help.tsx";
import Tickets from "./pages/Tickets.tsx";
import NotFound from "./pages/NotFound.tsx";
import OfficeKiosk from "./pages/OfficeKiosk.tsx";
import DeviceShell from "./components/DeviceShell";
import SeoHead from "./components/SeoHead";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DeviceShell>
          <SeoHead />
          <main><Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Index />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<About />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pricing/plans" element={<Plans />} />
            <Route path="/pricing/free-trial" element={<FreeTrial />} />
            <Route path="/pricing/enterprise" element={<Enterprise />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />
            <Route path="/product/desk-booking" element={<DeskBooking />} />
            <Route path="/product/payroll" element={<Payroll />} />
            <Route path="/product/attendance-leave" element={<AttendanceLeave />} />
            <Route path="/product/crm" element={<CRM />} />
            <Route path="/help" element={<Help />} />
            <Route path="/tickets" element={<Tickets />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes></main>
        </DeviceShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
