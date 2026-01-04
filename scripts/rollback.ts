#!/usr/bin/env tsx

import postgres, { PostgresError } from "postgres";
import fs from "fs";
import path from "path";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});

interface MigrationRecord {
  id: number;
  hash: string;
  created_at: number;
}

interface JournalEntry {
  tag: string;
  when: number;
  idx: number;
}

async function getCurrentMigration(): Promise<MigrationRecord | null> {
  try {
    const result = await client`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    console.log("🔍 Found migration records in DB:", result);
    return (result[0] as MigrationRecord) || null;
  } catch (e) {
    if (e instanceof PostgresError && e.code === "42P01") {
      console.log(
        "ℹ️  Could not find 'drizzle.__drizzle_migrations' table. Assuming no migrations have been applied."
      );
      return null;
    }
    console.error("❌ Error fetching current migration:", e);
    return null;
  }
}

async function findMigrationFolder(hash: string): Promise<string | null> {
  // Read the Drizzle journal to find the tag that corresponds to this migration
  // We need to match by timestamp since the DB hash and journal tag are different
  const journalPath = path.join(
    process.cwd(),
    "drizzle",
    "migrations",
    "meta",
    "_journal.json"
  );

  if (!fs.existsSync(journalPath)) {
    console.error("❌ Could not find Drizzle journal file");
    return null;
  }

  // First, get the migration record from DB to get its timestamp
  const migrationRecord = await client`
    SELECT created_at FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
  `;

  if (!migrationRecord[0]) {
    console.error(`❌ Could not find migration record for hash: ${hash}`);
    return null;
  }

  const timestamp = parseInt(migrationRecord[0].created_at);

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entry = journal.entries?.find(
    (e: JournalEntry) => e.when === timestamp
  );

  if (!entry) {
    console.error(
      `❌ Could not find migration entry for timestamp: ${timestamp}`
    );
    return null;
  }

  console.log(`🔍 Found migration: ${entry.tag} (timestamp: ${timestamp})`);

  const migrationPath = path.join(
    process.cwd(),
    "drizzle",
    "migrations",
    entry.tag
  );

  if (fs.existsSync(migrationPath)) {
    return migrationPath;
  }

  console.error(`❌ Migration folder not found for tag: ${entry.tag}`);
  return null;
}

async function executeDownMigration(migrationPath: string): Promise<boolean> {
  const downFilePath = path.join(migrationPath, "down.sql");

  if (!fs.existsSync(downFilePath)) {
    console.error(`❌ Down migration file not found: ${downFilePath}`);
    console.log("💡 Create a down.sql file manually to enable rollback");
    return false;
  }

  const downSQL = fs.readFileSync(downFilePath, "utf8").trim();

  if (!downSQL) {
    console.error("❌ Down migration file is empty");
    return false;
  }

  try {
    console.log(`🔄 Executing down migration...`);
    console.log(`📄 SQL: ${downSQL}`);

    await client.unsafe(downSQL);
    console.log("✅ Down migration executed successfully");
    return true;
  } catch (error) {
    console.error("❌ Error executing down migration:", error);
    return false;
  }
}

async function removeMigrationRecord(hash: string): Promise<void> {
  try {
    await client`
      DELETE FROM drizzle.__drizzle_migrations 
      WHERE hash = ${hash}
    `;
    console.log("🗑️  Migration record removed from database");
  } catch (error) {
    console.error("Error removing migration record:", error);
  }
}

async function deleteMigrationFiles(migrationPath: string): Promise<void> {
  const migrationName = path.basename(migrationPath);
  const migrationsDir = path.dirname(migrationPath);

  // Delete the main migration SQL file (e.g., 0001_add_users.sql)
  const mainMigrationFile = path.join(migrationsDir, `${migrationName}.sql`);
  try {
    if (fs.existsSync(mainMigrationFile)) {
      fs.unlinkSync(mainMigrationFile);
      console.log(`🗑️  Deleted migration file: ${migrationName}.sql`);
    } else {
      console.log(
        `ℹ️  Migration file ${migrationName}.sql not found (skipped)`
      );
    }
  } catch (error) {
    console.error(
      `❌ Failed to delete migration file ${migrationName}.sql:`,
      error
    );
    throw new Error(`Failed to delete migration file: ${error}`);
  }

  // Delete the migration folder and its contents (including down.sql)
  try {
    if (fs.existsSync(migrationPath)) {
      fs.rmSync(migrationPath, { recursive: true, force: true });
      console.log(`🗑️  Deleted migration folder: ${migrationName}/`);
    } else {
      console.log(`ℹ️  Migration folder ${migrationName}/ not found (skipped)`);
    }
  } catch (error) {
    console.error(
      `❌ Failed to delete migration folder ${migrationName}/:`,
      error
    );
    throw new Error(`Failed to delete migration folder: ${error}`);
  }
}

async function cleanupJournal(timestamp: number): Promise<void> {
  const journalPath = path.join(
    process.cwd(),
    "drizzle",
    "migrations",
    "meta",
    "_journal.json"
  );

  if (!fs.existsSync(journalPath)) {
    console.log("ℹ️  No journal file found to clean up");
    return;
  }

  try {
    const journalContent = fs.readFileSync(journalPath, "utf8");
    const journal = JSON.parse(journalContent);

    // Remove the entry with matching timestamp
    const originalLength = journal.entries?.length || 0;
    journal.entries =
      journal.entries?.filter(
        (entry: JournalEntry) => entry.when !== timestamp
      ) || [];

    const removedCount = originalLength - journal.entries.length;

    if (removedCount > 0) {
      fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));
      console.log(`🗑️  Cleaned up journal: removed ${removedCount} entry(s)`);
    } else {
      console.log("ℹ️  No journal entries found to remove");
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Journal file is corrupted or invalid JSON: ${error}`);
    } else {
      throw new Error(`Failed to clean up journal: ${error}`);
    }
  }
}

async function showRollbackPreview(migrationPath: string): Promise<void> {
  const migrationName = path.basename(migrationPath);
  const migrationsDir = path.dirname(migrationPath);
  const mainMigrationFile = path.join(migrationsDir, `${migrationName}.sql`);

  console.log("🔍 ROLLBACK PREVIEW - The following will happen:");
  console.log("=".repeat(50));
  console.log("1. 📄 Execute down migration SQL to undo schema changes");
  console.log("2. 🗑️  Remove migration record from database");
  console.log("3. 🗑️  DELETE the following files:");

  // Check what files actually exist
  if (fs.existsSync(mainMigrationFile)) {
    console.log(`   ❌ ${migrationName}.sql`);
  } else {
    console.log(`   ⚠️  ${migrationName}.sql (file not found - will skip)`);
  }

  if (fs.existsSync(migrationPath)) {
    console.log(`   ❌ ${migrationName}/down.sql`);

    // Check for other files in migration folder
    try {
      const folderContents = fs.readdirSync(migrationPath);
      folderContents.forEach((file) => {
        if (file !== "down.sql") {
          console.log(`   ❌ ${migrationName}/${file}`);
        }
      });
    } catch {
      console.log(`   ⚠️  Could not read folder contents`);
    }
    console.log(`   ❌ ${migrationName}/ (entire folder)`);
  } else {
    console.log(`   ⚠️  ${migrationName}/ (folder not found - will skip)`);
  }

  console.log("4. 🧹 Clean up migration journal entries");
  console.log("");
  console.log("⚠️  WARNING: This operation is IRREVERSIBLE!");
  console.log("⚠️  All migration work will be permanently deleted!");
  console.log("");
}

async function confirmRollback(): Promise<boolean> {
  console.log("🤔 Do you want to proceed with rollback?");
  console.log("⏳ You have 5 seconds to abort (Ctrl+C to cancel)");

  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r⏰ Proceeding in ${i} seconds... `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n🚀 Proceeding with rollback...");
  return true;
}

async function rollback(): Promise<void> {
  console.log("🔄 Starting rollback process...");

  const currentMigration = await getCurrentMigration();

  if (!currentMigration) {
    console.log(
      "✅ No applied migrations found in the database. Nothing to roll back."
    );
    return;
  }

  console.log(`📋 Current migration: ${currentMigration.hash}`);

  const migrationPath = await findMigrationFolder(currentMigration.hash);

  if (!migrationPath) {
    console.error("❌ Could not find migration folder. Rollback failed.");
    process.exit(1);
    return;
  }

  // Show preview and get confirmation
  await showRollbackPreview(migrationPath);
  await confirmRollback();

  // Step 1: Execute down migration (most likely to fail)
  console.log("📄 Step 1/4: Executing down migration...");
  const downSuccess = await executeDownMigration(migrationPath);
  if (!downSuccess) {
    console.error("❌ Down migration failed. Rollback aborted.");
    console.error("💡 Database state unchanged. Migration files preserved.");
    process.exit(1);
  }

  // Step 2: Remove database record (point of no return for DB)
  console.log("🗄️  Step 2/4: Removing database record...");
  try {
    await removeMigrationRecord(currentMigration.hash);
  } catch (error) {
    console.error("❌ Failed to remove database record:", error);
    console.error(
      "🚨 CRITICAL: Down migration succeeded but DB cleanup failed!"
    );
    console.error("💡 Manual intervention may be required.");
    process.exit(1);
  }

  // Step 3: Delete migration files (recoverable failure)
  console.log("🗑️  Step 3/4: Deleting migration files...");
  try {
    await deleteMigrationFiles(migrationPath);
  } catch (error) {
    console.error("⚠️  Warning: Failed to delete migration files:", error);
    console.error("💡 Database rollback succeeded, but files remain.");
    console.error("💡 You may need to manually delete migration files.");
    // Continue to journal cleanup - don't exit here
  }

  // Step 4: Clean up journal (recoverable failure)
  console.log("📋 Step 4/4: Cleaning up journal...");
  try {
    await cleanupJournal(currentMigration.created_at);
  } catch (error) {
    console.error("⚠️  Warning: Failed to clean up journal:", error);
    console.error(
      "💡 Database rollback succeeded, but journal may be inconsistent."
    );
    // Don't exit here - rollback is essentially complete
  }

  console.log("🎉 Rollback completed!");
  console.log(
    "💡 Migration has been rolled back. Create a new migration if needed."
  );
}

// Run rollback
rollback()
  .catch(console.error)
  .finally(() => client.end());
