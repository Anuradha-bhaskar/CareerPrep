import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"
import { 
  ArrowLeft, 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  Target, 
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronUp
} from "lucide-react"

export default function CareerGuidancePage() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [careerRecommendations, setCareerRecommendations] = useState([])
  const [resumeTips, setResumeTips] = useState(null)
  const [selectedCareer, setSelectedCareer] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [expandedTipsSections, setExpandedTipsSections] = useState({})

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

        // Fetch resume tips
        const tipsResponse = await fetch(
          `http://localhost:8000/api/resumes/${resumeId}/tips`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        )

        if (!tipsResponse.ok) {
          throw new Error('Failed to fetch resume tips')
        }

        const tipsData = await tipsResponse.json()
        setResumeTips(tipsData.tips || {})

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

  const toggleTipsSection = (section) => {
    setExpandedTipsSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
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
          {/* Animated Logo/Icon */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            {/* Spinning Ring */}
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
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Resume uploaded successfully</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Extracting skills and experience</span>
              </div>
              <div className="flex items-center justify-center gap-2 opacity-50">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Generating career recommendations</span>
              </div>
            </div>
          </div>
          
          {/* Estimated Time */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-gray-600">
              <Clock className="w-3 h-3 inline mr-1" />
              This usually takes 30-60 seconds
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
            <Target className="w-10 h-10 text-white" />
          </div>
          
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/resume-analyser')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-6 w-px bg-gray-300"></div>
        <h1 className="text-2xl font-bold text-gray-800">Career Guidance & Recommendations</h1>
      </div>

      {/* Career Recommendations */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Briefcase className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Recommended Career Paths</h2>
            <p className="text-sm text-gray-600">Discover careers that match your skills and experience</p>
          </div>
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
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <Target className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Required Skills</span>
                    <p className="text-gray-700 font-medium">{career.skills_needed}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Growth Potential</span>
                    <p className="text-gray-700 font-medium">{career.growth_potential}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-yellow-100 rounded">
                    <DollarSign className="w-3 h-3 text-yellow-600" />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Salary Range</span>
                    <p className="text-gray-700 font-medium">{career.salary_range}</p>
                  </div>
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Career Roadmap: {selectedCareer.role}</h2>
              <p className="text-sm text-gray-600">Your personalized path to success</p>
            </div>
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
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{step.timeframe}</span>
                        <span className="text-gray-500">—</span>
                        <span className="text-blue-600 font-medium">{step.focus}</span>
                      </div>
                      <ul className="space-y-2">
                        {step.tasks?.map((task, taskIndex) => (
                          <li key={taskIndex} className="flex items-start gap-3 text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                            <span className="leading-relaxed">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              
              {roadmap.additional_resources && (
                <div className="mt-8 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Additional Resources
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
                    {roadmap.additional_resources.map((resource, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700 bg-white p-2 rounded border border-yellow-100">
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
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

      {/* Resume Tips */}
      {resumeTips && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Resume Improvement Tips</h2>
              <p className="text-sm text-gray-600">Enhance your resume to stand out</p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Object.entries(resumeTips).map(([section, tips]) => (
              <div key={section} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleTipsSection(section)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {section.replace(/_/g, ' ')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {tips.length} tips
                    </span>
                    {expandedTipsSections[section] ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>
                
                {expandedTipsSections[section] && (
                  <div className="p-4 pt-0 bg-gray-50">
                    <ul className="space-y-3">
                      {tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-700 bg-white p-3 rounded-lg border border-gray-100">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                          <span className="leading-relaxed text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}