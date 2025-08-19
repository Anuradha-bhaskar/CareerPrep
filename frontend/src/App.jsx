import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthenticationPage from "./auth/AuthenticationPage.jsx";
import LandingPage from "./pages/Landingpage.jsx";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import DashboardLayout from "./components/DashboardLayout.jsx";
import ResumeAnalyser from "./pages/Dashboard/ResumeAnalyser.jsx";
import AIInterview from "./pages/Dashboard/AIInterview.jsx";
import InterviewReview from "./pages/Dashboard/InterviewReview.jsx";
import Profile from "./pages/Dashboard/Profile.jsx";
import CareerGuidancePage from "./pages/Dashboard/CareerGuidancePage.jsx";

function App() {
  return (
    <ClerkProviderWithRoutes>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <Navigate to="/dashboard/resume-analyser" replace />
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
        >
          <Route index element={<Navigate to="resume-analyser" replace />} />
          <Route path="resume-analyser" element={<ResumeAnalyser />} />
          <Route path="resume-analyser/guidance/:resumeId" element={<CareerGuidancePage />} />
          <Route path="ai-interview" element={<AIInterview />} />
          <Route path="interview-review" element={<InterviewReview />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </ClerkProviderWithRoutes>
  );
}

export default App;
