# Facebook Pro - Full-Stack Social Media Platform

A modern, real-time social media platform built with the MERN stack + Socket.io.

## Features

- User authentication (JWT, email verification, password reset)
- Complete social features: posts, stories, friends, groups
- Real-time messaging with typing indicators and online status
- Video/audio calls via WebRTC
- Live streaming
- Notifications system
- Admin panel
- Cloudinary media uploads

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Real-time**: Socket.io
- **Auth**: JWT
- **Media**: Cloudinary
- **Email**: Nodemailer

## Quick Start

```bash
git clone https://github.com/yourusername/facebook-pro-backend.git
cd facebook-pro-backend
npm install
cp .env.example .env
# Configure your .env
npm run dev
