
import { useState, useRef, useEffect } from "react"
import { UploadCloud, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useAuth } from "@clerk/clerk-react"

export default function ResumeAnalyserContent() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [resumes, setResumes] = useState([])
  const [resumesLoading, setResumesLoading] = useState(false)
  const [resumesError, setResumesError] = useState(null)
  const [tipsLoading, setTipsLoading] = useState(false)
  const [tipsError, setTipsError] = useState(null)
  const [activeResumeId, setActiveResumeId] = useState(null)
  const [resumeTips, setResumeTips] = useState(null)
  const [lastUploadedResumeId, setLastUploadedResumeId] = useState(null)
  const [lastUploadedFileName, setLastUploadedFileName] = useState("")
  const fileInputRef = useRef(null)
  const { getToken, isSignedIn } = useAuth()
  
  // Section-specific styles for Tips cards
  const sectionStyles = {
    structure_tips: { bg: 'from-blue-50 to-blue-100 border-blue-200', chip: 'bg-blue-100 text-blue-800' },
    content_improvement_tips: { bg: 'from-emerald-50 to-emerald-100 border-emerald-200', chip: 'bg-emerald-100 text-emerald-800' },
    tech_and_soft_skill_tips: { bg: 'from-indigo-50 to-indigo-100 border-indigo-200', chip: 'bg-indigo-100 text-indigo-800' },
    experience_tips: { bg: 'from-amber-50 to-amber-100 border-amber-200', chip: 'bg-amber-100 text-amber-800' },
    achievement_tips: { bg: 'from-purple-50 to-purple-100 border-purple-200', chip: 'bg-purple-100 text-purple-800' },
    ats_tips: { bg: 'from-pink-50 to-pink-100 border-pink-200', chip: 'bg-pink-100 text-pink-800' },
    modern_tips: { bg: 'from-cyan-50 to-cyan-100 border-cyan-200', chip: 'bg-cyan-100 text-cyan-800' },
    tailoring_tips: { bg: 'from-rose-50 to-rose-100 border-rose-200', chip: 'bg-rose-100 text-rose-800' },
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
      setUploadError(null)
      // Auto-upload on file selection
      handleUpload(file)
    }
  }

  // Fetch the list of resumes
  const fetchResumes = async () => {
    setResumesLoading(true)
    setResumesError(null)
    try {
      const token = await getToken()
      if (!token) return
      const r = await fetch('http://localhost:8000/api/resumes/', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error('Failed to load resumes')
      const data = await r.json()
      const list = Array.isArray(data?.resumes) ? data.resumes : []
      // Ensure newest first
      list.sort((a,b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
      setResumes(list)
      // Restore last uploaded banner and tips from localStorage
      try {
        const storedId = localStorage.getItem('resume:lastId')
        const storedName = localStorage.getItem('resume:lastName')
        const showTipsFor = localStorage.getItem('resume:showTipsFor')
        if (storedId) {
          setLastUploadedResumeId(storedId)
          setLastUploadedFileName(storedName || '')
          setUploadSuccess(true)
          if (showTipsFor && showTipsFor === storedId) {
            // Trigger tips reload
            setResumeTips(null)
            setTipsError(null)
            setActiveResumeId(storedId)
            fetchTips(storedId)
          }
        }
      } catch {}
    } catch (e) {
      console.error('Resume list error:', e)
      setResumesError(e.message)
    } finally {
      setResumesLoading(false)
    }
  }

  useEffect(() => {
    if (isSignedIn) {
      fetchResumes()
    }
  }, [isSignedIn])

  // Fetch tips for a given resume
  const fetchTips = async (resumeId) => {
    setTipsLoading(true)
    setTipsError(null)
    setResumeTips(null)
    setActiveResumeId(resumeId)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const tr = await fetch(`http://localhost:8000/api/resumes/${resumeId}/tips`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!tr.ok) throw new Error('Failed to fetch resume tips')
      const t = await tr.json()
      setResumeTips(t.tips || {})
    } catch (e) {
      setTipsError(e.message)
    } finally {
      setTipsLoading(false)
    }
  }

  // Note: Details/Text/Reprocess endpoints exist but are intentionally not exposed in UI per spec

  const handleDrop = (event) => {
    event.preventDefault()
    if (uploading) return
    const file = event.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
      setUploadError(null)
      // Auto-upload on drop
      handleUpload(file)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault() // Necessary to allow dropping
  }

  const handleUpload = async (fileArg = null) => {
    const fileToUpload = fileArg || selectedFile
    if (!fileToUpload) {
      setUploadError("Please select a file first.")
      return
    }

    setUploading(true)
    setUploadSuccess(false)
    setUploadError(null)
    // Hide any previous tips while a new upload is in progress
    setResumeTips(null)
    setTipsError(null)
    setActiveResumeId(null)
    setLastUploadedFileName(fileToUpload.name || "")

    try {
      // Get the session token from Clerk
      const token = await getToken()
      console.log('Got token:', token ? 'Token received' : 'No token')
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in.')
      }
      
      const formData = new FormData()
      formData.append('file', fileToUpload)

      // Make API call to your FastAPI backend
      const response = await fetch('http://localhost:8000/api/resumes/upload_resume', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await response.json()
      console.log('Upload successful:', result)
      
      setUploadSuccess(true)
      setLastUploadedResumeId(result?.resume_id || null)
      setSelectedFile(null) // Clear selected file after successful upload
      // Refresh resume list (kept even though list UI is removed)
      fetchResumes()
      // Persist last upload so it shows after navigation
      try {
        if (result?.resume_id) {
          localStorage.setItem('resume:lastId', String(result.resume_id))
          localStorage.setItem('resume:lastName', lastUploadedFileName || '')
          // Do not set showTips flag here; only when user clicks Show Tips
          localStorage.removeItem('resume:showTipsFor')
        }
      } catch {}
    } catch (err) {
      console.error("Upload error:", err)
      setUploadError(err.message || "Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-6 pb-8 space-y-6">
      {/* Upload Card */}
      <div className="max-w-3xl mx-auto">
        <div className="p-6 sm:p-8 bg-white/90 backdrop-blur rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100">
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900">Resume Analyser</h3>
          <p className="text-gray-600 mt-1">
            Upload your resume to get AI-powered insights and recommendations to optimize your resume for ATS systems and recruiters.
          </p>
        </div>
      
      
      
      {!isSignedIn && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Please sign in to upload your resume.</p>
        </div>
      )}

      <div
        className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center bg-gradient-to-br transition-colors duration-200 ${uploading ? 'from-gray-50 to-gray-100 border-gray-300 cursor-not-allowed' : 'from-purple-50/80 to-indigo-50/80 hover:from-purple-100/70 hover:to-indigo-100/70 cursor-pointer'} `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => { if (!uploading) fileInputRef.current.click() }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt" // Specify accepted file types
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 mx-auto text-purple-600 mb-3 animate-spin" />
            <p className="text-lg font-semibold text-gray-800 mb-1">Uploading...</p>
            {selectedFile && (
              <p className="text-gray-600 text-sm truncate max-w-[80%]" title={selectedFile.name}>{selectedFile.name}</p>
            )}
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm mx-auto mb-3 grid place-items-center">
              <UploadCloud className="w-7 h-7 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-purple-800 mb-1">Drag & drop your file here</p>
            <p className="text-gray-600 text-sm mb-4">or click to browse</p>
            <button
              onClick={() => fileInputRef.current.click()}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200"
            >
              <UploadCloud className="w-4 h-4" />
              Browse Files
            </button>
          </>
        )}
      </div>

      {/* Separate selected-file status panel removed; progress shown inside dropzone */}

      {/* Success banner removed: analysis progress shown via Tips loader */}

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <XCircle className="w-5 h-5" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && lastUploadedResumeId && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>Resume uploaded successfully{lastUploadedFileName ? `: ${lastUploadedFileName}` : ''}.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!lastUploadedResumeId) return
                setResumeTips(null)
                setTipsError(null)
                setActiveResumeId(lastUploadedResumeId)
                fetchTips(lastUploadedResumeId)
                try { localStorage.setItem('resume:showTipsFor', String(lastUploadedResumeId)) } catch {}
              }}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-green-700"
            >
              Show Tips
            </button>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Resume Tips Card - only show after user requests tips (or when loading/errors) */}
      {(tipsLoading || tipsError || resumeTips) && (
        <div className="p-6 sm:p-8 bg-white/90 backdrop-blur rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-gray-100">
        {/* Resume Tips */}
        <div className="mt-0">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Resume Improvement Tips</h4>
        </div>
        {tipsError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{tipsError}</div>
        )}
        {tipsLoading && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating personalized tips...
          </div>
        )}
        {resumeTips && (
          <div className="grid gap-4 md:grid-cols-2 mt-3">
            {Object.entries(resumeTips).map(([section, entries]) => {
              const styles = sectionStyles[section] || { bg: 'from-gray-50 to-white border-gray-200', chip: 'bg-gray-100 text-gray-800' }
              return (
                <div key={section} className={`border rounded-2xl p-0 bg-gradient-to-br ${styles.bg} shadow-sm`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900 capitalize">
                        {section.replace(/_/g, ' ')}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.chip}`}>Tips</span>
                    </div>
                    <ul className="list-disc ml-5 text-sm text-gray-800 space-y-1">
                      {entries.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {resumeTips && Object.keys(resumeTips).length === 0 && !tipsLoading && !tipsError && (
          <div className="mt-3 text-sm text-gray-600">No tips available yet for this resume.</div>
        )}
        </div>
        </div>
      )}
    </div>
  )
}
