import { Briefcase, Bot, ClipboardList, User } from "lucide-react";
import { useState } from "react";

export default function Sidebar({ activeLink, setActiveLink }) {
  const navLinks = [
    { name: "Resume Analyser", href: "/dashboard/resume-analyser", icon: Briefcase },
    { name: "AI Interview", href: "/dashboard/ai-interview", icon: Bot },
    { name: "Interview Review", href: "/dashboard/interview-review", icon: ClipboardList },
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  return (
<aside className="bg-white rounded-2xl shadow-lg p-2 w-full md:w-58 h-[calc(90h-3rem)]  mb-6 md:mb-0 md:mr-6 flex flex-col ">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Dashboard</h2>
      <nav className="flex flex-col gap-2">
        {navLinks.map((link) => (
          <button
            key={link.href}
            onClick={() => setActiveLink(link.href)}
            className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeLink === link.href
                ? "text-indigo-600 font-semibold" // Only text color, no bg
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <link.icon className="w-5 h-5" />
            {link.name}
          </button>
        ))}
      </nav>
    </aside>
  );
}
