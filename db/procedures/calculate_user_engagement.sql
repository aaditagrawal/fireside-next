DELIMITER / / CREATE PROCEDURE CalculateUserEngagement (IN user_id INT) BEGIN DECLARE total_reads INT DEFAULT 0;

DECLARE total_saves INT DEFAULT 0;

DECLARE favorite_category VARCHAR(255);

DECLARE avg_daily_reads DECIMAL(10, 2);

SELECT
    COUNT(*) INTO total_reads
FROM
    Interactions
WHERE
    UserID = user_id
    AND Type = 'read';

SELECT
    COUNT(*) INTO total_saves
FROM
    Interactions
WHERE
    UserID = user_id
    AND Type = 'save';

-- Find favorite category
SELECT
    c.Name INTO favorite_category
FROM
    Interactions i
    JOIN FeedItems fi ON i.ItemID = fi.ItemID
    JOIN Feeds f ON fi.FeedID = f.FeedID
    JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
    JOIN Categories c ON fc.CategoryID = c.CategoryID
WHERE
    i.UserID = user_id
GROUP BY
    c.Name
ORDER BY
    COUNT(*) DESC
LIMIT
    1;

SELECT
    COALESCE(COUNT(*) / 30, 0) INTO avg_daily_reads
FROM
    Interactions
WHERE
    UserID = user_id
    AND Type = 'read'
    AND Timestamp >= DATE_SUB (CURDATE (), INTERVAL 30 DAY);

SELECT
    total_reads AS TotalReads,
    total_saves AS TotalSaves,
    favorite_category AS FavoriteCategory,
    avg_daily_reads AS AvgDailyReads,
    CASE
        WHEN total_reads > 100
        AND total_saves > 20 THEN 'Power User'
        WHEN total_reads > 50
        OR total_saves > 10 THEN 'Active User'
        WHEN total_reads > 0 THEN 'Casual Reader'
        ELSE 'New User'
    END AS EngagementLevel,
    (total_reads * 1) + (total_saves * 5) + (avg_daily_reads * 10) AS EngagementScore;

END / / DELIMITER;
