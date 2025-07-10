import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx";
import { Routes, Route } from "react-router-dom";
import { AuthenticationPage } from "./auth/AuthenticationPage.jsx";
import Test from "./components/Test.jsx";
import "./App.css";
import LandingPage from "./pages/Landingpage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

function App() {
  return (
    <ClerkProviderWithRoutes>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/sign-in/*" element={<AuthenticationPage />} />
        <Route path="/sign-up" element={<AuthenticationPage />} />
        <Route
          path="/dashboard"
          element={
            <SignedIn>
              <Dashboard />
            </SignedIn>
          }
        />
      </Routes>
    </ClerkProviderWithRoutes>
  );
}

export default App;
