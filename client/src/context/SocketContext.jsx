"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useNotification } from "./NotificationContext"

const SocketContext = createContext()

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { addNotification } = useNotification()

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on("connect", () => {
      console.log("Connected to socket server")
      setConnected(true)
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server")
      setConnected(false)
    })

    socketInstance.on("file_uploaded", (data) => {
      console.log("File uploaded event received:", data)
      addNotification({
        type: "success",
        message: `File "${data.filename}" was uploaded successfully`,
        timestamp: new Date(),
        duration: 5000,
      })
    })

    socketInstance.on("duplicate_detected", (data) => {
      console.log("Duplicate file event received:", data)
      addNotification({
        type: "warning",
        message: `Duplicate file detected: "${data.filename}" matches an existing file`,
        timestamp: new Date(),
        duration: 5000,
      })
    })

    socketInstance.on("anomaly_detected", (data) => {
      console.log("Anomaly detected event received:", data)
      addNotification({
        type: "error",
        message: `Anomaly detected in file "${data.filename}"`,
        timestamp: new Date(),
        duration: 5000,
      })
    })

    setSocket(socketInstance)

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect()
    }
  }, [addNotification])

  const value = {
    socket,
    connected,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

