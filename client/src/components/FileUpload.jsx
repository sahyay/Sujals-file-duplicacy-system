"use client"

import { useState, useRef } from "react"
import { Upload, X, AlertTriangle, CheckCircle, FileText } from "lucide-react"
import { useNotification } from "../context/NotificationContext"

const FileUpload = () => {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const { addNotification } = useNotification()

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
      setUploadResult(null)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          setIsUploading(false)

          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            setUploadResult({ success: true, message: response.message })
            addNotification({
              type: "success",
              message: "File uploaded successfully",
              duration: 5000,
            })
          } else if (xhr.status === 400) {
            try {
              const response = JSON.parse(xhr.responseText)

              if (response.error === "Duplicate file detected!") {
                setUploadResult({
                  success: false,
                  type: "duplicate",
                  message: "Duplicate file detected!",
                  existingFile: response.existing_file,
                  similarity: response.similarity || 0,
                })

                addNotification({
                  type: "warning",
                  message: "Duplicate file detected",
                  duration: 5000,
                })
              } else if (response.error === "Anomaly detected!") {
                setUploadResult({
                  success: false,
                  type: "anomaly",
                  message: "Anomaly detected in file upload!",
                  details: response.details,
                })

                addNotification({
                  type: "error",
                  message: "Anomaly detected in file upload",
                  duration: 5000,
                })
              } else {
                setUploadResult({ success: false, message: response.error })

                addNotification({
                  type: "error",
                  message: response.error,
                  duration: 5000,
                })
              }
            } catch (e) {
              setUploadResult({ success: false, message: "Error processing server response" })
            }
          } else {
            setUploadResult({ success: false, message: "Server error occurred" })

            addNotification({
              type: "error",
              message: "Server error occurred",
              duration: 5000,
            })
          }
        }
      }

      xhr.open("POST", "http://localhost:5000/api/upload", true)
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading file:", error)
      setIsUploading(false)
      setUploadResult({ success: false, message: "Error uploading file" })

      addNotification({
        type: "error",
        message: "Error uploading file",
        duration: 5000,
      })
    }
  }

  const resetUpload = () => {
    setFile(null)
    setUploadResult(null)
    setUploadProgress(0)
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">Secure File Upload</h1>

      <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-600 hover:border-blue-400 hover:bg-gray-700/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv,.zip,.rar"
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-200 mb-2">Drag and drop your file here</h3>
            <p className="text-gray-400 mb-4">or click to browse</p>
            <p className="text-sm text-gray-500">Supports PDF, Word, Excel, Images, Text, CSV, and Archive files</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-600 rounded-lg">
                  <FileIcon fileName={file.name} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{file.name}</h3>
                  <p className="text-sm text-gray-400">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {isUploading ? (
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            ) : uploadResult ? (
              <div
                className={`p-4 rounded-lg ${
                  uploadResult.success
                    ? "bg-green-900/30"
                    : uploadResult.type === "duplicate"
                      ? "bg-yellow-900/30"
                      : "bg-red-900/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {uploadResult.success ? (
                    <CheckCircle className="text-green-400 mt-1" size={20} />
                  ) : uploadResult.type === "duplicate" ? (
                    <AlertTriangle className="text-yellow-400 mt-1" size={20} />
                  ) : (
                    <AlertTriangle className="text-red-400 mt-1" size={20} />
                  )}
                  <div>
                    <h3
                      className={`font-medium ${
                        uploadResult.success
                          ? "text-green-300"
                          : uploadResult.type === "duplicate"
                            ? "text-yellow-300"
                            : "text-red-300"
                      }`}
                    >
                      {uploadResult.message}
                    </h3>

                    {uploadResult.type === "duplicate" && uploadResult.existingFile && (
                      <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Existing File Details:</h4>
                        <p className="text-sm text-gray-300">Filename: {uploadResult.existingFile.filename}</p>
                        <p className="text-sm text-gray-300">
                          Upload Date: {new Date(uploadResult.existingFile.upload_date).toLocaleString()}
                        </p>
                        <div className="mt-3">
                          <h4 className="font-medium text-white mb-1">Content Similarity:</h4>
                          <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{ width: `${uploadResult.similarity * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-right text-sm text-gray-400 mt-1">
                            {Math.round(uploadResult.similarity * 100)}% match
                          </p>
                        </div>
                      </div>
                    )}

                    {uploadResult.type === "anomaly" && uploadResult.details && (
                      <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Anomaly Details:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                          {Object.entries(uploadResult.details).map(([key, value]) => (
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
            ) : (
              <button
                onClick={handleUpload}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Upload size={18} />
                Upload File
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const FileIcon = ({ fileName }) => {
  const extension = fileName.split(".").pop().toLowerCase()

  const getIconByExtension = () => {
    switch (extension) {
      case "pdf":
        return <FileText className="text-red-400" size={24} />
      case "doc":
      case "docx":
        return <FileText className="text-blue-400" size={24} />
      case "xls":
      case "xlsx":
        return <FileText className="text-green-400" size={24} />
      case "jpg":
      case "jpeg":
      case "png":
        return <FileText className="text-purple-400" size={24} />
      default:
        return <FileText className="text-gray-400" size={24} />
    }
  }

  return getIconByExtension()
}

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default FileUpload

