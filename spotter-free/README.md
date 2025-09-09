# 🏋️ Spotter - Fitness Tracking App

A modern, responsive fitness tracking application built with Next.js 15 and React 19. Spotter helps you track workouts, manage your exercise library, and monitor your fitness progress.

![Spotter App Preview](public/preview.png)

## ✨ Features

- **Dashboard**: View workout statistics and quick access to main features
- **Workout Library**: Browse and manage your saved workouts
- **Calendar View**: Track workout schedules and planning
- **Add Workouts**: Create and import new workout routines
- **User Authentication**: Secure login system (currently in demo mode)
- **Responsive Design**: Optimized for mobile and desktop
- **Dark Theme**: Professional dark UI with custom color scheme

## 🚀 Tech Stack

- **Frontend**: Next.js 15.5.1 with App Router
- **React**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand for client-side state
- **Icons**: Lucide React icons
- **Build Tool**: Turbopack for fast development builds

## 🏃 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd spotter-fresh
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🔐 Demo Authentication

Currently in demo mode - use any email and password to sign in. The app will create a demo user session.

**Default credentials:**
- Email: `demo@spotter.com`
- Password: `password`

## 📁 Project Structure

```
src/
├── app/                 # App Router pages
│   ├── add/            # Add workout page
│   ├── calendar/       # Calendar view page
│   ├── library/        # Workout library page
│   ├── settings/       # Settings page
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Dashboard page
│   └── globals.css     # Global styles
├── components/         # Reusable UI components
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components
│   └── ui/            # Base UI components
├── lib/               # Utility functions
└── store/             # Zustand state management
```

## 🎨 Design System

### Color Palette
- **Background**: `#0C0F12` (Dark navy)
- **Surface**: `#12161B` (Darker overlay)
- **Primary**: `#00D0BD` (Cyan accent)
- **Secondary**: `#7A7EFF` (Purple accent)
- **Rest**: `#FFC247` (Amber accent)
- **Text Primary**: `#FFFFFF`
- **Text Secondary**: `#B9C4CF`

### Typography
- **Font**: Inter with fallbacks to system fonts
- **Headers**: Bold weights with proper hierarchy
- **Body**: Regular weight with good line-height

## 🔧 Development Notes

### Current Status
This is a **development prototype** with mock authentication and localStorage-based data persistence. See `PRODUCTION-READINESS.md` for detailed production deployment requirements.

### Key Areas for Production
- Replace mock authentication with real auth service
- Implement backend API with database
- Add comprehensive testing
- Security hardening and environment configuration

## 📚 Documentation

- [Production Readiness Guide](PRODUCTION-READINESS.md) - Comprehensive production deployment checklist
- [Security Audit Results](PRODUCTION-READINESS.md#security-audit-results) - Security review and recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Deployment

This Next.js app can be deployed on various platforms:

- **Vercel** (Recommended): One-click deployment with optimal Next.js support
- **AWS Amplify**: Full-stack deployment with backend services
- **Netlify**: Static/SSR deployment with serverless functions
- **Docker**: Containerized deployment for any cloud provider

For detailed AWS deployment preparation, see the [Production Readiness Guide](PRODUCTION-READINESS.md).

---

Built with ❤️ for fitness enthusiasts who want to track their progress and stay motivated.
