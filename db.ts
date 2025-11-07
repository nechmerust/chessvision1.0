import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { games, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Chess game queries
export async function createGame(userId: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(games).values({
    userId,
    title: title || `Game ${new Date().toISOString().split('T')[0]}`,
    pgn: "",
    moves: JSON.stringify([]),
    result: "*",
    startPosition: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Standard starting position
    currentPosition: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    isCompleted: 0,
  });

  // Return the newly created game ID
  const newGame = await db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.id)).limit(1);
  return newGame[0]?.id || 0;
}

export async function updateGame(gameId: number, updates: {
  pgn?: string;
  moves?: string[];
  result?: string;
  currentPosition?: string;
  isCompleted?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (updates.pgn !== undefined) updateData.pgn = updates.pgn;
  if (updates.moves !== undefined) updateData.moves = JSON.stringify(updates.moves);
  if (updates.result !== undefined) updateData.result = updates.result;
  if (updates.currentPosition !== undefined) updateData.currentPosition = updates.currentPosition;
  if (updates.isCompleted !== undefined) updateData.isCompleted = updates.isCompleted;

  await db.update(games).set(updateData).where(eq(games.id, gameId));
}

export async function getUserGames(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.updatedAt));
  return result;
}

export async function getGame(gameId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteGame(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(games).where(eq(games.id, gameId));
}
