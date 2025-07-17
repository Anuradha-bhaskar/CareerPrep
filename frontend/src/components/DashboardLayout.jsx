
import { useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import ResumeAnalyser from "../pages/Dashboard/ResumeAnalyser.jsx";
import AIInterview from "../pages/Dashboard/AIInterview.jsx";
import InterviewReview from "../pages/Dashboard/InterviewReview.jsx";
import Profile from "../pages/Dashboard/Profile.jsx";

export default function DashboardLayout() {
  const { user } = useUser();
  const userName = user?.firstName || "User";
  const [activeLink, setActiveLink] = useState("/dashboard/resume-analyser");

  return (
    <div className="min-h-screen h-screen w-full bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 p-6 font-inter overflow-hidden">
      {/* Header */}
      <header className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-gray-600 md:hidden" />
          <h1 className="text-2xl font-bold text-gray-800">CareerPrep</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-800 font-medium">Welcome, {userName}</span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </header>

      {/* Layout with Sidebar */}
      <div className="flex flex-col md:flex-row h-[calc(90vh-4rem)]"> {/* 7rem = header + padding */}
        <Sidebar activeLink={activeLink} setActiveLink={setActiveLink} />

        {/* Main Content */}
        <main className="bg-white rounded-2xl shadow-lg p-6 flex-1 h-full overflow-hidden">
          <h2 className="text-lg font-semibold text-indigo-600 mb-4">
            {activeLink.replace("/dashboard/", "").replace("-", " ").toUpperCase()}
          </h2>
          <div className="min-h-96 h-full overflow-hidden">
            {activeLink === "/dashboard/resume-analyser" && <ResumeAnalyser />}
            {activeLink === "/dashboard/ai-interview" && <AIInterview />}
            {activeLink === "/dashboard/interview-review" && <InterviewReview />}
            {activeLink === "/dashboard/profile" && <Profile />}
          </div>
        </main>
      </div>
    </div>
  );
}
