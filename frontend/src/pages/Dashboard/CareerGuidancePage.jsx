import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"
import { 
  ArrowLeft
} from "lucide-react"

export default function CareerGuidancePage() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [careerRecommendations, setCareerRecommendations] = useState([])
  const [selectedCareer, setSelectedCareer] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)

  useEffect(() => {
    const fetchCareerGuidance = async () => {
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Not authenticated')
        }

        // Fetch career recommendations
        const careerResponse = await fetch(
          `http://localhost:8000/api/career-recommendations/generate/${resumeId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        )

        if (!careerResponse.ok) {
          throw new Error('Failed to fetch career recommendations')
        }

        const careerData = await careerResponse.json()
        setCareerRecommendations(careerData.career_recommendations || [])

      } catch (err) {
        console.error('Error fetching career guidance:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    if (resumeId) {
      fetchCareerGuidance()
    }
  }, [resumeId, getToken])

  const fetchRoadmap = async (careerTitle, skillsNeeded) => {
    setRoadmapLoading(true)
    setRoadmap(null) // Clear previous roadmap
    try {
      const token = await getToken()
      if (!token) return

      // Replace forward slashes with dashes to avoid URL path issues
      const encodedCareerTitle = careerTitle.replace(/\//g, '-')
      
      const response = await fetch(
        `http://localhost:8000/api/career-recommendations/roadmap/${encodeURIComponent(encodedCareerTitle)}?skills_needed=${encodeURIComponent(skillsNeeded)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setRoadmap(data.roadmap)
      }
    } catch (err) {
      console.error('Error fetching roadmap:', err)
    } finally {
      setRoadmapLoading(false)
    }
  }

  const handleCareerSelect = (career) => {
    setSelectedCareer(career)
    fetchRoadmap(career.role, career.skills_needed)
  }

  const getMatchColor = (match) => {
    if (match >= 80) return "text-green-600 bg-green-100"
    if (match >= 60) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md">
          {/* Loading Indicator */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analysing Resume
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Our AI is carefully examining your resume to provide personalized career recommendations and insights.
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span>Resume uploaded successfully</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Extracting skills and experience</span>
              </div>
              <div className="flex items-center justify-center gap-2 opacity-50">
                <span>Generating career recommendations</span>
              </div>
            </div>
          </div>
          
          {/* Estimated Time */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-gray-600">This usually takes 30-60 seconds</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md">
          {/* Error Header */}
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl shadow-xl" />
          
          {/* Error Message */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-red-800">Analysis Failed</h3>
            <p className="text-red-600 text-sm leading-relaxed">{error}</p>
          </div>
          
          {/* Action Button */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard/resume-analyser')}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <p className="text-xs text-gray-500">
              Try uploading your resume again or contact support if the issue persists
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Career Guidance & Recommendations</h1>
      </div>

      {/* Career Recommendations */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Recommended Career Paths</h2>
          <p className="text-sm text-gray-600">Discover careers that match your skills and experience</p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {careerRecommendations.map((career, index) => (
            <div
              key={index}
              className={`group border rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                selectedCareer?.role === career.role 
                  ? 'border-purple-500 bg-purple-50 shadow-lg ring-2 ring-purple-200' 
                  : 'border-gray-200 hover:border-purple-300 bg-white'
              }`}
              onClick={() => handleCareerSelect(career)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                  {career.role}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMatchColor(career.match)}`}>
                  {career.match}% Match
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">{career.description}</p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Required Skills</span>
                  <p className="text-gray-700 font-medium">{career.skills_needed}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Growth Potential</span>
                  <p className="text-gray-700 font-medium">{career.growth_potential}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Salary Range</span>
                  <p className="text-gray-700 font-medium">{career.salary_range}</p>
                </div>
              </div>
              
              {selectedCareer?.role === career.role && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <span className="text-purple-600 text-sm font-medium">Click to view detailed roadmap below ↓</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Career Roadmap */}
      {selectedCareer && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Career Roadmap: {selectedCareer.role}</h2>
            <p className="text-sm text-gray-600">Your personalized path to success</p>
          </div>
          
          {roadmapLoading ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">Generating Your Career Roadmap</h3>
                  <p className="text-gray-600">
                    We're creating a personalized roadmap for your journey to become a {selectedCareer.role}...
                  </p>
                  <div className="flex justify-center space-x-2 mt-4">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : roadmap ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <div className="mb-6 p-4 bg-white rounded-lg border border-blue-100">
                <h3 className="font-semibold text-gray-800 mb-2">Overview</h3>
                <p className="text-gray-600 leading-relaxed">{roadmap.overview}</p>
              </div>
              
              <div className="space-y-6">
                {roadmap.steps?.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-gray-800">{step.timeframe}</span>
                        <span className="text-gray-500">—</span>
                        <span className="text-blue-600 font-medium">{step.focus}</span>
                      </div>
                      <ul className="space-y-2">
                        {step.tasks?.map((task, taskIndex) => (
                          <li key={taskIndex} className="flex items-start gap-3 text-gray-700">
                            <span className="leading-relaxed">• {task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              
              {roadmap.additional_resources && (
                <div className="mt-8 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Additional Resources</h4>
                  <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
                    {roadmap.additional_resources.map((resource, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700 bg-white p-2 rounded border border-yellow-100">
                        <span className="text-sm">{resource}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}