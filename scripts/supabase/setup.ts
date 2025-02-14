import { createClient } from "@supabase/supabase-js";
import "dotenv-flow/config";
import { readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const { SUPABASE_PROJECT_URL, SUPABASE_API_KEY } = process.env;
if (!SUPABASE_PROJECT_URL || !SUPABASE_API_KEY)
  throw new Error(
    "Missing Supabase environment variables (SUPABASE_PROJECT_URL, SUPABASE_API_KEY)"
  );

const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqlDir = path.join(__dirname, "../sql");

async function executeSqlFile(fileName: string) {
  console.log(`Executing ${fileName}...`);
  const sqlPath = path.join(sqlDir, fileName);
  const sqlContent = readFileSync(sqlPath, "utf-8");

  try {
    const { error } = await supabase.functions.invoke("setup-database", {
      body: { sql: sqlContent },
    });

    if (error) throw error;
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
      "users.sql", // user before catalog
      "catalog.sql",
    ];

    for (const file of files) await executeSqlFile(file);

    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

setupDatabase();
