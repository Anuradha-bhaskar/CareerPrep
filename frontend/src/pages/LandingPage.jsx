import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate("/dashboard");
    }
  }, [isSignedIn, navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-60"></div>
      <div className="absolute top-80 right-40 w-24 h-24 bg-pink-200 rounded-full opacity-60"></div>
      <div className="absolute bottom-40 left-60 w-20 h-20 bg-coral-200 rounded-full opacity-60"></div>

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 relative z-10">
        <div className="flex items-center space-x-8">
          <div className="text-3xl font-bold text-gray-800">CareerPrep</div>
          <div className="hidden md:flex space-x-6 ">
            <a
              href="#"
              className="text-gray-600 hover:text-indigo-700 transition-colors text-xl"
            >
              Home
            </a>
            <a
              href="#features"
              className="text-gray-600 hover:text-indigo-700 transition-colors text-xl"
            >
              Features
            </a>
            <a
              href="#tools"
              className="text-gray-600 hover:text-indigo-700 transition-colors text-xl"
            >
              Tools
            </a>
            <a
              href="#success-stories"
              className="text-gray-600 hover:text-indigo-700 transition-colors text-xl"
            >
              Contact
            </a>
          </div>
        </div>
        <div className="flex space-x-3">
          <a href="/sign-in">
            <button className="px-4 py-2 text-indigo-700 border border-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-xl">
              Login
            </button>
          </a>
          <a href="/sign-up">
            <button className="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors text-xl">
              Sign Up
            </button>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-between px-8 py-12 max-w-7xl mx-auto relative z-10">
        {/* Left Content */}
        <div className="flex-1 max-w-lg">
          <h1 className="text-5xl font-bold text-gray-800 mb-8 leading-tight">
            Empower Your Future
            <br />
            <span className="text-indigo-700">With Confidence.</span>
          </h1>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-indigo-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">
                Real-time Interview Prep
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-violet-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">
                Personalized Guidance
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-purple-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">Career Clarity</span>
            </div>
          </div>

          <a href="/sign-up">
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              🚀 Get Started — Sign Up First
            </button>
          </a>
        </div>

        {/* Right Content - Platform Mockup */}
        <div className="flex-1 flex justify-center">
          <div className="relative">
            {/* Laptop Frame */}
            <div className="bg-gray-800 rounded-t-2xl p-4 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="bg-gray-900 rounded-lg p-6 w-96 h-64">
                {/* Mock Interface */}
                <div className="text-white mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm">Welcome!</span>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-indigo-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded"></div>
                      <span className="text-sm font-medium">
                        Upload Your Resume
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200 mb-3">
                      Get AI-powered insights to boost your career prospects
                      with tailored advice and optimization.
                    </p>
                    <button className="bg-indigo-500 text-white px-3 py-1 rounded text-xs">
                      Drop files or click to upload
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-violet-900 rounded-lg p-3">
                      <div className="w-4 h-4 bg-violet-500 rounded mb-2"></div>
                      <p className="text-xs font-medium mb-1">
                        Career Path Guidance
                      </p>
                      <p className="text-xs text-violet-200">
                        Explore your interests and get comprehensive career path
                        recommendations based on your skills.
                      </p>
                      <button className="bg-violet-500 text-white px-2 py-1 rounded text-xs mt-2">
                        Start Exploring
                      </button>
                    </div>

                    <div className="bg-purple-900 rounded-lg p-3">
                      <div className="w-4 h-4 bg-purple-500 rounded mb-2"></div>
                      <p className="text-xs font-medium mb-1">
                        Interview Preparation
                      </p>
                      <p className="text-xs text-purple-200">
                        Practice with AI-powered mock interviews tailored to
                        your target role.
                      </p>
                      <button className="bg-purple-500 text-white px-2 py-1 rounded text-xs mt-2">
                        Start Practicing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Laptop Base */}
            <div className="bg-gray-700 h-4 rounded-b-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300"></div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <section
        id="features"
        className="py-20 px-8 max-w-7xl mx-auto relative z-10"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Key Features
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful tools designed to accelerate your career growth and help
            you land your dream job
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Resume Analyzer */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-indigo-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Resume Analyzer
            </h3>
            <p className="text-gray-600">
              Get AI-powered insights and recommendations to optimize your
              resume for ATS systems and recruiters.
            </p>
          </div>

          {/* Interview Practice */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-violet-700"
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Interview Practice
            </h3>
            <p className="text-gray-600">
              Practice with AI-powered mock interviews tailored to your industry
              and receive detailed feedback.
            </p>
          </div>

          {/* Career Roadmap */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-700"
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Career Roadmap
            </h3>
            <p className="text-gray-600">
              Get personalized career path recommendations based on your skills,
              interests, and market trends.
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-emerald-700"
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Progress Tracker
            </h3>
            <p className="text-gray-600">
              Monitor your job search progress, track applications, and
              celebrate your career milestones.
            </p>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Powerful Tools
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to succeed in your job search, all in one
              platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Skill Assessment */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Skill Assessment
              </h3>
              <p className="text-gray-600">
                Analyze your current skill set across technical and soft skills.
                Our AI evaluates your uploaded resume and interactive responses
                to identify core strengths and potential gaps, helping you focus
                on what matters most.
              </p>
            </div>

            {/* Job Matching */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Job Matching
              </h3>
              <p className="text-gray-600">
                Get personalized job recommendations based on your resume,
                interests, and skill profile. We match your career goals with
                real-world roles, helping you focus on jobs where you're most
                likely to thrive.
              </p>
            </div>

            {/* Network Builder */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Network Builder
              </h3>
              <p className="text-gray-600">
                Build your professional network intelligently. CareerPrep
                suggests relevant professionals and communities you should
                connect with, based on your interests and domain, helping you
                grow your career connections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Contact Us</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you! Reach out
            using the form below.
          </p>
        </div>

        <form className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Your Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Your Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="message"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <textarea
              id="message"
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Write your message..."
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
          >
            Send Message
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">CareerConquer</div>
              <p className="text-gray-400 mb-6">
                Empowering professionals to conquer their career journey with
                AI-powered tools and personalized guidance.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Resume Analyzer
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Interview Practice
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Career Roadmap
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Progress Tracker
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tools</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Skill Assessment
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Job Matching
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Network Builder
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CareerConquer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
