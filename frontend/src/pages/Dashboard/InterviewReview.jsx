import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export default function InterviewReviewContent() {
  const { getToken, isSignedIn } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emotionStats, setEmotionStats] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    questionsAnswered: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (isSignedIn) {
      loadInterviewHistory();
      loadEmotionStats();
    }
  }, [isSignedIn]);

  // Load interview history from backend
  const loadInterviewHistory = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8000/api/practice/interview-history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInterviews(data.interviews || []);
          const totalTime = (data.interviews || []).reduce(
            (sum, item) => sum + (item.duration_minutes || 0),
            0
          );
          const totalQuestions = (data.interviews || []).reduce(
            (sum, item) => sum + (item.questions_answered || 0),
            0
          );
          const avg =
            data.interviews && data.interviews.length > 0
              ? Math.round(
                  data.interviews.reduce(
                    (sum, item) => sum + (item.performance_score || 0),
                    0
                  ) / data.interviews.length
                )
              : 0;

          setStats({
            totalSessions: data.total_count || 0,
            totalTime,
            questionsAnswered: totalQuestions,
            averageScore: avg,
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

  // Load performance-related emotion stats (optional)
  const loadEmotionStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8000/api/practice/emotion_stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmotionStats(data);
        }
      }
    } catch (error) {
      console.error("Error loading emotion stats:", error);
    }
  };

  // Load detailed interview review
  const loadInterviewReview = async (sessionId) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `http://localhost:8000/api/practice/interview-review/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedInterview({
            ...data.session, // InterviewSessionResponse
            messages: data.messages || [],
            result: data.result || null, // InterviewResultResponse
            performanceMetrics: data.performance_metrics || null, // EyeMetric
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
    loadInterviewReview(interview.session_id);
  };

  // Helpers
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPerformanceColor = (score = 0) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 80) return "text-blue-600 bg-blue-100";
    if (score >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getPerformanceLabel = (score = 0) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    return "Needs Improvement";
  };

  const formatDuration = (minutes = 0) => {
    if (!minutes || minutes < 60) return `${minutes || 0}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Prepare progress-over-time data (date vs performance_score)
  const trendData = (interviews || [])
    .map(i => ({ x: new Date(i.start_time), y: Number(i.performance_score || 0), id: i.session_id }))
    .filter(p => !isNaN(p.x.getTime()))
    .sort((a, b) => a.x - b.x);

  // Clean resume name for display: keep only the human filename (e.g., "anand resume.pdf")
  const formatResumeName = (input) => {
    if (!input) return "-";
    let value = String(input);

    // Decode URI components if any
    try { value = decodeURIComponent(value); } catch {}

    // If it's a URL, get the path. Else if contains path separators, take the last segment
    try {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        const u = new URL(value);
        value = u.pathname || value;
      }
    } catch {}
    if (/[\\/]/.test(value)) {
      value = value.split(/[\\/]/).pop();
    }

    // From the end, capture the filename with common doc extensions
    const tailMatch = value.match(/([^\\/]*\.(pdf|docx?|rtf|txt))$/i);
    if (tailMatch) {
      value = tailMatch[1];
    }

    // Remove obvious technical tokens and ID-like prefixes before the actual name
    // Split by spaces/underscores/dashes, preserve the extension
    const extMatch = value.match(/\.(pdf|docx?|rtf|txt)$/i);
    const ext = extMatch ? extMatch[0] : '';
    const base = ext ? value.slice(0, -ext.length) : value;

    const tokens = base.split(/[\s_-]+/).filter(t => t.length);
    const ignore = new Set(['static','upload','uploads','user','users','dev','prod','file','doc','resume','id']);

    const isIdLike = (t) => (
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(t) || // uuid
      /^[A-Fa-f0-9_-]{8,}$/.test(t) ||                          // hash-ish
      /^id[0-9]+$/i.test(t)
    );

    // Find the first token that looks like a real word (not ignored/id-like)
    let startIdx = 0;
    while (startIdx < tokens.length && (ignore.has(tokens[startIdx].toLowerCase()) || isIdLike(tokens[startIdx]))) {
      startIdx++;
    }

    const humanTokens = tokens.slice(startIdx);
    const human = humanTokens.length ? humanTokens.join(' ') : (tokens.join(' ') || value);

    const cleaned = `${human}${ext}`.replace(/\s+/g, ' ').trim();
    return cleaned || '-';
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4" />
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Interview Review & Analytics
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your interview performance, review past sessions, and identify areas for
            improvement.
          </p>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Practice Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalTime)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Questions Answered</p>
              <p className="text-2xl font-bold text-gray-900">{stats.questionsAnswered}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
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
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    onClick={() => handleInterviewSelect(interview)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedInterview?.id === interview.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(interview.start_time)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(
                          interview.performance_score
                        )}`}
                      >
                        {getPerformanceLabel(interview.performance_score)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>{interview.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{interview.questions_answered} Qs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{interview.performance_score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {interviews.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No interviews yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Review (Top summary and performance metrics) */}
          <div className="lg:col-start-2 lg:col-span-2">
            {selectedInterview ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full max-w-none">
                <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-gray-800">Detailed Review</h2>
                    <p className="text-gray-600">{formatDate(selectedInterview.start_time)}</p>
                    {selectedInterview.session_id && (
                      <p className="mt-1 text-xs text-gray-500 break-all">
                        Session ID: <span className="font-mono">{selectedInterview.session_id}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(
                        selectedInterview.performance_score
                      )}`}
                    >
                      {getPerformanceLabel(selectedInterview.performance_score)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedInterview.performance_score}%
                    </p>
                    <button
                      onClick={() => setShowDebug(v => !v)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded"
                    >
                      {showDebug ? 'Hide Debug' : 'Show Debug'}
                    </button>
                  </div>
                </div>

                {showDebug && (
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(selectedInterview, null, 2)}</pre>
                  </div>
                )}

                {/* Performance Metrics */}
                <div className="mb-0">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {selectedInterview.result ? (
                        <>
                          <MetricBar
                            label="Overall"
                            value={selectedInterview.result.overall_score}
                            color="bg-purple-500"
                          />
                          <MetricBar
                            label="Eye Contact"
                            value={selectedInterview.result.eye_contact_score}
                            color="bg-green-500"
                          />
                          <MetricBar
                            label="Posture"
                            value={selectedInterview.result.posture_score}
                            color="bg-blue-500"
                          />
                          <MetricBar
                            label="Confidence"
                            value={selectedInterview.result.confidence_score}
                            color="bg-green-500"
                          />
                          <MetricBar
                            label="Clarity"
                            value={selectedInterview.result.clarity_score}
                            color="bg-green-500"
                          />
                          <MetricBar
                            label="Technical Knowledge"
                            value={selectedInterview.result.technical_knowledge_score}
                            color="bg-indigo-500"
                          />
                          <MetricBar
                            label="Communication"
                            value={selectedInterview.result.communication_score}
                            color="bg-pink-500"
                          />
                        </>
                      ) : selectedInterview.performanceMetrics ? (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <span>Eye contact losses</span>
                              <span className="font-semibold">{selectedInterview.performanceMetrics.loss_eye_contact_count ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Looking away duration</span>
                              <span className="font-semibold">{(selectedInterview.performanceMetrics.looking_away_duration ?? 0).toFixed(1)}s</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Bad posture count</span>
                              <span className="font-semibold">{selectedInterview.performanceMetrics.bad_posture_count ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Bad posture duration</span>
                              <span className="font-semibold">{(selectedInterview.performanceMetrics.bad_posture_duration ?? 0).toFixed(1)}s</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Hand movement duration</span>
                              <span className="font-semibold">{(selectedInterview.performanceMetrics.hand_detection_duration ?? 0).toFixed(1)}s</span>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-gray-500">Raw session metrics shown (no scored result saved for this session).</p>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <p>Performance metrics not available for this session</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Session Duration</div>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedInterview.duration_minutes} minutes
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Questions Answered</div>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedInterview.questions_answered}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Resume Used</div>
                        <p className="text-sm text-gray-900 truncate">
                          {formatResumeName(selectedInterview.resume_used)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Select an Interview</h3>
                  <p className="text-gray-500">
                    Choose an interview from the history to view detailed analysis
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details below that span the two right columns */}
          {selectedInterview && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full max-w-none">
                {/* AI Feedback */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Feedback</h3>
                  {selectedInterview.result ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 w-full max-w-none">
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-2">Overall Assessment:</p>
                        <p className="mb-3">{selectedInterview.result.ai_feedback}</p>

                        {Array.isArray(selectedInterview.result.strengths) && selectedInterview.result.strengths.length > 0 && (
                          <>
                            <p className="font-medium mb-2">Strengths:</p>
                            <ul className="mb-3 list-disc list-inside">
                              {selectedInterview.result.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </>
                        )}

                        {Array.isArray(selectedInterview.result.areas_for_improvement) && selectedInterview.result.areas_for_improvement.length > 0 && (
                          <>
                            <p className="font-medium mb-2">Areas for Improvement:</p>
                            <ul className="mb-3 list-disc list-inside">
                              {selectedInterview.result.areas_for_improvement.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </>
                        )}

                        {Array.isArray(selectedInterview.result.recommendations) && selectedInterview.result.recommendations.length > 0 && (
                          <>
                            <p className="font-medium mb-2">Recommendations:</p>
                            <ul className="list-disc list-inside">
                              {selectedInterview.result.recommendations.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center text-gray-500">
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
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 mb-1">
                                {message.speaker === "ai" ? "Interviewer" : "You"}
                              </p>
                              <p className="text-gray-600">{message.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
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
                        <div className="mb-3">
                          <h4 className="font-medium text-green-800">Strengths</h4>
                        </div>
                        {Array.isArray(selectedInterview.result.strengths) && selectedInterview.result.strengths.length > 0 ? (
                          <ul className="text-sm text-green-700 space-y-1">
                            {selectedInterview.result.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-green-600">No specific strengths identified</p>
                        )}
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="mb-3">
                          <h4 className="font-medium text-yellow-800">Areas to Improve</h4>
                        </div>
                        {Array.isArray(selectedInterview.result.areas_for_improvement) && selectedInterview.result.areas_for_improvement.length > 0 ? (
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {selectedInterview.result.areas_for_improvement.map((a, i) => (
                              <li key={i}>• {a}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-yellow-600">No specific areas identified</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center text-gray-500">
                      <p>Improvement suggestions not available for this session</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value = 0, color = "bg-green-500" }) {
  const pct = Math.round(value || 0);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Inline SVG Line Chart for progress
function ProgressChart({ data = [], width = 800, height = 220, padding = 40 }) {
  // Guard
  if (!Array.isArray(data) || data.length === 0) return null;

  const w = width;
  const h = height;
  const padL = padding + 10; // room for y labels
  const padR = padding;
  const padT = padding;
  const padB = padding + 10; // room for x labels

  const xs = data.map(d => d.x.getTime());
  const ys = data.map(d => Math.max(0, Math.min(100, d.y)));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = 100;

  const xScale = (t) => {
    if (maxX === minX) return padL;
    return padL + ((t - minX) / (maxX - minX)) * (w - padL - padR);
  };
  const yScale = (v) => {
    return padT + (1 - (v - minY) / (maxY - minY)) * (h - padT - padB);
  };

  const points = data.map(d => `${xScale(d.x.getTime())},${yScale(d.y)}`).join(" ");

  // Axes and grid ticks
  const yTicks = [0, 25, 50, 75, 100];
  const xLabels = (() => {
    // Up to 6 evenly spaced labels
    const count = Math.min(6, data.length);
    const idxs = Array.from({ length: count }, (_, i) => Math.round(i * (data.length - 1) / (count - 1 || 1)));
    const used = new Set();
    return idxs.map(i => {
      if (used.has(i)) return null;
      used.add(i);
      return { x: xScale(data[i].x.getTime()), text: data[i].x.toLocaleDateString() };
    }).filter(Boolean);
  })();

  return (
    <svg width={w} height={h} className="block">
      {/* Y grid and labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={yScale(t)} y2={yScale(t)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padL - 8} y={yScale(t) + 4} fontSize="10" textAnchor="end" fill="#6b7280">{t}%</text>
        </g>
      ))}

      {/* X axis */}
      <line x1={padL} x2={w - padR} y1={h - padB} y2={h - padB} stroke="#9ca3af" strokeWidth="1" />
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={h - padB + 14} fontSize="10" textAnchor="middle" fill="#6b7280">{l.text}</text>
      ))}

      {/* Line path */}
      <polyline fill="none" stroke="#7c3aed" strokeWidth="2" points={points} />

      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xScale(d.x.getTime())} cy={yScale(d.y)} r={3} fill="#7c3aed" />
        </g>
      ))}
    </svg>
  );
}

// Simple User icon component
function User({ className }) { return null }