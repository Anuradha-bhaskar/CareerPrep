
import { useState, useRef } from "react"
import { UploadCloud, FileText, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@clerk/clerk-react"

export default function ResumeAnalyserContent() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)
  const { getToken, isSignedIn } = useAuth()

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
      setUploadError(null)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
      setUploadError(null)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault() // Necessary to allow dropping
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.")
      return
    }

    setUploading(true)
    setUploadSuccess(false)
    setUploadError(null)

    try {
      // Get the session token from Clerk
      const token = await getToken()
      console.log('Got token:', token ? 'Token received' : 'No token')
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in.')
      }
      
      const formData = new FormData()
      formData.append('file', selectedFile)

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
      setSelectedFile(null) // Clear selected file after successful upload
    } catch (err) {
      console.error("Upload error:", err)
      setUploadError(err.message || "Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Resume Analyser</h3>
      <p className="text-gray-600 mb-6">
        Upload your resume to get AI-powered insights and recommendations to optimize your resume for ATS systems and recruiters.
      </p>
      
      {!isSignedIn && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Please sign in to upload your resume.</p>
        </div>
      )}

      <div
        className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center bg-purple-50/50 hover:bg-purple-100/50 transition-colors duration-200 cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt" // Specify accepted file types
        />
        <UploadCloud className="w-12 h-12 mx-auto text-purple-600 mb-4" />
        <p className="text-lg font-semibold text-purple-800 mb-2">Drag & Drop your file here</p>
        <p className="text-gray-600 text-sm mb-4">or click to upload</p>
        <button
          onClick={() => fileInputRef.current.click()}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200"
        >
          Browse Files
        </button>
      </div>

      {selectedFile && (
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-indigo-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>{selectedFile.name}</span>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-indigo-600 text-white px-4 py-1 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          <span>File uploaded successfully!</span>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <XCircle className="w-5 h-5" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="mt-8">
        <h4 className="text-xl font-semibold text-gray-800 mb-3">Recent Analyses</h4>
        <p className="text-gray-500 text-sm">No recent analyses found.</p>
      </div>
    </div>
  )
}
