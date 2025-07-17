

import { Bot } from "lucide-react"

export default function AIInterviewContent() {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[600px]">
      <Bot className="w-16 h-16 text-pink-500 mb-4" />
      <h3 className="text-2xl font-bold text-gray-800 mb-2">AI Interview Practice</h3>
      <p className="text-gray-600 max-w-md">
        Practice with AI-powered mock interviews tailored to your industry and receive detailed feedback.
      </p>
      <button className="mt-6 bg-pink-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-pink-700 transition-colors duration-200">
        Start Practice
      </button>
    </div>
  )
}
