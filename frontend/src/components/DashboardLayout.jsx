
import { useUser, UserButton } from "@clerk/clerk-react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Sparkles, Bell, Settings } from "lucide-react";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { user } = useUser();
  const location = useLocation();
  const userName = user?.firstName || "User";

  // Get the current page name from the route
  const getCurrentPageName = () => {
    const path = location.pathname.replace("/dashboard/", "");
    return path.replace("-", " ");
  };

  return (
    <div className="min-h-screen h-screen w-full bg-gray-50 p-2 font-inter overflow-hidden">
      {/* Header */}
      <header className="bg-white border border-gray-200 rounded-t-3xl shadow-sm p-4 flex items-center justify-between relative">
        {/* Left section */}
        <div className="flex items-center gap-4 relative z-10">
          <Menu className="w-5 h-5 text-gray-600 lg:hidden hover:text-blue-600 transition-colors cursor-pointer" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                CareerPrep
              </h1>
              <p className="text-xs text-gray-500 font-medium">AI-Powered Career Assistant</p>
            </div>
          </div>
        </div>
        
        {/* Right section */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-600">Welcome back,</p>
              <p className="text-sm font-bold text-gray-900">
                {userName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border-2 border-white shadow-md",
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        </div>
      </header>

      {/* Layout with Sidebar */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4.5rem)]">
        <div className="flex flex-col lg:flex-row flex-1 bg-white border border-gray-200 border-t-0 rounded-b-3xl shadow-sm overflow-hidden">
          {/* Sidebar */}
          <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-white">
            <div className="p-4 border-b border-gray-200 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-sm"></div>
                </div>
                <h2 className="text-lg font-bold text-gray-900 capitalize">
                  {getCurrentPageName()}
                </h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 relative z-10 bg-gray-50">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
