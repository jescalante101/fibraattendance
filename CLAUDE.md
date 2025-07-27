# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` (uses proxy config for API calls to backend)
- **Build project**: `npm run build`
- **Watch mode**: `npm run watch`
- **Run tests**: `npm test`

## Architecture Overview

This is an Angular 18 attendance management application (FIBRAWEB 2.0) for Fibrafil company with the following structure:

### Core Architecture
- **Angular Material**: Primary UI component library
- **Reactive Forms**: Form handling throughout the application
- **RxJS**: Async operations and state management
- **Proxy Configuration**: API calls proxied to `http://192.168.10.67:8090` via `/iclock/api`

### Module Structure
- **app.module.ts**: Main application module with all component declarations and Angular Material imports
- **app.routing.ts**: Route configuration with panel-based navigation structure
- **shared/**: Reusable components (modals, loading, confirmation dialogs)
- **core/**: Services and models for business logic

### Component Organization
Components are organized by functional domains under `src/app/components/`:

- **asistencia/**: Attendance management
  - `horarios/`: Schedule management (horario, turno, descanso)
  - `marcaciones/`: Time tracking analysis and reports
  - `aprobaciones/`: Manual time entry approvals
- **personal/**: HR management
  - `organizacion/`: Organizational structure (empresa, departamento, area, cargo, users)
  - `empleado/`: Employee management and assignments
- **dispositivo/**: Device management for time clocks
- **login/**: Authentication

### Service Layer
Services in `core/services/` handle:
- API communication with backend attendance system
- Employee data management
- Schedule and shift assignments
- Attendance analysis and reporting
- Organizational structure management

### Key Features
- Time clock device integration
- Employee schedule management
- Attendance tracking and analysis
- Manual time entry workflows
- Organizational hierarchy management
- Excel report generation

### Development Notes
- Uses Spanish locale (`es`) for date/time formatting
- Material Design components with custom styling
- Proxy configuration required for backend API access
- Component-based architecture with shared services