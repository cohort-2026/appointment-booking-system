import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <AppRoutes />
      </TooltipProvider>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </AuthProvider>
  );
}