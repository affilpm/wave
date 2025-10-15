# Wave
# 🎵 Wave - Music Streaming Platform

<div align="center">
  <img src="logo.png" alt="Wave Logo" width="100" height="auto" />
  <p><em>A comprehensive full-stack music streaming platform for artists and listeners</em></p>
  
  ![License](https://img.shields.io/badge/license-MIT-blue)
  ![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)
  ![Backend](https://img.shields.io/badge/backend-Django-092E20)
  ![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [Installation](#-installation)
- [Development](#-development)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)
<!-- - [Screenshots](#-screenshots) -->
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🚀 Overview

**Wave** is a powerful, feature-rich music streaming platform designed for both artists and listeners. The platform consists of a robust Django backend and a modern React frontend, providing a seamless experience for music discovery, playback, and artist promotion.

Wave enables artists to upload, manage their music while giving listeners a personalized experience for discovering, streaming, and organizing music. With premium subscription options and a responsive design for all devices, Wave offers a comprehensive solution for music streaming needs.

## ✨ Features

### For Listeners

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
<div style="background-color: #E3F2FD; padding: 10px; border-radius: 8px;">
  <h4>🎧 Music Discovery</h4>
  <p>Personalized recommendations and genre-based exploration</p>
</div>

<div style="background-color: #E0F7FA; padding: 10px; border-radius: 8px;">
  <h4>📋 Playlist Management</h4>
  <p>Create and discover playlists</p>
</div>

<div style="background-color: #E8F5E9; padding: 10px; border-radius: 8px;">
  <h4>📚 Library Organization</h4>
  <p>Save songs, artists and playlists</p>
</div>

<div style="background-color: #F3E5F5; padding: 10px; border-radius: 8px;">
  <h4>🎛️ Audio Controls</h4>
  <p>Equalizer with custom presets</p>
</div>

<div style="background-color: #FFF8E1; padding: 10px; border-radius: 8px;">
  <h4>🎚️ Streaming Quality Control</h4>
  <p>Listeners can choose music quality: Low, Medium, High, or Lossless.</p>
</div>

<div style="background-color: #FFF8E1; padding: 10px; border-radius: 8px;">
  <h4>🕰️ Listening History</h4>
  <p>Track and revisit your listening patterns</p>
</div>

<div style="background-color: #FFEBEE; padding: 10px; border-radius: 8px;">
  <h4>👥 Social Features</h4>
  <p>Follow artists</p>
</div>
</div>

### For Artists

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
<div style="background-color: #EDE7F6; padding: 10px; border-radius: 8px;">
  <h4>🎤 Artist Profile</h4>
  <p>Customizable profiles with verification</p>
</div>

<div style="background-color: #E1F5FE; padding: 10px; border-radius: 8px;">
  <h4>💿 Music Management</h4>
  <p>Upload, organize, and publish music</p>
</div>

<div style="background-color: #F1F8E9; padding: 10px; border-radius: 8px;">
  <h4>📊 Analytics</h4>
  <p>Track play counts and listener demographics</p>
</div>

<div style="background-color: #F9FBE7; padding: 10px; border-radius: 8px;">
  <h4>🔍 Discovery Options</h4>
  <p>Genre tagging</p>
</div>
</div>

### Premium Features

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
<div style="background-color: #E3F2FD; padding: 10px; border-radius: 8px;">
  <h4>⚙️ Quality Selector</h4>
  <p>Non-premium users stream in standard quality, while premium users enjoy adaptive streaming with manual quality selection.</p>
</div>

</div>

### Admin Features

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
  <div style="background-color: #FFE0B2; padding: 10px; border-radius: 8px;">
    <h4>🧑‍💼 User Management</h4>
    <p>Manage users and artists, block/unblock accounts</p>
  </div>

  <div style="background-color: #FFCCBC; padding: 10px; border-radius: 8px;">
    <h4>🎵 Music Moderation</h4>
    <p>Block/unblock music due to copyright or other reasons</p>
  </div>

  <div style="background-color: #D1C4E9; padding: 10px; border-radius: 8px;">
    <h4>💰 Premium & Payments</h4>
    <p>Create premium plans, manage subscriptions, and track all payment transactions</p>
  </div>
</div>

## 🛠️ Tech Stack

### Backend

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/Django_REST_Framework-092E20?style=for-the-badge&logo=django&logoColor=white" alt="DRF" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white" alt="Celery" />
  <img src="https://img.shields.io/badge/Django_Channels-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django Channels" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Razorpay-3395FF?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay" />
  <img src="https://img.shields.io/badge/AWS_CloudFront-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS CloudFront" />
  <img src="https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google OAuth" />
</div>

### Frontend

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white" alt="Redux Toolkit" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Material_UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white" alt="Material UI" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
</div>

## 🏗️ Architecture

### System Architecture

```mermaid
graph TD
    Client[Client Browser/App] --> |HTTP/WS| LoadBalancer[Load Balancer]
    LoadBalancer --> |HTTP| WebServer[Nginx Web Server]
    LoadBalancer --> |WS| WSServer[WebSocket Server]
    WebServer --> |WSGI| DjangoApp[Django Application]
    WSServer --> |ASGI| Channels[Django Channels]
    DjangoApp --> |Queries| PostgreSQL[(PostgreSQL Database)]
    DjangoApp --> |Auth| JWT[JWT Auth]
    DjangoApp --> |Payments| Razorpay[Razorpay API]
    DjangoApp --> |Storage| S3[S3 Storage]
    DjangoApp --> |Async Tasks| Celery[Celery Worker]
    Celery --> |Broker / Backend| Redis[(Redis – Cache + Message Broker)]
    Celery --> |Audio Processing| HLS[HLS Variant Generator]
    HLS --> |Uploads| S3
    S3 --> |CDN| CloudFront[Amazon CloudFront CDN]
    Channels --> Redis
```

### Data Model

Wave uses a comprehensive data model with the following key components:

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
<div style="background-color: #E3F2FD; padding: 15px; border-radius: 8px;">
  <h4>👤 User System</h4>
  <ul>
    <li><code>CustomUser</code>: Extended user model</li>
    <li><code>Profile</code>: User profile details</li>
    <li><code>EmailVerification</code>: Verification system</li>
  </ul>
</div>

<div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px;">
  <h4>🎤 Artist Management</h4>
  <ul>
    <li><code>Artist</code>: Artist profiles</li>
    <li><code>Follow</code>: User-artist relationship</li>
    <li><code>ArtistGenres</code>: Genre categorization</li>
  </ul>
</div>

<div style="background-color: #FFF8E1; padding: 15px; border-radius: 8px;">
  <h4>🎵 Music Content</h4>
  <ul>
    <li><code>Music</code>: Individual tracks</li>
    <li><code>Album</code>: Collections of tracks</li>
    <li><code>Genre</code>: Music categorization</li>
    <li><code>AlbumTrack</code>: Track ordering</li>
  </ul>
</div>

<div style="background-color: #F3E5F5; padding: 15px; border-radius: 8px;">
  <h4>🎧 User Features</h4>
  <ul>
    <li><code>Library</code>: Saved music</li>
    <li><code>Playlist</code> & <code>PlaylistTrack</code>: Playlists</li>
    <li><code>PlayCount</code> & <code>PlayHistory</code>: Analytics</li>
    <li><code>EqualizerPreset</code>: Audio settings</li>
    <li><code>QualitySelector</code>: Allows listeners to change streaming quality (Low, Medium, High, Lossless)</li>
  </ul>
</div>

<div style="background-color: #E0F7FA; padding: 15px; border-radius: 8px;">
  <h4>💰 Premium Features</h4>
  <ul>
    <li><code>PremiumPlan</code>: Subscription tiers</li>
    <li><code>UserSubscription</code>: User subscriptions</li>
    <li><code>RazorpayTransaction</code>: Payment records</li>
  </ul>
</div>
</div>

## 📥 Installation

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/wave-backend.git
cd wave-backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with required variables (see below)

# Set up database
python manage.py migrate
python manage.py createsuperuser

# Run the development server
python manage.py runserver
```

**Required Environment Variables (.env):**

```
DEBUG=True
SECRET_KEY=your_secret_key
DATABASE_URL=postgres://user:password@localhost:5432/wave
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
EMAIL_HOST_USER=your_email
EMAIL_HOST_PASSWORD=your_email_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
REDIS_URL=redis://localhost:6379/0
```

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/wave-frontend.git
cd wave-frontend

# Install dependencies
npm install
# or
yarn install

# Set up environment variables
# Create a .env file with required variables (see below)

# Start development server
npm run dev
# or
yarn dev
```

**Required Environment Variables (.env):**

```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8001/ws
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Docker Setup (Optional)

```bash
# Start both frontend and backend
docker-compose up -d

# Access frontend at http://localhost:5173
# Access backend at http://localhost:8000
```

## 💻 Development

### Backend Project Structure

<div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">

```
wave-backend/
├── users/              # User management
├── artists/            # Artist profiles and management
├── music/              # Track and music management
├── album/              # Album-specific functionality
├── playlist/           # Playlist functionality
├── library/            # User's saved content
├── premium/            # Subscription management
├── listening_history/  # Play tracking
├── livestream/         # Live performance functionality
├── home/               # Main landing page and discovery
├── config/             # Main project settings
├── static/             # Static files
└── media/              # User-uploaded content
```

</div>

### Frontend Project Structure

<div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">

```
src/
├── components/              # Reusable UI components
│   ├── player/             # Music player components
│   ├── admin/              # Admin-specific components
│   ├── artist/             # Artist-specific components
│   ├── livestream/         # Livestreaming components
│   └── user/               # User/listener components
├── pages/                   # Application pages
│   ├── admin/              # Admin dashboard pages
│   ├── artist/             # Artist studio pages
│   └── user/               # User/listener pages
├── slices/                  # Redux slices
├── services/                # API service modules
├── utils/                   # Utility functions
├── hooks/                   # Custom React hooks
├── constants/               # Application constants
├── App.jsx                  # Main application component
├── api.js                   # Main API configuration
└── main.jsx                 # Application entry point
```

</div>

### Development Tools

#### Backend

```bash
# Enhanced Python shell with auto-imports
python manage.py shell_plus

# Generate model diagrams
python manage.py graph_models -a -o wave_models.png

# Display all registered URLs
python manage.py show_urls
```

#### Frontend

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Build for production
npm run build
```

## 📖 API Documentation

Wave exposes a comprehensive RESTful API with these key endpoint groups:

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
<div style="background-color: #E3F2FD; padding: 15px; border-radius: 8px;">
  <h4>🔐 Authentication</h4>
  <ul>
    <li><code>POST /api/auth/register/</code>: User registration</li>
    <li><code>POST /api/auth/login/</code>: User login</li>
    <li><code>POST /api/auth/token/refresh/</code>: Refresh token</li>
    <li><code>POST /api/auth/google/</code>: Google OAuth</li>
  </ul>
</div>

<div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px;">
  <h4>👤 User Management</h4>
  <ul>
    <li><code>GET /api/users/me/</code>: Current user profile</li>
    <li><code>PATCH /api/users/me/</code>: Update profile</li>
    <li><code>GET /api/users/settings/</code>: User settings</li>
    <li><code>PATCH /api/users/settings/</code>: Update settings</li>
  </ul>
</div>

<div style="background-color: #FFF8E1; padding: 15px; border-radius: 8px;">
  <h4>🎵 Music and Albums</h4>
  <ul>
    <li><code>GET /api/music/</code>: List tracks</li>
    <li><code>POST /api/music/</code>: Upload track</li>
    <li><code>GET /api/albums/</code>: List albums</li>
    <li><code>POST /api/albums/</code>: Create album</li>
    <li><code>GET /api/genres/</code>: List genres</li>
  </ul>
</div>

<div style="background-color: #F3E5F5; padding: 15px; border-radius: 8px;">
  <h4>📋 Playlists and Library</h4>
  <ul>
    <li><code>GET /api/playlists/</code>: List playlists</li>
    <li><code>POST /api/playlists/</code>: Create playlist</li>
    <li><code>GET /api/library/</code>: User library</li>
    <li><code>POST /api/library/tracks/add/</code>: Add to library</li>
    <li><code>POST /api/library/tracks/remove/</code>: Remove from library</li>
  </ul>
</div>

<div style="background-color: #E0F7FA; padding: 15px; border-radius: 8px;">
  <h4>🎤 Artists</h4>
  <ul>
    <li><code>GET /api/artists/</code>: List artists</li>
    <li><code>GET /api/artists/{id}/</code>: Artist details</li>
    <li><code>POST /api/artists/{id}/follow/</code>: Follow artist</li>
    <li><code>POST /api/artists/{id}/unfollow/</code>: Unfollow artist</li>
    <li><code>POST /api/artists/verify/</code>: Request verification</li>
  </ul>
</div>

<div style="background-color: #FCE4EC; padding: 15px; border-radius: 8px;">
  <h4>💰 Premium Features</h4>
  <ul>
    <li><code>GET /api/premium/plans/</code>: List plans</li>
    <li><code>POST /api/premium/subscribe/</code>: Subscribe</li>
    <li><code>GET /api/premium/subscriptions/</code>: User subscriptions</li>
    <li><code>POST /api/premium/payment/verify/</code>: Verify payment</li>
  </ul>
</div>
</div>


## 🚢 Deployment

### Production Requirements

- **Backend**: Django, PostgreSQL, Redis, Nginx, Daphne/Uvicorn
- **Frontend**: Node.js, NPM/Yarn
- **Infrastructure**: Docker, AWS/GCP/Azure

### Deployment Options

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">

<div style="background-color: #E3F2FD; padding: 15px; border-radius: 8px;">
  <h4>🐳 Docker Deployment</h4>
  
  ```bash
  # Build and deploy with Docker Compose
  docker-compose -f docker-compose.yml up -d
  ```
</div>

<div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px;">
  <h4>☁️ AWS Deployment</h4>
  
  ```bash
  # Deploy backend with Elastic Beanstalk
  eb init
  eb create wave-production
  
  # Deploy frontend with Amplify
  amplify init
  amplify publish
  ```
</div>

<div style="background-color: #FFF8E1; padding: 15px; border-radius: 8px;">
  <h4>🚀 Vercel (Frontend)</h4>
  
  ```bash
  # Install Vercel CLI
  npm i -g vercel
  
  # Deploy
  vercel
  ```
</div>

<div style="background-color: #F3E5F5; padding: 15px; border-radius: 8px;">
  <h4>🌐 Heroku (Backend)</h4>
  
  ```bash
  # Login to Heroku
  heroku login
  
  # Create app and push
  heroku create wave-backend
  git push heroku main
  ```
</div>

</div>

## 🔒 Security

Wave implements several security measures:

- **JWT Authentication**: Short-lived tokens (5 minutes) with rotation
- **Token Blacklisting**: Prevention of token reuse
- **CORS Configuration**: Strict cross-origin resource sharing
- **Content Security Policy**: Protection against XSS attacks
- **Password Validation**: Strong password requirements
- **HTTPS Enforcement**: Secure communication
- **Rate Limiting**: Protection against brute force attacks
- **Signed URLs**: Secure media access

<!-- ## 📸 Screenshots

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
  <img src="https://via.placeholder.com/500x300?text=Home+Dashboard" alt="Home Dashboard" style="border-radius: 8px;"/>
  <img src="https://via.placeholder.com/500x300?text=Music+Player" alt="Music Player" style="border-radius: 8px;"/>
  <img src="https://via.placeholder.com/500x300?text=Artist+Profile" alt="Artist Profile" style="border-radius: 8px;"/>
  <img src="https://via.placeholder.com/500x300?text=Playlist+Management" alt="Playlist Management" style="border-radius: 8px;"/>
</div> -->

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<!-- ### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing to the project. -->

Here's the properly formatted version with your phone number and social media links added:


## 📜 License  

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.  

## 📞 Contact  

**AFFIL P M**  
📧 [affilpm2004@gmail.com](mailto:affilpm2004@gmail.com)  
<!-- 📞 +91 7306753900 -->

### 🌐 Social Media:  
- **LinkedIn:** [linkedin.com/in/affilpm](https://www.linkedin.com/in/affil-p-m-b9a2b2299)  
- **Instagram:** [instagram.com/affilpm](https://www.instagram.com/affil_pm_)  
<!-- - **Twitter:** [twitter.com/affilpm](https://twitter.com/affilpm)   -->

### 🔗 Project Links:  
- **Backend:** [GitHub - Wave Backend](https://github.com/affilpm/Wave/tree/main/Backend)  
- **Frontend:** [GitHub - Wave Frontend](https://github.com/affilpm/Wave/tree/main/Frontend)  

---

<div align="center">
  <p>🚀 Built with care for an exceptional user experience! 💙</p>
</div>  

---

<div align="center">
  <p>Crafted with care by <a href="https://github.com/affilpm">AFFIL P M</a></p>
</div>