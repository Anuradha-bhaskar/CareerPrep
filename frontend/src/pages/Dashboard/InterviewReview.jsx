
import { useState, useEffect } from "react";
import { Clock, Calendar, MessageSquare, TrendingUp, Eye, Users, BarChart3, CheckCircle, AlertCircle, Target, Award, Lightbulb, FileText, Play, Pause, Square } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

export default function InterviewReviewContent() {
  const { getToken, isSignedIn } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    questionsAnswered: 0,
    averageScore: 0
  });

  useEffect(() => {
    if (isSignedIn) {
      loadInterviewHistory();
      loadPerformanceStats();
    }
  }, [isSignedIn]);

  // Load interview history from backend
  const loadInterviewHistory = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/practice/interview-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInterviews(data.interviews);
          setStats({
            totalSessions: data.total_count,
            totalTime: data.interviews.reduce((sum, interview) => sum + (interview.duration_minutes || 0), 0),
            questionsAnswered: data.interviews.reduce((sum, interview) => sum + (interview.questions_answered || 0), 0),
            averageScore: data.interviews.length > 0 ? 
              Math.round(data.interviews.reduce((sum, interview) => sum + (interview.performance_score || 0), 0) / data.interviews.length) : 0
          });
        } else {
          console.error("Error loading interview history:", data.error);
          setInterviews([]);
        }
      } else {
        console.error("Failed to load interview history:", response.status);
        setInterviews([]);
      }
    } catch (error) {
      console.error("Error loading interview history:", error);
      setInterviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load performance statistics
  const loadPerformanceStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/practice/emotion-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPerformanceData(data);
        }
      }
    } catch (error) {
      console.error("Error loading performance stats:", error);
    }
  };

  // Load detailed interview review
  const loadInterviewReview = async (sessionId) => {
    try {
      const token = await getToken();
      const response = await fetch(`http://localhost:8000/api/practice/interview-review/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the selected interview with detailed data
          setSelectedInterview({
            ...data.session,
            messages: data.messages,
            result: data.result,
            performanceMetrics: data.performance_metrics
          });
        } else {
          console.error("Error loading interview review:", data.error);
        }
      } else {
        console.error("Failed to load interview review:", response.status);
      }
    } catch (error) {
      console.error("Error loading interview review:", error);
    }
  };

  // Handle interview selection
  const handleInterviewSelect = (interview) => {
    setSelectedInterview(interview);
    // Load detailed review data
    loadInterviewReview(interview.session_id);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get performance color based on score
  const getPerformanceColor = (score) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 80) return "text-blue-600 bg-blue-100";
    if (score >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  // Get performance label
  const getPerformanceLabel = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    return "Needs Improvement";
  };

  // Format duration in minutes
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Review & Analytics</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your interview performance, review past sessions, and identify areas for improvement.
          </p>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Practice Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalTime)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Questions Answered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.questionsAnswered}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interview History */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Interview History</h2>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    onClick={() => handleInterviewSelect(interview)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedInterview?.id === interview.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(interview.date)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(interview.performance_score)}`}>
                        {getPerformanceLabel(interview.performance_score)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{interview.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{interview.questions_answered} Qs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{interview.performance_score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Review */}
          <div className="lg:col-span-2">
            {selectedInterview ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Detailed Review</h2>
                    <p className="text-gray-600">{formatDate(selectedInterview.date)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(selectedInterview.performance_score)}`}>
                      {getPerformanceLabel(selectedInterview.performance_score)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{selectedInterview.performance_score}%</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {selectedInterview.result ? (
                        <>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Eye Contact</span>
                              <span className="font-medium">{Math.round(selectedInterview.result.eye_contact_score)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${selectedInterview.result.eye_contact_score}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Posture</span>
                              <span className="font-medium">{Math.round(selectedInterview.result.posture_score)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selectedInterview.result.posture_score}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Confidence</span>
                              <span className="font-medium">{Math.round(selectedInterview.result.confidence_score)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${selectedInterview.result.confidence_score}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Clarity</span>
                              <span className="font-medium">{Math.round(selectedInterview.result.clarity_score)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${selectedInterview.result.clarity_score}%` }}></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>Performance metrics not available for this session</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-800">Session Duration</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{selectedInterview.duration_minutes} minutes</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-800">Questions Answered</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{selectedInterview.questions_answered}</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-800">Resume Used</span>
                        </div>
                        <p className="text-sm text-gray-900 truncate">{selectedInterview.resume_used}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Feedback</h3>
                  {selectedInterview.result ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-2">Overall Assessment:</p>
                          <p className="mb-3">{selectedInterview.result.ai_feedback}</p>
                          
                          {selectedInterview.result.strengths && selectedInterview.result.strengths.length > 0 && (
                            <>
                              <p className="font-medium mb-2">Strengths:</p>
                              <ul className="mb-3 list-disc list-inside">
                                {selectedInterview.result.strengths.map((strength, index) => (
                                  <li key={index}>{strength}</li>
                                ))}
                              </ul>
                            </>
                          )}
                          
                          {selectedInterview.result.areas_for_improvement && selectedInterview.result.areas_for_improvement.length > 0 && (
                            <>
                              <p className="font-medium mb-2">Areas for Improvement:</p>
                              <ul className="mb-3 list-disc list-inside">
                                {selectedInterview.result.areas_for_improvement.map((area, index) => (
                                  <li key={index}>{area}</li>
                                ))}
                              </ul>
                            </>
                          )}
                          
                          {selectedInterview.result.recommendations && selectedInterview.result.recommendations.length > 0 && (
                            <>
                              <p className="font-medium mb-2">Recommendations:</p>
                              <ul className="list-disc list-inside">
                                {selectedInterview.result.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center text-gray-500">
                      <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>AI feedback not available for this session</p>
                    </div>
                  )}
                </div>

                {/* Interview Transcript */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Interview Transcript</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {selectedInterview.messages && selectedInterview.messages.length > 0 ? (
                      <div className="space-y-3 text-sm">
                        {selectedInterview.messages.map((message, index) => (
                          <div key={index} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.speaker === 'ai' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {message.speaker === 'ai' ? (
                                <Users className="w-4 h-4 text-purple-600" />
                              ) : (
                                <User className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 mb-1">
                                {message.speaker === 'ai' ? 'Interviewer' : 'You'}
                              </p>
                              <p className="text-gray-600">{message.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No transcript available for this session</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Improvement Suggestions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Improvement Suggestions</h3>
                  {selectedInterview.result ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h4 className="font-medium text-green-800">Strengths</h4>
                        </div>
                        {selectedInterview.result.strengths && selectedInterview.result.strengths.length > 0 ? (
                          <ul className="text-sm text-green-700 space-y-1">
                            {selectedInterview.result.strengths.map((strength, index) => (
                              <li key={index}>• {strength}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-green-600">No specific strengths identified</p>
                        )}
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <h4 className="font-medium text-yellow-800">Areas to Improve</h4>
                        </div>
                        {selectedInterview.result.areas_for_improvement && selectedInterview.result.areas_for_improvement.length > 0 ? (
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {selectedInterview.result.areas_for_improvement.map((area, index) => (
                              <li key={index}>• {area}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-yellow-600">No specific areas identified</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center text-gray-500">
                      <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Improvement suggestions not available for this session</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Select an Interview</h3>
                  <p className="text-gray-500">Choose an interview from the history to view detailed analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Over Time Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Progress Over Time</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Performance trend chart will be displayed here</p>
              <p className="text-xs text-gray-400">Showing score progression across sessions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple User icon component
function User({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}
