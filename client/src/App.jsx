import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Dashboard from "./components/Dashboard"
import Navbar from "./components/Navbar"
import FileUpload from "./components/FileUpload"
import FileList from "./components/FileList"
import FileDetails from "./components/FileDetails"
import { NotificationProvider } from "./context/NotificationContext"
import { SocketProvider } from "./context/SocketContext"
import "./index.css"

function App() {
  return (
    <NotificationProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<FileUpload />} />
                <Route path="/files" element={<FileList />} />
                <Route path="/files/:id" element={<FileDetails />} />
              </Routes>
            </div>
          </div>
        </Router>
      </SocketProvider>
    </NotificationProvider>
  )
}

export default App

