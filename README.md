# Sedem - Research Productivity Platform

A comprehensive research productivity and project management platform with GitHub integration.

## � Features

- **Project Management**: Organize research projects with milestones and tasks
- **GitHub Integration**: Automatic sync with repositories, commit tracking
- **Duplicate Detection**: Smart analysis to prevent duplicate work
- **Daily Reminders**: Automated notifications to maintain consistency
- **Analytics Dashboard**: Visual insights into research progress
- **Task Tracking**: Comprehensive task management with priorities and deadlines

## 🛠️ Technology Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js + TypeScript + TailwindCSS  
- **Authentication**: GitHub OAuth2
- **Deployment**: Railway (backend) + Vercel (frontend)

### 2. Project & Task Manager
- Create research projects with title, abstract, category, keywords, and tags
- Define milestones (data collection, cleaning, exploratory analysis, modeling, validation, manuscript)
- Add sub-tasks under each milestone with deadlines and optional file links
- Automatically log completed tasks based on GitHub commit messages or detected file updates

### 3. GitHub Integration
- GitHub OAuth2 authentication and repo access
- Automatic tracking of project-specific repositories
- Notifications for inactive periods or undocumented changes
- Quick Push action button for automatic commits

### 4. Smart Duplicate Work Detection
- Analyze R and Python scripts (.R, .py, .ipynb)
- Detect repeated analyses, visualizations, or model-building steps
- Alert users to similar existing work with merge/skip options

### 5. Automated Daily Reminders
- Email and desktop notifications for inactive projects
- Summary of pending tasks and upcoming deadlines
- Optional gamified productivity streaks

### 6. Progress Analytics
- Visual timeline of commits, completed milestones, and time tracking
- Weekly summaries and productivity insights
- Tag-based analysis and recommendations

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js with React
- **Styling**: TailwindCSS
- **State Management**: React Context + hooks
- **Charts**: Recharts or Chart.js

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: SQLAlchemy
- **Authentication**: GitHub OAuth2
- **Task Scheduler**: APScheduler
- **File Analysis**: Custom Python parsers for R/Python scripts

### Deployment
- **Containerization**: Docker
- **Frontend**: Vercel
- **Backend**: AWS or similar cloud provider
- **Database**: PostgreSQL on cloud

## 📁 Project Structure

```
SedemWeb/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container config
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS and styling
│   ├── package.json       # Node.js dependencies
│   └── Dockerfile        # Frontend container config
├── docker-compose.yml     # Multi-container setup
└── README.md             # This file
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL (for production) or SQLite (for development)
- GitHub OAuth App (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SedemWeb
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   - Copy `.env.example` files in both directories
   - Configure GitHub OAuth credentials
   - Set database connection strings

5. **Database Setup**
   ```bash
   cd backend
   python -c "from app.database import create_tables; create_tables()"
   ```

6. **Run the Application**
   ```bash
   # Backend (from backend directory)
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (from frontend directory)
   npm run dev
   ```

### Using Docker (Optional)
```bash
docker-compose up --build
```

## 📋 Usage

1. **Authentication**: Sign in with your GitHub account
2. **Create Projects**: Define research projects with milestones and tasks
3. **Connect Repositories**: Link GitHub repos to your projects
4. **Track Progress**: Monitor daily activities and commit histories
5. **Receive Reminders**: Get automated notifications to stay productive
6. **Analyze Duplicates**: Let Sedem detect repeated work across scripts
7. **Review Analytics**: View productivity insights and progress reports

## 🎯 Roadmap

- [ ] Core project and task management
- [ ] GitHub OAuth2 integration
- [ ] Basic dashboard and analytics
- [ ] Script parsing and duplicate detection
- [ ] Daily reminder system
- [ ] Advanced analytics and reporting
- [ ] Mobile responsiveness
- [ ] API documentation
- [ ] Extended integrations (Jupyter, RStudio)

## 🤝 Contributing

Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ for researchers everywhere.
