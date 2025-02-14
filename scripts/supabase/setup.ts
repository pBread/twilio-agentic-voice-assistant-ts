import { createClient } from "@supabase/supabase-js";
import "dotenv-flow/config";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_PROJECT_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables (SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY)"
  );
}

// Create Supabase client with service role key for full database access
const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqlDir = path.join(__dirname, "../sql");

async function executeSqlFile(fileName: string) {
  console.log(`Executing ${fileName}...`);
  const sqlPath = path.join(sqlDir, fileName);
  const sqlContent = readFileSync(sqlPath, "utf-8");

  // Split the SQL content into individual statements
  const statements = sqlContent
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  try {
    for (const statement of statements) {
      const { error } = await supabase.query(statement);
      if (error) throw error;
    }
    console.log(`Completed ${fileName}`);
  } catch (error) {
    console.error(`Error in ${fileName}:`, error);
    throw error;
  }
}

async function setupDatabase() {
  try {
    const files = [
      "config.sql", // first

      "users.sql", // before catalog
      "catalog.sql",
    ];

    for (const file of files) {
      await executeSqlFile(file);
    }

    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

setupDatabase();
