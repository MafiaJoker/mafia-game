# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mafia Game Helper - a Vue 3 web application for managing and conducting Mafia (Werewolf) party games. It helps game moderators track player roles, voting, night actions, fouls, and game progression in competitive tournament settings.

## Essential Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

### Tech Stack
- **Vue 3** with Composition API
- **Pinia** for state management
- **Vue Router** for SPA routing
- **Element Plus** UI component library
- **Vite** as build tool
- **Vue i18n** for internationalization (Russian, English, Armenian)

### State Management Pattern

The application uses Pinia stores with a modular architecture:

- **events.js**: Tournament and event management
- **game.js**: Core game state, players, roles, and game flow
- **gameResults.js**: Scoring and results calculation
- **judges.js**: Judge/moderator selection and management
- **nightActions.js**: Night phase action tracking
- **voting.js**: Voting mechanics and state

Each store handles its domain logic and communicates with the API service independently.

### Component Organization

- **views/**: Route-level components (EventsView, EventView, GameView)
- **components/common/**: Shared components (AppHeader, JudgeSelector)
- **components/events/**: Event management components
- **components/game/**: Game session components
- **components/game/dialogs/**: Modal dialogs for game actions

### API Integration

The application expects a backend API at `http://localhost:3000/api` with RESTful endpoints for:
- `/events` - Tournament events
- `/tables` - Game tables within events
- `/games` - Individual game sessions
- `/judges` - Judge/moderator data

### Game Domain Model

**Player Roles:**
- Civilian (6 players)
- Mafia (2 players)
- Don (1 player - mafia leader)
- Sheriff (1 player - civilian with check ability)

**Game Flow:**
1. Role assignment
2. Day phase: Discussion and voting
3. Night phase: Mafia kills, Don/Sheriff checks
4. Repeat until victory condition

**Key Mechanics:**
- Foul system: 3 fouls = silence, 4 fouls = elimination
- Best move: First eliminated player can grant extra points
- Critical rounds: Triggered after 3 rounds without eliminations
- Shoot-outs: Tie-breaking mechanism during voting

## Development Notes

- The application uses auto-imports for Vue, Vue Router, and Pinia - no need to import these explicitly
- Element Plus components are auto-registered via unplugin
- Path alias `@` maps to `/src` directory
- Default language is Russian, with English and Armenian translations available
- Game state is persisted to the backend API after each significant action