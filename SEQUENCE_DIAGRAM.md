# Project Fireside - Sequence Diagram

## Feed Subscription Sequence Diagram

This sequence diagram illustrates the flow of operations when a user adds a new RSS feed to their subscriptions.

```
@startuml Feed Subscription Sequence

actor User
participant "AddFeedForm\nComponent" as AddForm
participant "Next.js API\nRoute" as API
participant "FeedService" as FeedSvc
participant "RSS Parser" as Parser
participant "Database\nService" as DB
database "MariaDB" as MariaDB

User -> AddForm : Enter feed URL
activate AddForm

AddForm -> AddForm : Validate URL format
AddForm -> API : POST /api/feeds/add\n{url, userId}
activate API

API -> FeedSvc : addSubscription(userId, feedUrl)
activate FeedSvc

FeedSvc -> Parser : fetchFeed(feedUrl)
activate Parser
Parser -> Parser : Make HTTP request to feed URL
Parser -> Parser : Parse XML/JSON response
Parser --> FeedSvc : Return parsed feed data
deactivate Parser

FeedSvc -> DB : Begin transaction
activate DB
DB -> MariaDB : START TRANSACTION
activate MariaDB

' Check if feed exists
FeedSvc -> DB : Check if feed exists in database
DB -> MariaDB : SELECT * FROM Feeds WHERE FeedURL = ?
MariaDB --> DB : Return results
DB --> FeedSvc : Return feed or null

alt Feed doesn't exist
    ' Process publisher
    FeedSvc -> DB : Check if publisher exists
    DB -> MariaDB : SELECT * FROM Publishers WHERE Name = ?
    MariaDB --> DB : Return results
    DB --> FeedSvc : Return publisher or null
    
    alt Publisher doesn't exist
        FeedSvc -> DB : Create new publisher
        DB -> MariaDB : INSERT INTO Publishers
        MariaDB --> DB : Return new publisherId
        DB --> FeedSvc : Return new publisherId
    end
    
    ' Create new feed
    FeedSvc -> DB : Insert new feed
    DB -> MariaDB : INSERT INTO Feeds
    MariaDB --> DB : Return new feedId
    DB --> FeedSvc : Return new feedId
    
    ' Process categories
    loop For each category in feed
        FeedSvc -> DB : Check if category exists
        DB -> MariaDB : SELECT * FROM Categories WHERE Name = ?
        MariaDB --> DB : Return results
        DB --> FeedSvc : Return category or null
        
        alt Category doesn't exist
            FeedSvc -> DB : Create new category
            DB -> MariaDB : INSERT INTO Categories
            MariaDB --> DB : Return new categoryId
            DB --> FeedSvc : Return new categoryId
        end
        
        FeedSvc -> DB : Associate feed with category
        DB -> MariaDB : INSERT INTO Feed_Categories
        MariaDB --> DB : Confirm insertion
    end
    
    ' Process feed items
    loop For each item in feed
        FeedSvc -> DB : Check if item exists by GUID
        DB -> MariaDB : SELECT * FROM FeedItems WHERE GUID = ?
        MariaDB --> DB : Return results
        DB --> FeedSvc : Return item or null
        
        alt Item doesn't exist
            FeedSvc -> DB : Insert new feed item
            DB -> MariaDB : INSERT INTO FeedItems
            MariaDB --> DB : Return new itemId
            DB --> FeedSvc : Return new itemId
            
            ' Process authors
            loop For each author of the item
                FeedSvc -> DB : Check if author exists
                DB -> MariaDB : SELECT * FROM Authors WHERE Name = ?
                MariaDB --> DB : Return results
                DB --> FeedSvc : Return author or null
                
                alt Author doesn't exist
                    FeedSvc -> DB : Create new author
                    DB -> MariaDB : INSERT INTO Authors
                    MariaDB --> DB : Return new authorId
                    DB --> FeedSvc : Return new authorId
                end
                
                FeedSvc -> DB : Associate item with author
                DB -> MariaDB : INSERT INTO FeedItemAuthors
                MariaDB --> DB : Confirm insertion
            end
        end
    end
else Feed exists
    ' Use existing feedId
    FeedSvc -> FeedSvc : Use existing feedId
end

' Create subscription
FeedSvc -> DB : Subscribe user to feed
DB -> MariaDB : INSERT INTO Subscriptions (UserID, FeedID)
MariaDB --> DB : Confirm insertion
DB --> FeedSvc : Subscription created

' Commit transaction
FeedSvc -> DB : Commit transaction
DB -> MariaDB : COMMIT
MariaDB --> DB : Transaction committed
deactivate MariaDB
DB --> FeedSvc : Transaction completed
deactivate DB

FeedSvc --> API : Return success response
deactivate FeedSvc

API --> AddForm : Return API response
deactivate API

AddForm --> User : Show success message
deactivate AddForm

@enduml
```

## Process Description

The sequence diagram above illustrates the process flow when a user adds a new feed to their subscriptions:

1. **User Interaction**: The user enters a feed URL in the AddFeedForm component.

2. **Client-Side Validation**: The form component validates the URL format before making an API request.

3. **API Request**: The form submits a POST request to the Next.js API route, including the feed URL and user ID.

4. **Feed Service**: The API calls the FeedService's addSubscription method.

5. **Feed Fetching**: The FeedService uses the RSS Parser to fetch and parse the remote feed.

6. **Transaction Management**: A database transaction is started to ensure data consistency.

7. **Feed Processing**: 
   - Checks if the feed already exists in the database
   - If new, processes the feed publisher information
   - Creates feed record if needed
   - Associates the feed with appropriate categories
   - Processes all feed items, including authors and content

8. **Subscription Creation**: Creates a subscription record linking the user to the feed.

9. **Transaction Completion**: Commits the database transaction.

10. **Response Flow**: Success response is returned through the API to the user interface.

This sequence demonstrates the complex processing involved in adding a feed, which requires coordination between multiple services and ensures data integrity through transaction management. 