import { createClient } from "@supabase/supabase-js";
import "dotenv-flow/config";
import fsp from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const { SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_SERVICE_ROLE_KEY)
  throw Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_PROJECT_URL) throw Error("Missing SUPABASE_PROJECT_URL");

const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqlDir = path.join(__dirname, "../sql");

async function executeSql(file: string) {
  console.log(`Executing ${file}...`);
  const filePath = path.join(sqlDir, file);

  try {
    const query = await fsp.readFile(filePath, "utf-8");
    const { data, error } = await supabase.rpc("exec_sql", { query });

    if (error) throw error;
    console.log(`Successfully executed ${file}`);
  } catch (error) {
    console.error(`Error executing ${file}:`, error);
    throw error;
  }
}

async function setupDatabase() {
  console.log("Starting database setup...");

  const files = [
    "config.sql", // first

    "users.sql", // before catalog
    "catalog.sql",
  ];

  try {
    for (const file of files) await executeSql(file);
    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
