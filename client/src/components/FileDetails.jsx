"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Download, FileText, Calendar, Database, AlertTriangle, CheckCircle } from "lucide-react"

const FileDetails = () => {
  const { id } = useParams()
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    const fetchFileDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/files/${id}`)

        if (!response.ok) {
          throw new Error("File not found")
        }

        const data = await response.json()
        setFile(data)

        // Try to get preview if it's an image
        if (isImageFile(data.filename)) {
          try {
            const previewResponse = await fetch(`http://localhost:5000/api/files/${id}/preview`)
            if (previewResponse.ok) {
              const blob = await previewResponse.blob()
              setPreview(URL.createObjectURL(blob))
            }
          } catch (previewError) {
            console.error("Error fetching preview:", previewError)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching file details:", error)
        setError(error.message)
        setIsLoading(false)
      }
    }

    fetchFileDetails()

    // Cleanup function
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [id, preview])

  const handleDownload = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${id}/download`)
      const blob = await response.blob()

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-red-300 mb-2">Error: {error}</h3>
        <Link to="/files" className="text-blue-400 hover:underline">
          Back to Files
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/files" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <h1 className="text-3xl font-bold text-blue-400">File Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <FileIcon fileName={file.filename} size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{file.filename}</h2>
                  <p className="text-gray-400">{getFileTypeLabel(file.filename.split(".").pop().toLowerCase())}</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download size={18} />
                Download
              </button>
            </div>

            {preview ? (
              <div className="border border-gray-700 rounded-lg overflow-hidden mb-6">
                <img
                  src={preview || "/placeholder.svg"}
                  alt={file.filename}
                  className="w-full h-auto max-h-96 object-contain bg-gray-900"
                />
              </div>
            ) : (
              <div className="border border-gray-700 rounded-lg p-8 text-center mb-6">
                <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No preview available for this file type</p>
              </div>
            )}

            {file.analysis && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-300">File Analysis</h3>

                {file.analysis.duplicate_check && (
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      {file.analysis.duplicate_check.is_duplicate ? (
                        <AlertTriangle className="text-yellow-400 mt-1" size={20} />
                      ) : (
                        <CheckCircle className="text-green-400 mt-1" size={20} />
                      )}
                      <div>
                        <h4 className="font-medium text-white">Duplicate Check</h4>
                        <p className="text-gray-300">
                          {file.analysis.duplicate_check.is_duplicate
                            ? "This file is a duplicate of an existing file in the system."
                            : "This file is unique in the system."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {file.analysis.anomaly_check && (
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      {file.analysis.anomaly_check.is_anomaly ? (
                        <AlertTriangle className="text-red-400 mt-1" size={20} />
                      ) : (
                        <CheckCircle className="text-green-400 mt-1" size={20} />
                      )}
                      <div>
                        <h4 className="font-medium text-white">Anomaly Check</h4>
                        <p className="text-gray-300">
                          {file.analysis.anomaly_check.is_anomaly
                            ? "This file was flagged as anomalous."
                            : "No anomalies detected in this file."}
                        </p>
                        {file.analysis.anomaly_check.is_anomaly && file.analysis.anomaly_check.details && (
                          <div className="mt-2">
                            <h5 className="text-sm font-medium text-gray-300">Details:</h5>
                            <ul className="list-disc list-inside text-sm text-gray-400">
                              {Object.entries(file.analysis.anomaly_check.details).map(([key, value]) => (
                                <li key={key}>
                                  {key}: {value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-medium text-blue-300 mb-4">File Information</h3>

            <div className="space-y-4">
              <InfoItem
                icon={<Calendar className="text-gray-400" size={18} />}
                label="Upload Date"
                value={formatDate(file.upload_date)}
              />

              <InfoItem
                icon={<Database className="text-gray-400" size={18} />}
                label="File Size"
                value={formatBytes(file.size || 0)}
              />

              <InfoItem
                icon={<FileText className="text-gray-400" size={18} />}
                label="File Type"
                value={getFileTypeLabel(file.filename.split(".").pop().toLowerCase())}
              />

              <InfoItem
                icon={<FileText className="text-gray-400" size={18} />}
                label="Checksum (SHA-256)"
                value={
                  <div className="relative">
                    <div className="overflow-hidden text-ellipsis">{file.checksum}</div>
                    <button
                      className="absolute right-0 top-0 text-blue-400 hover:text-blue-300 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(file.checksum)
                        alert("Checksum copied to clipboard")
                      }}
                    >
                      Copy
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 pb-3 border-b border-gray-700">
    <div className="p-2 bg-gray-700 rounded-lg">{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <div className="text-white">{value}</div>
    </div>
  </div>
)

const FileIcon = ({ fileName, size = 24 }) => {
  const extension = fileName.split(".").pop().toLowerCase()

  const getIconByExtension = () => {
    switch (extension) {
      case "pdf":
        return <FileText className="text-red-400" size={size} />
      case "doc":
      case "docx":
        return <FileText className="text-blue-400" size={size} />
      case "xls":
      case "xlsx":
        return <FileText className="text-green-400" size={size} />
      case "jpg":
      case "jpeg":
      case "png":
        return <FileText className="text-purple-400" size={size} />
      default:
        return <FileText className="text-gray-400" size={size} />
    }
  }

  return getIconByExtension()
}

const isImageFile = (filename) => {
  const extension = filename.split(".").pop().toLowerCase()
  return ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)
}

const getFileTypeLabel = (extension) => {
  switch (extension) {
    case "pdf":
      return "PDF Document"
    case "doc":
    case "docx":
      return "Word Document"
    case "xls":
    case "xlsx":
      return "Excel Spreadsheet"
    case "jpg":
    case "jpeg":
    case "png":
      return "Image"
    case "zip":
    case "rar":
      return "Archive"
    case "txt":
      return "Text File"
    case "csv":
      return "CSV File"
    default:
      return extension.toUpperCase()
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default FileDetails

