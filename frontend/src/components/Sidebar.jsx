import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();

  const goToAIInterview = async () => {
    // Guard: if not signed in, take user to Resume Analyser to upload/sign-in
    if (!isSignedIn) {
      navigate('/dashboard/resume-analyser');
      return;
    }
    try {
      const token = await getToken();
      if (!token) {
        navigate('/dashboard/resume-analyser');
        return;
      }
      // Check if the user has at least one usable resume
      const r = await fetch('http://localhost:8000/api/resumes/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        navigate('/dashboard/resume-analyser');
        return;
      }
      const data = await r.json();
      const resumes = Array.isArray(data?.resumes) ? data.resumes : [];
      const valid = resumes.find(x => x && (x.resume_id || x.id) && (x.has_text_content || x.has_analysis));
      if (valid) {
        navigate('/dashboard/ai-interview');
      } else {
        // No resume yet -> guide to Resume Analyser first
        navigate('/dashboard/resume-analyser');
      }
    } catch (e) {
      navigate('/dashboard/resume-analyser');
    }
  };

  const goToCareerGuidance = async () => {
    // If not signed in, go to Resume Analyser
    if (!isSignedIn) {
      navigate('/dashboard/resume-analyser');
      return;
    }
    try {
      const token = await getToken();
      if (!token) {
        navigate('/dashboard/resume-analyser');
        return;
      }
      const r = await fetch('http://localhost:8000/api/resumes/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      const first = data?.resumes?.[0];
      const id = first?.resume_id ?? first?.id;
      if (id) {
        navigate(`/dashboard/resume-analyser/guidance/${id}`);
      } else {
        navigate('/dashboard/resume-analyser');
      }
    } catch (e) {
      navigate('/dashboard/resume-analyser');
    }
  };

  const navLinks = [
    { 
      name: "Resume Analyser",
      href: "/dashboard/resume-analyser", 
      end: true,
      icon: (
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      ),
      description: "Analyze and improve your resume"
    },
    { 
      name: "AI Interview", 
      href: "/dashboard/ai-interview", 
      action: "ai-interview",
      icon: (
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-violet-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 sm:w-6 sm:h-6 text-violet-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      ),
      description: "Practice with AI interviewer"
    },
    { 
      name: "Interview Review", 
      href: "/dashboard/interview-review", 
      icon: (
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      ),
      description: "Review your performance"
    },
    
    { 
      name: "Career Guidance", 
      href: "/dashboard/resume-analyser/guidance", // used for active styling only
      action: "career-guidance",
      icon: (
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>
      ),
      description: "Open guidance for latest resume"
    },
    { 
      name: "Profile", 
      href: "/dashboard/profile", 
      icon: (
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      ),
      color: "bg-blue-100",
      description: "Manage your profile"
    },
  ];

  const handleNavigation = (e, link) => {
    if (link?.action === 'career-guidance') {
      // Use programmatic navigation to compute latest resume ID
      e.preventDefault();
      goToCareerGuidance();
    }
    if (link?.action === 'ai-interview') {
      // Guard access and route accordingly
      e.preventDefault();
      goToAIInterview();
    }
    if (onNavigate) onNavigate();
  };

  return (
    <aside className="w-full h-full p-3 sm:p-4 flex flex-col relative overflow-hidden bg-white/90 backdrop-blur-sm">
      {/* Navigation */}
      <nav className="flex flex-col gap-2 relative z-10 flex-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            onClick={(e) => handleNavigation(e, link)}
            end={link.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 touch-target ${
                isActive
                  ? "bg-gradient-to-r from-indigo-100 to-violet-100 border border-indigo-200 shadow-sm" 
                  : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 border border-transparent hover:shadow-sm"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Icon with solid background - Responsive sizing */}
                <div className={`w-8 h-8 sm:w-12 sm:h-12 ${link.color || 'bg-gray-100'} rounded-lg flex items-center justify-center shadow-sm`}>
                  {link.icon}
                </div>
                
                {/* Content - Responsive text sizing */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm sm:text-base ${
                    isActive 
                      ? "text-indigo-700" 
                      : "text-gray-700"
                  }`}>
                    {link.name}
                  </h3>
                  <p className={`text-xs sm:text-sm mt-0.5 ${
                    isActive 
                      ? "text-indigo-600" 
                      : "text-gray-500"
                  }`}>
                    {link.description}
                  </p>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full">
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
