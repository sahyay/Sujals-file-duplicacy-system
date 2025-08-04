"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { FileText, AlertTriangle, CheckCircle, Upload, Database } from "lucide-react"
import { useNotification } from "../context/NotificationContext"

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFiles: 0,
    duplicatesDetected: 0,
    anomaliesDetected: 0,
    totalStorage: 0,
  })

  const [recentActivity, setRecentActivity] = useState([])
  const [uploadsByDay, setUploadsByDay] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { notifications } = useNotification()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/dashboard")
        const data = await response.json()

        setStats(data.stats)
        setRecentActivity(data.recentActivity)
        setUploadsByDay(data.uploadsByDay)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [notifications])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">Company File Management Dashboard</h1>
        <Link
          to="/upload"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
        >
          <Upload size={18} />
          Upload New File
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Files"
          value={stats.totalFiles}
          icon={<FileText className="text-blue-400" size={24} />}
          bgColor="bg-gray-800"
        />
        <StatCard
          title="Duplicates Detected"
          value={stats.duplicatesDetected}
          icon={<AlertTriangle className="text-yellow-400" size={24} />}
          bgColor="bg-gray-800"
        />
        <StatCard
          title="Anomalies Blocked"
          value={stats.anomaliesDetected}
          icon={<AlertTriangle className="text-red-400" size={24} />}
          bgColor="bg-gray-800"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(stats.totalStorage)}
          icon={<Database className="text-green-400" size={24} />}
          bgColor="bg-gray-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Upload Activity (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uploadsByDay}>
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "0.5rem" }}
                  itemStyle={{ color: "#f3f4f6" }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="uploads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Recent Activity</h2>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                  {activity.type === "upload" && <CheckCircle className="text-green-400 mt-1" size={18} />}
                  {activity.type === "duplicate" && <AlertTriangle className="text-yellow-400 mt-1" size={18} />}
                  {activity.type === "anomaly" && <AlertTriangle className="text-red-400 mt-1" size={18} />}
                  <div>
                    <p className="text-sm text-gray-300">{formatTimestamp(activity.timestamp)}</p>
                    <p className="text-white">{activity.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, bgColor }) => (
  <div
    className={`${bgColor} rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-5px]`}
  >
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-medium text-gray-300">{title}</h3>
      {icon}
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
)

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

export default Dashboard

