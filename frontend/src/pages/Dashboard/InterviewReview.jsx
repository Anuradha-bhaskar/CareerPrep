
import { ClipboardList } from "lucide-react"

export default function InterviewReviewContent() {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <ClipboardList className="w-16 h-16 text-indigo-500 mb-4" />
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Interview Review</h3>
      <p className="text-gray-600 max-w-md">
        Review your past interview performances, get insights, and track your progress over time.
      </p>
      <button className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200">
        View Reviews
      </button>
    </div>
  )
}
