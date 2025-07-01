# LightTrack Redesign

A modern, VSCode-inspired time tracking application built with Electron, React, and TypeScript.

## Project Structure

```
redesign/
├── src/
│   ├── main/                    # Main process (Electron)
│   │   ├── index.ts            # Entry point
│   │   ├── windows/            # Window management
│   │   ├── tray/              # System tray functionality
│   │   ├── menus/             # Application menus
│   │   ├── ipc/               # IPC handlers
│   │   └── services/          # Core services
│   │
│   ├── renderer/               # Renderer process (React)
│   │   ├── index.tsx          # React entry point
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Renderer services
│   │   ├── utils/             # Utilities
│   │   └── styles/            # Global styles
│   │
│   ├── shared/                 # Shared between processes
│   │   ├── types/             # TypeScript types
│   │   ├── constants/         # Shared constants
│   │   └── utils/             # Shared utilities
│   │
│   ├── integrations/          # External integrations
│   │   ├── jira/              # JIRA integration
│   │   ├── github/            # GitHub integration
│   │   └── calendar/          # Calendar sync
│   │
│   ├── database/              # Database layer
│   │   ├── models/            # Data models
│   │   ├── migrations/        # DB migrations
│   │   └── repositories/      # Data access
│   │
│   └── background/            # Background services
│       ├── monitors/          # Activity monitors
│       ├── analytics/         # Analytics engine
│       └── sync/              # Sync service
│
├── tests/                     # Test files
├── docs/                      # Documentation
├── scripts/                   # Build scripts
└── assets/                    # Static assets
```

## Key Technologies

- **Electron**: Desktop application framework
- **React**: UI library
- **TypeScript**: Type safety
- **Redux Toolkit**: State management
- **Dexie**: IndexedDB wrapper
- **Chart.js**: Data visualization

## Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture Highlights

### Main Process
- **WindowManager**: Handles all window creation and management
- **TrayManager**: System tray integration
- **ActivityService**: Core time tracking logic
- **DatabaseService**: Data persistence layer
- **IntegrationService**: External service integrations

### Renderer Process
- **Redux Store**: Centralized state management
- **Component Architecture**: Modular, reusable components
- **Service Layer**: API communication via IPC
- **Hook System**: Custom React hooks for common functionality

### Background Services
- **Activity Monitor**: Tracks application usage
- **Analytics Engine**: Processes time data
- **Sync Service**: Handles data synchronization

## Features

- ⏱️ **Time Tracking**: Start/stop/pause functionality
- 📊 **Analytics**: Visual insights and reports
- 📁 **Project Management**: Organize work by projects
- 🎯 **Goal Setting**: Daily/weekly targets
- 🔌 **Integrations**: JIRA, GitHub, Calendar
- 🌓 **Themes**: Dark/Light mode support
- ⌨️ **Keyboard Shortcuts**: Power user features
- 📱 **Cross-platform**: Windows, macOS, Linux

## Security

- Context isolation enabled
- Secure IPC communication
- Input validation
- Local-first data storage
- Optional encryption# lighttrack
