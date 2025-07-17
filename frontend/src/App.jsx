import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthenticationPage from "./auth/AuthenticationPage.jsx";
import LandingPage from "./pages/Landingpage.jsx";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import DashboardLayout from "./components/DashboardLayout.jsx";

function App() {
  return (
    <ClerkProviderWithRoutes>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
              <SignedOut>
                <LandingPage />
              </SignedOut>
            </>
          }
        />

        <Route path="/sign-in/*" element={<AuthenticationPage />} />
        <Route path="/sign-up" element={<AuthenticationPage />} />

        <Route
          path="/dashboard"
          element={
            <SignedIn>
              <DashboardLayout />
            </SignedIn>
          }
        />
      </Routes>
    </ClerkProviderWithRoutes>
  );
}

export default App;
