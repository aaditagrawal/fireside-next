# Project Fireside - Class Diagram

## UML Class Diagram

```
@startuml Project Fireside Class Diagram

' Database Entities
package "Database Entities" {
  class User {
    + UserID: int
    + Name: string
    + Email: string
    + PasswordHash: string
    + Role: string
    + CreatedAt: timestamp
    + LastLogin: datetime
  }

  class Feed {
    + FeedID: int
    + FeedURL: string
    + Title: string
    + Description: text
    + LastFetchedAt: datetime
    + PublisherID: int
  }

  class FeedItem {
    + ItemID: int
    + FeedID: int
    + Title: string
    + Content: mediumtext
    + PubDate: datetime
    + GUID: string
    + IsRead: boolean
    + Link: string
    + FetchedAt: timestamp
  }

  class Category {
    + CategoryID: int
    + Name: string
    + Description: text
    + ParentCategoryID: int
  }

  class Publisher {
    + PublisherID: int
    + Name: string
    + Website: string
    + LogoURL: string
    + RSSMetadata: text
  }

  class Author {
    + AuthorID: int
    + Name: string
    + Email: string
    + Bio: text
    + SocialLinks: text
  }

  class Subscription {
    + SubscriptionID: int
    + UserID: int
    + FeedID: int
    + SubscriptionDate: timestamp
  }

  class Interaction {
    + InteractionID: int
    + UserID: int
    + ItemID: int
    + Type: enum
    + Timestamp: timestamp
  }

  class Note {
    + NoteID: int
    + UserID: int
    + ItemID: int
    + Content: text
    + CreatedAt: timestamp
  }

  class Recommendation {
    + RecommendationID: int
    + UserID: int
    + CategoryID: int
    + FrecencyScore: decimal
    + LastEngaged: datetime
  }
}

' Service Classes
package "Services" {
  class AuthService {
    + registerUser(name: string, email: string, password: string): Promise<Result>
    + loginUser(email: string, password: string): Promise<Result>
    + createSession(userId: number): Promise<string>
    + validateSession(token: string): Promise<User>
    - hashPassword(password: string, salt?: string): {hash: string, salt: string}
  }

  class FeedService {
    + fetchFeed(feedUrl: string): Promise<Feed>
    + processFeed(feed: Feed): Promise<Result>
    + refreshAllFeeds(): Promise<Result>
    + getSubscribedFeeds(userId: number): Promise<Feed[]>
    + addSubscription(userId: number, feedUrl: string): Promise<Result>
    - parseFeedContent(content: string): Feed
  }

  class RecommendationService {
    + generateRecommendations(userId: number): Promise<FeedItem[]>
    + calculateUserPreferences(userId: number): Promise<CategoryScore[]>
    + getRecommendedItems(userId: number): Promise<FeedItem[]>
    - scoreFeedItems(items: FeedItem[], preferences: CategoryScore[]): ScoredItem[]
  }

  class DatabaseService {
    + executeQuery(query: string, values?: any[]): Promise<any>
    + beginTransaction(): Promise<Connection>
    + commitTransaction(connection: Connection): Promise<void>
    + rollbackTransaction(connection: Connection): Promise<void>
    - getConnection(): Promise<Connection>
  }
}

' Component Classes
package "Components" {
  class LoginForm {
    - email: string
    - password: string
    + handleSubmit(): void
    + setEmail(email: string): void
    + setPassword(password: string): void
  }

  class SignupForm {
    - name: string
    - email: string
    - password: string
    - confirmPassword: string
    + handleSubmit(): void
    + validateInputs(): boolean
  }

  class FeedItemList {
    - items: FeedItem[]
    - loading: boolean
    + loadItems(feedId?: number): void
    + renderItems(): ReactNode
    + handleItemClick(item: FeedItem): void
  }

  class ArticleViewer {
    - item: FeedItem
    - isLoading: boolean
    + loadArticle(itemId: number): void
    + renderContent(): ReactNode
    + handleInteraction(type: InteractionType): void
  }

  class AddFeedForm {
    - feedUrl: string
    - isLoading: boolean
    + handleSubmit(): void
    + validateUrl(url: string): boolean
  }
}

' Relationships
User "1" -- "0..*" Subscription
User "1" -- "0..*" Interaction
User "1" -- "0..*" Note
User "1" -- "0..*" Recommendation

Feed "1" -- "0..*" FeedItem
Feed "0..*" -- "0..*" Category

FeedItem "0..*" -- "0..*" Author
FeedItem "0..*" -- "0..*" Publisher
FeedItem "1" -- "0..*" Interaction
FeedItem "1" -- "0..*" Note

Category "0..1" -- "0..*" Category : parent
Category "1" -- "0..*" Recommendation

Publisher "1" -- "0..*" Feed

AuthService --> User : manages
FeedService --> Feed : processes
RecommendationService --> Recommendation : generates
DatabaseService --> User : persists
DatabaseService --> Feed : persists
DatabaseService --> FeedItem : persists

LoginForm ..> AuthService : uses
SignupForm ..> AuthService : uses
FeedItemList ..> FeedService : uses
ArticleViewer ..> FeedService : uses
AddFeedForm ..> FeedService : uses

@enduml
```

## Entity Relationships Explained

### User Relationships
- A User can have multiple Subscriptions to Feeds
- A User can have multiple Interactions with FeedItems
- A User can create multiple Notes on FeedItems
- A User receives multiple Recommendations based on preferences

### Feed Relationships
- A Feed belongs to one Publisher
- A Feed can have multiple FeedItems
- A Feed can be categorized into multiple Categories
- A Feed can be subscribed to by multiple Users

### FeedItem Relationships
- A FeedItem belongs to one Feed
- A FeedItem can have multiple Authors
- A FeedItem can have multiple Interactions from Users
- A FeedItem can have multiple Notes from Users

### Category Relationships
- A Category can have a parent Category (hierarchical)
- A Category can be associated with multiple Feeds
- A Category is used for generating Recommendations

## Service Layer Responsibilities

### AuthService
Handles user authentication, registration, and session management:
- User registration with secure password hashing
- User login validation
- Session creation and validation
- Password security

### FeedService
Manages all feed-related operations:
- Fetching feed content from external sources
- Parsing RSS/Atom feeds
- Processing feed items
- Managing user subscriptions

### RecommendationService
Provides personalized content recommendations:
- Analyzing user interaction patterns
- Calculating content relevance scores
- Generating personalized feed recommendations
- Refreshing recommendations based on recent activity

### DatabaseService
Provides a centralized interface for database operations:
- Executing SQL queries
- Managing database connections
- Transaction control
- Error handling

## Component Responsibilities

### LoginForm & SignupForm
Handle user authentication UI:
- Form validation
- Submit handling
- Error display

### FeedItemList
Displays feed content in a user-friendly format:
- Loading and rendering feed items
- Handling pagination
- Item selection

### ArticleViewer
Provides a rich reading experience:
- Content rendering
- User interaction tracking
- Saving and sharing options

### AddFeedForm
Allows users to add new feeds:
- URL validation
- Feed discovery
- Subscription management 