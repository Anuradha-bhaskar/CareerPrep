import { UserButton } from "@clerk/clerk-react";


export default function Dashboard() {
    
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-6 space-y-6">
        <div className="text-xl font-bold">CareerPrep</div>
        <nav className="flex flex-col gap-4">
          <a href="#resume" className="hover:text-indigo-400">Resume Analyser</a>
          <a href="#ai-interview" className="hover:text-indigo-400">AI Interview</a>
          <a href="#interview-review" className="hover:text-indigo-400">Interview Review</a>
          <a href="#profile" className="hover:text-indigo-400">Profile</a>
        </nav>
        <div className="mt-auto"><UserButton /></div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-semibold mb-4">Welcome to CareerPrep Dashboard</h1>
        {/* Each tool section can be its own component */}
      </main>
    </div>
  );
}
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function DashboardPage() {
  return (
    <>
      <SignedIn>
<div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-6 space-y-6">
        <div className="text-xl font-bold">CareerPrep</div>
        <nav className="flex flex-col gap-4">
          <a href="#resume" className="hover:text-indigo-400">Resume Analyser</a>
          <a href="#ai-interview" className="hover:text-indigo-400">AI Interview</a>
          <a href="#interview-review" className="hover:text-indigo-400">Interview Review</a>
          <a href="#profile" className="hover:text-indigo-400">Profile</a>
        </nav>
        <div className="mt-auto"><UserButton /></div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-semibold mb-4">Welcome to CareerPrep Dashboard</h1>
        {/* Each tool section can be its own component */}
      </main>
    </div>      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
