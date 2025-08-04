"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Search, FileText, Download, Calendar, Filter, SortAsc, SortDesc } from "lucide-react"
import { useNotification } from "../context/NotificationContext"

const FileList = () => {
  const [files, setFiles] = useState([])
  const [filteredFiles, setFilteredFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "upload_date", direction: "desc" })
  const [filterType, setFilterType] = useState("all")
  const { notifications } = useNotification()

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/files")
        const data = await response.json()
        setFiles(data)
        setFilteredFiles(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching files:", error)
        setIsLoading(false)
      }
    }

    fetchFiles()
  }, [notifications])

  useEffect(() => {
    let result = [...files]

    // Apply file type filter
    if (filterType !== "all") {
      result = result.filter((file) => {
        const extension = file.filename.split(".").pop().toLowerCase()
        return getFileCategory(extension) === filterType
      })
    }

    // Apply search filter
    if (searchTerm) {
      result = result.filter((file) => file.filename.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortConfig.key === "upload_date") {
        return sortConfig.direction === "asc"
          ? new Date(a.upload_date) - new Date(b.upload_date)
          : new Date(b.upload_date) - new Date(a.upload_date)
      } else if (sortConfig.key === "filename") {
        return sortConfig.direction === "asc"
          ? a.filename.localeCompare(b.filename)
          : b.filename.localeCompare(a.filename)
      } else if (sortConfig.key === "size") {
        return sortConfig.direction === "asc" ? a.size - b.size : b.size - a.size
      }
      return 0
    })

    setFilteredFiles(result)
  }, [files, searchTerm, sortConfig, filterType])

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${fileId}/download`)
      const blob = await response.blob()

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-blue-400">File Repository</h1>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search files by name..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none bg-gray-700 border border-gray-600 text-white py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="document">Documents</option>
                <option value="image">Images</option>
                <option value="spreadsheet">Spreadsheets</option>
                <option value="archive">Archives</option>
                <option value="other">Other</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {filteredFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-white" onClick={() => handleSort("filename")}>
                      File Name
                      {sortConfig.key === "filename" &&
                        (sortConfig.direction === "asc" ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-white" onClick={() => handleSort("size")}>
                      Size
                      {sortConfig.key === "size" &&
                        (sortConfig.direction === "asc" ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="pb-3 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-white"
                      onClick={() => handleSort("upload_date")}
                    >
                      Upload Date
                      {sortConfig.key === "upload_date" &&
                        (sortConfig.direction === "asc" ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr key={file._id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    <td className="py-4">
                      <Link to={`/files/${file._id}`} className="flex items-center gap-3 hover:text-blue-400">
                        <div className="p-2 bg-gray-700 rounded">
                          <FileIcon fileName={file.filename} />
                        </div>
                        <span className="font-medium">{file.filename}</span>
                      </Link>
                    </td>
                    <td className="py-4 text-gray-300">
                      {getFileTypeLabel(file.filename.split(".").pop().toLowerCase())}
                    </td>
                    <td className="py-4 text-gray-300">{formatBytes(file.size || 0)}</td>
                    <td className="py-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(file.upload_date)}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleDownload(file._id, file.filename)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">No files found</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Upload your first file to get started"}
            </p>
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
        return <FileText className="text-red-400" size={20} />
      case "doc":
      case "docx":
        return <FileText className="text-blue-400" size={20} />
      case "xls":
      case "xlsx":
        return <FileText className="text-green-400" size={20} />
      case "jpg":
      case "jpeg":
      case "png":
        return <FileText className="text-purple-400" size={20} />
      default:
        return <FileText className="text-gray-400" size={20} />
    }
  }

  return getIconByExtension()
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

const getFileCategory = (extension) => {
  switch (extension) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
      return "document"
    case "jpg":
    case "jpeg":
    case "png":
      return "image"
    case "xls":
    case "xlsx":
    case "csv":
      return "spreadsheet"
    case "zip":
    case "rar":
      return "archive"
    default:
      return "other"
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
    month: "short",
    day: "numeric",
  })
}

export default FileList

