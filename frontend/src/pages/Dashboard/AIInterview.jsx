

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Mic, MicOff, Video, VideoOff, Camera, Send, Play, Square, RotateCcw, UploadCloud, FileText, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

export default function AIInterviewContent() {
  const { getToken, isSignedIn } = useAuth();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [emotionStats, setEmotionStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  
  // Resume check states
  const [hasResume, setHasResume] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Refs for media streams and recording
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for existing resume when component mounts
  useEffect(() => {
    if (isSignedIn) {
      checkUserResume();
    }
  }, [isSignedIn]);

  // Check if user has uploaded a resume
  const checkUserResume = async () => {
    setIsCheckingResume(true);
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/resumes/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resumes && data.resumes.length > 0) {
          setHasResume(true);
          setResumeData(data.resumes[0]); // Get the most recent resume
        } else {
          setHasResume(false);
        }
      } else {
        setHasResume(false);
      }
    } catch (error) {
      console.error("Error checking resume:", error);
      setHasResume(false);
    } finally {
      setIsCheckingResume(false);
    }
  };

  // Handle file selection for resume upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadError(null);
    }
  };

  // Handle file drop for resume upload
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadError(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Upload resume file
  const handleResumeUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);

    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in.');
      }
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/resumes/upload_resume', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      console.log('Resume upload successful:', result);
      
      setUploadSuccess(true);
      setSelectedFile(null);
      
      // Refresh resume check
      await checkUserResume();
      
      // Hide upload form after successful upload
      setTimeout(() => {
        setShowResumeUpload(false);
      }, 2000);
      
    } catch (err) {
      console.error("Resume upload error:", err);
      setUploadError(err.message || "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Start video stream
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user"
        }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoActive(true);
        setShowVideo(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  }, []);

  // Stop video stream
  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
    setShowVideo(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      alert("Please start video first");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await processVideoRecording(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Process video recording
  const processVideoRecording = async (blob) => {
    try {
      // Convert blob to base64 for processing
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        
        // Process the video for analysis
        const token = await getToken();
        const response = await fetch('http://localhost:8000/api/practice/process_video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            video_data: base64Data,
            session_id: sessionId
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Video processed:", result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error processing video:", error);
    }
  };

  // Start interview session
  const startInterview = async () => {
    if (!isSignedIn) {
      alert("Please sign in to start an interview");
      return;
    }

    if (!hasResume) {
      setShowResumeUpload(true);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      
      // Start the interview
      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "start interview"
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.type === "text") {
          setMessages([{
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
          setIsInterviewActive(true);
          
          // Extract session_id from the response if available
          if (result.session_id) {
            setSessionId(result.session_id);
          } else {
            // Fallback to generating a session ID
            setSessionId(`session_${Date.now()}`);
          }
        } else {
          alert("Error starting interview: " + result.content);
        }
      } else {
        const errorData = await response.json();
        alert("Error starting interview: " + (errorData.detail || "Unknown error"));
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to AI interviewer
  const sendMessage = async () => {
    if (!currentMessage.trim() || !isInterviewActive) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const token = await getToken();
      
      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: currentMessage
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.type === "interview_complete") {
          // Interview ended
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
          setIsInterviewActive(false);
          
          // Save interview results
          if (sessionId) {
            await saveInterviewResults();
          }
          setSessionId(null);
          
          // Get performance metrics
          await getPerformanceMetrics();
        } else if (result.type === "text") {
          // Regular response
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
        }
      } else {
        const errorData = await response.json();
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: "ai",
          content: "Error: " + (errorData.detail || "Failed to get response"),
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: "ai",
        content: "Error: Failed to send message. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get performance metrics
  const getPerformanceMetrics = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/practice/emotion-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmotionStats(result);
        }
      }
    } catch (error) {
      console.error("Error getting performance metrics:", error);
    }
  };

  // Save interview results when interview ends
  const saveInterviewResults = async () => {
    if (!sessionId) return;
    
    try {
      const token = await getToken();
      
      // Calculate performance scores based on available metrics
      const overallScore = calculateOverallScore();
      
      const resultData = {
        session_id: sessionId,
        overall_score: overallScore,
        eye_contact_score: performanceMetrics?.eye_contact_score || 85,
        posture_score: performanceMetrics?.posture_score || 80,
        confidence_score: performanceMetrics?.confidence_score || 85,
        clarity_score: performanceMetrics?.clarity_score || 80,
        technical_knowledge_score: 85, // Default score
        communication_score: 85, // Default score
        ai_feedback: "Interview completed successfully. Performance metrics have been recorded.",
        strengths: [
          "Completed the full interview session",
          "Demonstrated consistent engagement",
          "Maintained professional demeanor"
        ],
        areas_for_improvement: [
          "Consider practicing more STAR method responses",
          "Work on maintaining consistent eye contact",
          "Practice longer, more detailed answers"
        ],
        recommendations: [
          "Review your responses and identify areas for improvement",
          "Practice with mock interviews to build confidence",
          "Focus on specific examples from your experience"
        ]
      };
      
      const response = await fetch('http://localhost:8000/api/practice/save-interview-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(resultData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("Interview results saved successfully");
        } else {
          console.error("Failed to save interview results:", result.error);
        }
      } else {
        console.error("Failed to save interview results:", response.status);
      }
    } catch (error) {
      console.error("Error saving interview results:", error);
    }
  };

  // Calculate overall performance score
  const calculateOverallScore = () => {
    let score = 85; // Base score
    
    // Adjust based on available metrics
    if (performanceMetrics) {
      if (performanceMetrics.eye_contact_score) {
        score = (score + performanceMetrics.eye_contact_score) / 2;
      }
      if (performanceMetrics.posture_score) {
        score = (score + performanceMetrics.posture_score) / 2;
      }
      if (performanceMetrics.confidence_score) {
        score = (score + performanceMetrics.confidence_score) / 2;
      }
      if (performanceMetrics.clarity_score) {
        score = (score + performanceMetrics.posture_score) / 2;
      }
    }
    
    return Math.round(score);
  };

  // End interview
  const endInterview = async () => {
    if (!isInterviewActive) return;

    try {
      const token = await getToken();
      
      const response = await fetch('http://localhost:8000/api/practice/start-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "end interview"
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === "interview_complete") {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "ai",
            content: result.content,
            timestamp: new Date()
          }]);
          setIsInterviewActive(false);
          setSessionId(null);
          await getPerformanceMetrics();
        }
      }
    } catch (error) {
      console.error("Error ending interview:", error);
    }
  };

  // Reset interview
  const resetInterview = () => {
    setMessages([]);
    setIsInterviewActive(false);
    setSessionId(null);
    setEmotionStats(null);
    setPerformanceMetrics(null);
    stopVideo();
  };

  // Handle Enter key in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Resume Upload Form
  const ResumeUploadForm = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="text-center mb-6">
        <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Resume Required</h3>
        <p className="text-gray-600">
          To start an AI interview, you need to upload your resume first. 
          This helps the AI generate personalized questions based on your background.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-gray-500">PDF, DOC, DOCX, or TXT (max 10MB)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />

        {selectedFile && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {selectedFile.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800">{uploadError}</span>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">
                Resume uploaded successfully! You can now start your interview.
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleResumeUpload}
          disabled={!selectedFile || uploading}
          className="w-full mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload Resume"}
        </button>
      </div>
    </div>
  );

  // Loading state
  if (isCheckingResume) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Bot className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Interview Practice</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Practice with AI-powered mock interviews tailored to your industry. 
            Get real-time feedback on your responses, body language, and interview skills.
          </p>
        </div>

        {/* Resume Check Status */}
        {!hasResume && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Resume Required</h3>
                <p className="text-yellow-700 text-sm">
                  You need to upload a resume before starting an AI interview. 
                  This helps the AI generate personalized questions based on your background.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resume Upload Form */}
        {showResumeUpload && <ResumeUploadForm />}

        {/* Resume Status Display */}
        {hasResume && resumeData && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Resume Ready</h3>
                <p className="text-green-700 text-sm">
                  Resume uploaded: {resumeData.filename || "Resume file"} 
                  {resumeData.has_text_content && " • Text extracted successfully"}
                  {resumeData.has_analysis && " • AI analysis completed"}
                </p>
              </div>
              <button
                onClick={() => setShowResumeUpload(true)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Update Resume
              </button>
            </div>
          </div>
        )}

        {/* Video Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Video & Recording</h2>
            <div className="flex gap-2">
              {!isVideoActive ? (
                <button
                  onClick={startVideo}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Start Video
                </button>
              ) : (
                <button
                  onClick={stopVideo}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <VideoOff className="w-4 h-4" />
                  Stop Video
                </button>
              )}
              
              {isVideoActive && !isRecording && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </button>
              )}
              
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </button>
              )}
            </div>
          </div>

          {/* Video Display */}
          {showVideo && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded-lg border border-gray-300"
              />
              {isRecording && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                  REC
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interview Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Interview Session</h2>
            <div className="flex gap-2">
              {!isInterviewActive ? (
                <button
                  onClick={startInterview}
                  disabled={isLoading || !isSignedIn || !hasResume}
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {isLoading ? "Starting..." : "Start Interview"}
                </button>
              ) : (
                <>
                  <button
                    onClick={endInterview}
                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    End Interview
                  </button>
                  <button
                    onClick={resetInterview}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {!hasResume ? 
                  "Upload a resume to start your AI interview practice" :
                  !isInterviewActive ? 
                    "Click 'Start Interview' to begin your practice session" :
                    "Start typing your responses to the AI interviewer"
                }
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {isInterviewActive && (
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
      </button>
    </div>
          )}
        </div>

        {/* Performance Metrics */}
        {emotionStats && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Emotion Detection</h3>
                {emotionStats.emotion_counts && (
                  <div className="space-y-2">
                    {Object.entries(emotionStats.emotion_counts).map(([emotion, count]) => (
                      <div key={emotion} className="flex justify-between">
                        <span className="capitalize">{emotion}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Session Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Detections</span>
                    <span className="font-semibold">{emotionStats.total_detections || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Duration</span>
                    <span className="font-semibold">{sessionId ? "Completed" : "Active"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-semibold mb-2">1. Setup</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Upload your resume (required for personalized questions)</li>
                <li>Start your video camera</li>
                <li>Ensure good lighting and positioning</li>
                <li>Click "Start Interview" to begin</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Practice</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Answer AI questions naturally</li>
                <li>Maintain eye contact with camera</li>
                <li>Use the recording feature for review</li>
                <li>Get AI-powered feedback and tips</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
