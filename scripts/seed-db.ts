#!/usr/bin/env ts-node
/*
  Seed script to populate all tables via RSS feeds & synthetic data
  Run with: npx ts-node scripts/seed-db.ts
*/
import 'dotenv/config';
import pool, { executeQuery } from '../src/lib/db';
import { registerUser } from '../src/lib/auth';
import { createSession } from '../src/lib/session';
import { processFeed } from '../src/lib/rss-parser';

// Sample RSS feed URLs
const FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://hnrss.org/frontpage',
  'https://xkcd.com/rss.xml',
];

async function main() {
  console.log('Starting DB seeding...');
  // 1. Create test user
  const reg = await registerUser({ name: 'Seed User', email: `seed_${Date.now()}@example.com`, password: 'SeedPass123!' });
  if (!reg.success || !reg.user) throw new Error('User registration failed');
  const userId = reg.user.id;
  console.log('Created user ID', userId);

  // 2. Create session record
  const token = await createSession(userId);
  console.log('Session token created');

  // 3. Process each feed and auto-subscribe
  for (const url of FEEDS) {
    const res = await processFeed(url, userId);
    console.log(`Processed feed ${url}:`, res.message);
  }

  // 4. Fetch all feed items
  const items: any[] = await executeQuery({ query: 'SELECT ItemID FROM FeedItems', values: [] });
  const itemIDs = items.map(r => r.ItemID).filter(Boolean);

  // 5. Generate interactions & notes & saved
  const TYPES = ['read','like','share','save','hide','note'];
  for (const id of itemIDs) {
    // pick 2 random types per item
    const picks = TYPES.sort(() => Math.random()-0.5).slice(0,2);
    for (const type of picks) {
      await executeQuery({ query: 'INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, ?)', values: [userId, id, type] });
      if (type === 'note') {
        await executeQuery({ query: 'INSERT INTO Notes (UserID, ItemID, Content) VALUES (?, ?, ?)', values: [userId, id, 'Auto-generated note'] });
      }
      if (type === 'save') {
        await executeQuery({ query: 'INSERT IGNORE INTO User_FeedItems (UserID, ItemID) VALUES (?, ?)', values: [userId, id] });
      }
    }
  }
  console.log('Interactions, notes, saved items seeded');

  // 6. Seed recommendations by category
  const cats: any[] = await executeQuery({ query: 'SELECT CategoryID FROM Categories', values: [] });
  for (const c of cats) {
    const score = Math.random() * 100;
    await executeQuery({ query: 'INSERT INTO Recommendations (UserID, CategoryID, FrecencyScore, LastEngaged) VALUES (?, ?, ?, ?)', values: [userId, c.CategoryID, score, new Date()] });
  }
  console.log('Recommendations seeded');

  await pool.end();
  console.log('DB seeding completed successfully');
}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
