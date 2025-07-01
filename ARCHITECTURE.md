# LightTrack Architecture Overview

## Application Structure

The LightTrack redesign follows a modular, scalable architecture with clear separation of concerns:

### Main Process (Electron)
- **WindowManager**: Manages all application windows
- **TrayManager**: System tray integration and quick actions
- **ActivityService**: Core time tracking logic (singleton)
- **DatabaseService**: IndexedDB wrapper for data persistence
- **IntegrationService**: Manages external integrations
- **IPCHandler**: Secure IPC communication layer

### Renderer Process (React)
- **Redux Store**: Centralized state management
  - `activitySlice`: Current activity and tracking state
  - `projectSlice`: Project management
  - `goalSlice`: Goal tracking
  - `settingsSlice`: User preferences
  - `uiSlice`: UI state (modals, notifications)
  - `appSlice`: Application-level state

- **Component Architecture**:
  - `/layouts`: Main layout components
  - `/common`: Reusable UI components
  - `/dashboard`: Dashboard-specific components
  - `/timeline`: Timeline visualization
  - `/analytics`: Charts and reports
  - `/sidebar`: Navigation components

### Data Flow

```
User Action → React Component → Redux Action → IPC Call → Main Process
                                                    ↓
Database ← Service Layer ← IPC Response ← Redux State Update
```

### Key Design Patterns

1. **Singleton Services**: Core services like ActivityService use singleton pattern
2. **Repository Pattern**: Database access through repositories
3. **Command Pattern**: Command palette implementation
4. **Observer Pattern**: Real-time updates via EventEmitter
5. **Factory Pattern**: Integration creation

### Security Measures

- Context Isolation enabled
- Preload script with whitelisted channels
- Input validation on all IPC calls
- No nodeIntegration in renderer
- CSP headers configured

### Performance Optimizations

- Virtual scrolling for large lists
- Memoized selectors in Redux
- Lazy loading of routes
- Debounced updates
- IndexedDB for fast local queries

### Modular Features

Each feature is self-contained with:
- Types/Interfaces
- Redux slice
- Components
- Services
- Tests

This allows for:
- Easy feature addition/removal
- Parallel development
- Clear ownership
- Simplified testing

### Integration Architecture

Integrations follow a plugin pattern:
- Common interface (`Integration`)
- Config management
- Async sync operations
- Error boundaries
- Retry logic

### Future Extensibility

The architecture supports:
- Additional integrations
- New visualization types
- Plugin system
- Theme customization
- Multi-language support
- Team features

## Development Workflow

1. **Type-First Development**: Define interfaces before implementation
2. **Component Isolation**: Build components in isolation
3. **Service Layer**: Business logic in services, not components
4. **State Management**: Redux for complex state, hooks for local state
5. **Testing Strategy**: Unit tests for logic, integration tests for flows

## File Organization

- **Colocate related files**: Keep styles, tests near components
- **Barrel exports**: Index files for clean imports
- **Shared types**: Common types in shared folder
- **Feature folders**: Group by feature, not file type