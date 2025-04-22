# Project Fireside - Implementation Details

Project Fireside is a modern, personalized RSS feed aggregator and reader built with Next.js and MariaDB. This document provides a comprehensive overview of the system architecture and implementation details.

## Architecture Overview

Project Fireside follows a layered architecture pattern with clear separation of concerns:

1. **Presentation Layer**: Next.js-based frontend with React components
2. **Application Layer**: API routes and middlewares
3. **Business Logic Layer**: Service modules for authentication, feed processing
4. **Data Access Layer**: Database interaction modules
5. **Database Layer**: MariaDB relational database

## System Components

### 1. Frontend Components
The frontend is built with Next.js and organized into reusable React components that provide a responsive user interface for:
- Authentication (login/signup forms)
- Feed discovery and management
- Article reading and interaction
- User dashboard with reading statistics

### 2. Backend Services
The backend consists of several core services:
- **Authentication Service**: User registration, login, and session management
- **Feed Processing Service**: Fetching, parsing, and processing RSS feeds
- **Recommendation System**: Personalized content recommendations based on user behavior
- **Data Management**: Database operations and state management

### 3. Database Schema
The database uses a relational schema with tables for:
- Users and authentication
- Feeds and categories
- Feed items (articles)
- User interactions and preferences
- Content publishers and authors

## UML Block Diagram
```mermaid
flowchart TB
    Client["Client Browser"]

    subgraph NextApp["Next.js Application"]
        Components["Components<br>- app-sidebar<br>- feed-item-list<br>- article-viewer<br>- login-form<br>- signup-form"]
        Pages["Pages / Routes<br>- page.tsx<br>- dashboard<br>- login<br>- feeds<br>- articles"]
        Middleware["Middleware<br>- Authentication<br>- API Routes<br>Protection"]
    end

    subgraph Services["Service Layer"]
        Auth["Auth Services<br>- User Registration<br>- Login/Logout<br>- Session Management"]
        RSS["RSS Services<br>- Feed Fetching<br>- Feed Parsing<br>- Content Processing"]
        Data["Data Services<br>- DB Queries<br>- Data Procedures<br>- Schema Management"]
    end

    subgraph DB["Database Layer"]
        Users["Users"]
        Feeds["Feeds"]
        FeedItems["FeedItems"]
        Interactions["Interactions"]
        Publishers["Publishers"]
        Categories["Categories"]
        Authors["Authors"]
        Recommendations["Recommendations"]
    end

    Client --> NextApp
    Components --> Auth
    Components --> RSS
    Components --> Data
    Pages --> Auth
    Pages --> RSS
    Pages --> Data
    Middleware --> Auth
    Middleware --> Data

    Auth --> DB
    RSS --> DB
    Data --> DB

## Key Implementation Details

### Authentication Flow
1. Users register/login via the login form component
2. Credentials are validated against the database
3. Session tokens are issued and stored in cookies
4. Protected routes check for valid sessions via middleware

### Feed Processing Flow
1. Users add RSS feed URLs via the add-feed form
2. The system fetches and parses the feed using the RSS parser
3. Feed metadata and items are stored in the database
4. New content is associated with publishers, authors, and categories
5. Items are presented to users based on subscriptions and preferences

### Content Recommendation System
1. User interactions (reads, likes, saves) are tracked
2. Engagement patterns are analyzed by category and publisher
3. A recommendation algorithm calculates relevance scores
4. Personalized content is presented in the user's feed

### Database Operations
1. Connection pooling for efficient database access
2. Transactions for data integrity
3. Normalized schema design to minimize redundancy
4. Indexes for optimized query performance

## Technical Stack

### Frontend
- Next.js 14+ (React framework)
- React components with TypeScript
- Modern UI components with responsive design

### Backend
- Node.js runtime
- Next.js API routes
- TypeScript for type safety

### Database
- MariaDB relational database
- Structured schema with referential integrity

### DevOps
- Environment configuration via .env files
- Database initialization and seeding scripts
- Cron jobs for scheduled tasks like feed updates

## Security Considerations

1. Password hashing with salt for secure storage
2. Session-based authentication with secure cookies
3. Input validation and sanitization
4. SQL injection protection via parameterized queries
5. Role-based access control for protected operations
