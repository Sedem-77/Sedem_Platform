#!/bin/bash

# Sedem Setup Script
echo "🚀 Setting up Sedem - Research Productivity Platform"

# Check if Node.js and Python are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Setup Backend
echo "📦 Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

echo "✅ Backend setup complete!"

# Setup Frontend
echo "📦 Setting up frontend..."
cd ../frontend

# Install Node.js dependencies
npm install

echo "✅ Frontend setup complete!"

# Setup environment files
cd ..
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from template. Please update with your configuration."
fi

echo ""
echo "🎉 Sedem setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your GitHub OAuth credentials"
echo "2. Start the backend: cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload"
echo "3. Start the frontend: cd frontend && npm run dev"
echo "4. Visit http://localhost:3000 to access Sedem"
echo ""
echo "📖 For detailed setup instructions, see README.md"