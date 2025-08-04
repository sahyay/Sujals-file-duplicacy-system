"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { FileText, Upload, LayoutDashboard, Menu, X, Bell } from "lucide-react"
import { useNotification } from "../context/NotificationContext"

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { notifications, clearNotifications } = useNotification()
  const [showNotifications, setShowNotifications] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">Data Duplication and Anomaly Alert System </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink to="/" isActive={isActive("/")} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLink to="/upload" isActive={isActive("/upload")} icon={<Upload size={18} />} label="Upload" />
            <NavLink to="/files" isActive={isActive("/files")} icon={<FileText size={18} />} label="Files" />

            <div className="relative">
              <button
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full relative"
                onClick={toggleNotifications}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-20">
                  <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-medium text-white">Notifications</h3>
                    {notifications.length > 0 && (
                      <button className="text-xs text-gray-400 hover:text-white" onClick={clearNotifications}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification, index) => (
                        <div
                          key={index}
                          className={`p-3 border-b border-gray-700 ${
                            notification.type === "success"
                              ? "bg-green-900/20"
                              : notification.type === "warning"
                                ? "bg-yellow-900/20"
                                : notification.type === "error"
                                  ? "bg-red-900/20"
                                  : ""
                          }`}
                        >
                          <p className="text-sm text-white">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-400">
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <div className="relative mr-2">
              <button
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full relative"
                onClick={toggleNotifications}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-20">
                  <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-medium text-white">Notifications</h3>
                    {notifications.length > 0 && (
                      <button className="text-xs text-gray-400 hover:text-white" onClick={clearNotifications}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification, index) => (
                        <div
                          key={index}
                          className={`p-3 border-b border-gray-700 ${
                            notification.type === "success"
                              ? "bg-green-900/20"
                              : notification.type === "warning"
                                ? "bg-yellow-900/20"
                                : notification.type === "error"
                                  ? "bg-red-900/20"
                                  : ""
                          }`}
                        >
                          <p className="text-sm text-white">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-400">
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <MobileNavLink
              to="/"
              isActive={isActive("/")}
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              onClick={closeMenu}
            />
            <MobileNavLink
              to="/upload"
              isActive={isActive("/upload")}
              icon={<Upload size={18} />}
              label="Upload"
              onClick={closeMenu}
            />
            <MobileNavLink
              to="/files"
              isActive={isActive("/files")}
              icon={<FileText size={18} />}
              label="Files"
              onClick={closeMenu}
            />
          </div>
        </div>
      )}
    </nav>
  )
}

const NavLink = ({ to, isActive, icon, label }) => (
  <Link
    to={to}
    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
      isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`}
  >
    {icon}
    {label}
  </Link>
)

const MobileNavLink = ({ to, isActive, icon, label, onClick }) => (
  <Link
    to={to}
    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
      isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </Link>
)

export default Navbar

