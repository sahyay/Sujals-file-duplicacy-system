"use client"

import { createContext, useContext, useState, useCallback } from "react"

const NotificationContext = createContext()

export const useNotification = () => {
  return useContext(NotificationContext)
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const addNotification = useCallback(
    (notification) => {
      const newNotification = {
        ...notification,
        id: Date.now(),
        timestamp: notification.timestamp || new Date(),
      }

      setNotifications((prev) => [newNotification, ...prev])

      // Auto-remove notification after duration (if specified)
      if (notification.duration) {
        setTimeout(() => {
          removeNotification(newNotification.id)
        }, notification.duration)
      }
    },
    [removeNotification],
  )

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

