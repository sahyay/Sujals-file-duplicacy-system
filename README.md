# Company Secure File Management System

A secure file management system for companies with duplicate detection, anomaly detection, and real-time notifications.

## Features

- **File Upload System**: Upload company-related files with secure storage in MongoDB GridFS
- **Duplicate File Detection**: SHA-256 checksum and content similarity analysis
- **Anomaly Detection**: Machine learning to detect unusual file uploads
- **File Management & Retrieval**: Search, preview, and download files
- **Real-Time Notifications**: Socket.IO for instant alerts

## Tech Stack

- **Backend**: Python (Flask, Flask-SocketIO, Flask-PyMongo)
- **Database**: MongoDB (with GridFS for file storage)
- **Frontend**: React with Tailwind CSS
- **Machine Learning**: Scikit-learn (TF-IDF + LSA for similarity, Isolation Forest for anomaly detection)

## Setup Instructions

### Prerequisites

- Python 3.12
- Node.js and npm
- MongoDB Atlas account (or local MongoDB instance)

### Environment Setup

1. Clone the repository:

