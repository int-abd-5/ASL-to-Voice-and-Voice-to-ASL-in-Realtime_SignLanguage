# ASL Voice-to-Sign & Sign-to-Voice Converter

A real-time bidirectional communication system that converts between American Sign Language (ASL) gestures and spoken language using computer vision, speech recognition, and text-to-speech technologies.

## 🎯 Features

- **Real-time ASL Recognition**: Uses advanced computer vision models to detect and interpret ASL gestures from camera feed
- **Voice-to-ASL Conversion**: Converts spoken language to text and relays it to ASL users
- **Bidirectional Communication**: Two users can communicate in real-time - one using camera (for ASL), one using microphone (for voice)
- **Microservices Architecture**: Scalable backend with separate services for AI, STT, TTS, and text processing
- **Web-based Interface**: Modern React frontend with WebSocket communication

## 🏗️ Architecture

The project consists of a React frontend and a Python microservices backend:

### Backend Services
- **API Server** (port 8000): Main WebSocket server coordinating all services
- **AI Server** (port 8004): ASL gesture recognition using RT-DETR/YOLO models
- **STT Server** (port 8003): Speech-to-text conversion using Whisper
- **TTS Server** (port 8002): Text-to-speech synthesis
- **LangChain Server** (port 8001): Text refinement and processing
- **Gateway** (port 8005): FastAPI gateway for additional endpoints

### Frontend
- **React Application** (port 5173): Web interface with camera and microphone controls

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Docker & Docker Compose** (for running backend services)
- **Node.js** (v16 or higher) and **npm** (for frontend)
- **Git** (for cloning the repository)

## 🔐 Required Credentials

You'll need to obtain the following API keys:

### OpenRouter API Key
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key
4. This is used by the LangChain service for text processing

### Optional: Label Studio (for data annotation)
- Username for Label Studio web interface

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Asl
```

### 2. Set Up Backend Environment Variables

Create a `.env` file in the `inference/inference/` directory:

```bash
cd inference/inference
touch .env
```

Add the following content to `.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=gpt-3.5-turbo
LABEL_STUDIO_USERNAME=your_label_studio_username
```

**Replace `your_openrouter_api_key_here` with your actual OpenRouter API key.**

### 3. Start Backend Services

```bash
cd inference/inference
docker-compose up --build
```

This will:
- Build and start all microservices
- Download required ML models
- Set up the database for Label Studio
- Make services available on their respective ports

### 4. Install and Start Frontend

Open a new terminal window:

```bash
cd frontend/frontend
npm install
npm run dev
```

### 5. Access the Application

- **Frontend**: Open http://localhost:5173 in your browser
- **Backend API**: Available at http://localhost:8000
- **Label Studio** (optional): http://localhost:8080

## 📖 How to Use

### For ASL Users (Deaf/Hard of Hearing):
1. Click "I'm Deaf (Use camera)"
2. Click "Start Camera & Stream" to begin gesture recognition
3. Make ASL signs in front of your camera
4. Click "Send Translation" when ready to convert gestures to speech
5. Listen for the synthesized audio response

### For Voice Users (Hearing):
1. Click "I'm Normal (Use mic)"
2. Click "Start Mic & Stream" to begin voice capture
3. Speak clearly into your microphone
4. Your speech will be converted to text and sent to the ASL user

### Real-time Communication:
- Both users need to be connected simultaneously
- Communication happens through WebSocket connections
- Audio and text are exchanged in real-time

## 🛠️ Development Setup

### Running Individual Services

If you want to run services individually for development:

```bash
# AI Server only
cd inference/inference
docker-compose up ai --build

# STT Server only
docker-compose up stt --build

# etc.
```

### Frontend Development

```bash
cd frontend/frontend
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables Reference

| Variable | Service | Description | Required |
|----------|---------|-------------|----------|
| `OPENROUTER_API_KEY` | langchain | API key for OpenRouter | Yes |
| `OPENROUTER_MODEL` | langchain | Model to use (e.g., gpt-3.5-turbo) | No (defaults to gpt-3.5-turbo) |
| `LABEL_STUDIO_USERNAME` | label-studio | Username for annotation tool | No |

## 📁 Project Structure

```
Asl/
├── frontend/                 # React frontend application
│   └── frontend/
│       ├── src/             # Source code
│       ├── public/          # Static assets
│       └── package.json     # Dependencies
├── inference/               # Backend microservices
│   └── inference/
│       ├── services/        # Individual service directories
│       │   ├── ai_server/      # ASL recognition service
│       │   ├── stt_server/     # Speech-to-text service
│       │   ├── tts_server/     # Text-to-speech service
│       │   ├── langchain_server/ # Text processing service
│       │   ├── api_server/     # Main WebSocket server
│       │   └── common/          # Shared Docker config
│       ├── artifacts/       # ML models and data
│       ├── gateway/         # API gateway
│       └── docker-compose.yml # Service orchestration
└── README.md               # This file
```

## 🔧 Troubleshooting

### Common Issues

**Docker containers won't start:**
- Ensure Docker Desktop is running
- Check if ports 8000-8005 and 8080 are available
- Try: `docker-compose down` then `docker-compose up --build`

**Frontend won't connect to backend:**
- Verify backend services are running on correct ports
- Check WebSocket URLs in `frontend/frontend/src/App.jsx`
- Ensure firewall isn't blocking local connections

**Camera/Microphone not working:**
- Grant browser permissions for camera and microphone
- Test camera/microphone in browser settings
- Ensure no other applications are using the devices

**ML model not found:**
- Check if `artifacts/best.pt` exists
- Ensure Docker has sufficient disk space
- Model will download automatically on first run

### Logs and Debugging

```bash
# View all service logs
cd inference/inference
docker-compose logs

# View specific service logs
docker-compose logs ai
docker-compose logs api

# View frontend logs in browser console
# Open Developer Tools (F12) in browser
```

### Performance Tips

- **GPU Support**: For faster AI inference, ensure Docker can access your GPU
- **Network**: Use wired connection for best real-time performance
- **Camera**: Use good lighting and clear background for better ASL recognition
- **Audio**: Use quality microphone and speak clearly for better STT accuracy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is open source. Please check the license file for details.

## 🙏 Acknowledgments

- Built with FastAPI, React, and Docker
- ASL recognition powered by Ultralytics YOLO/RT-DETR
- Speech processing using OpenAI Whisper
- Text processing with LangChain and OpenRouter

---

**Note**: This is a development/demo version. For production deployment, additional security measures, monitoring, and scaling considerations would be needed.