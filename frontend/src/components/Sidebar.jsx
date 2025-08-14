import { Briefcase, Bot, ClipboardList, User, Star, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navLinks = [
    { 
      name: "Resume Analyser", 
      href: "/dashboard/resume-analyser", 
      icon: Briefcase,
      color: "bg-blue-600",
      description: "Analyze and improve your resume"
    },
    { 
      name: "AI Interview", 
      href: "/dashboard/ai-interview", 
      icon: Bot,
      color: "bg-purple-600",
      description: "Practice with AI interviewer"
    },
    { 
      name: "Interview Review", 
      href: "/dashboard/interview-review", 
      icon: ClipboardList,
      color: "bg-green-600",
      description: "Review your performance"
    },
    { 
      name: "Career Guidance", 
      href: "/dashboard/career-guidance", 
      icon: Star,
      color: "bg-orange-600",
      description: "Get personalized career advice"
    },
    { 
      name: "Profile", 
      href: "/dashboard/profile", 
      icon: User,
      color: "bg-pink-600",
      description: "Manage your profile"
    },
  ];

  return (
    <aside className="w-full h-full p-4 flex flex-col relative overflow-hidden">
      {/* Navigation */}
      <nav className="flex flex-col gap-2 relative z-10 flex-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-blue-50 border border-blue-200 shadow-sm" 
                  : "hover:bg-white hover:shadow-sm border border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Icon with solid background */}
                <div className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center shadow-sm transform transition-transform group-hover:scale-105 ${isActive ? 'scale-105' : ''}`}>
                  <link.icon className="w-5 h-5 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm transition-colors ${
                    isActive 
                      ? "text-blue-800" 
                      : "text-gray-700 group-hover:text-gray-900"
                  }`}>
                    {link.name}
                  </h3>
                  <p className={`text-xs mt-0.5 transition-colors ${
                    isActive 
                      ? "text-blue-600" 
                      : "text-gray-500 group-hover:text-gray-600"
                  }`}>
                    {link.description}
                  </p>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full">
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Bottom accent */}
      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Pro Tip</p>
            <p className="text-xs text-gray-600">Complete profile for better recommendations</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
