
import { useUser, UserButton } from "@clerk/clerk-react";
import { Outlet, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { user } = useUser();
  const location = useLocation();
  const userName = user?.firstName || "User";

  // Get the current page name from the route
  const getCurrentPageName = () => {
    const path = location.pathname.replace("/dashboard/", "");
    const segments = path.split("/").filter(Boolean);
    const first = segments[0] || "";

    // Map known routes and dynamic segments to friendly names
    if (first === "resume-analyser") {
      if (segments[1] === "guidance") return "Career Guidance";
      return "Resume Analyser";
    }
    if (first === "ai-interview") return "AI Interview";
    if (first === "interview-review") return "Interview Review";
    if (first === "profile") return "Profile";

    // Fallback: prettify the first segment
    return first ? first.replace("-", " ") : "Dashboard";
  };

  return (
    <div className="min-h-screen h-screen w-full bg-gradient-to-br from-orange-50 to-pink-50 font-inter overflow-x-hidden relative">
      {/* Background elements - EXACTLY like landing page */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-60 mobile:hidden"></div>
      <div className="absolute top-80 right-40 w-24 h-24 bg-pink-200 rounded-full opacity-60 mobile:hidden"></div>
      <div className="absolute bottom-40 left-60 w-20 h-20 bg-coral-200 rounded-full opacity-60 mobile:hidden"></div>

      {/* Header - Responsive design */}
      <header className="bg-white border-b border-gray-200 shadow-sm p-4 flex items-center justify-between relative z-20">
        {/* Left section */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">CareerPrep</h1>
              <p className="text-xs text-gray-500 font-medium">AI-Powered Career Assistant</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-gray-800">CareerPrep</h1>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-600">Welcome back,</p>
              <p className="text-sm font-bold text-gray-900">{userName}</p>
            </div>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 sm:w-9 sm:h-9 border-2 border-white shadow-md",
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </header>

      {/* Layout with Responsive Sidebar */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] relative">
        {/* Sidebar - Always visible, responsive sizing */}
        <div className="w-full lg:w-69 bg-white/90 backdrop-blur-sm border-r border-gray-200 h-auto lg:h-full overflow-y-auto flex-shrink-0 shadow-lg">
          <div className="p-4 border-b border-gray-200 lg:hidden">
            <h2 className="text-lg font-semibold text-gray-800 text-center">Navigation</h2>
          </div>
          <Sidebar onNavigate={() => {}} />
        </div>

        {/* Main Content - Responsive layout with proper height */}
        <main className="flex-1 min-h-0 lg:h-full overflow-hidden flex flex-col relative bg-white/80 backdrop-blur-sm">
          <div className="p-3 sm:p-4 border-b border-gray-200 relative z-10 flex-shrink-0 bg-white/90">
            <div className="flex items-center">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 capitalize">{getCurrentPageName()}</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 relative z-10 min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
