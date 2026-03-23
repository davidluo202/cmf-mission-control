const fs = require('fs');
const path = 'canton-financial-test/server/_core/index.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('execSync("npx drizzle-kit push"')) {
  const insertIndex = content.indexOf('const app = express();');
  const migrationCode = `
  // Auto-migrate database on startup
  try {
    const { execSync } = require('child_process');
    console.log('[Auto-Migrate] Running database migrations...');
    if (process.env.DATABASE_URL) {
      execSync('npx drizzle-kit push', { stdio: 'inherit', env: { ...process.env } });
      console.log('[Auto-Migrate] Database migrations completed successfully.');
    } else {
      console.log('[Auto-Migrate] No DATABASE_URL found, skipping migration.');
    }
  } catch (error) {
    console.error('[Auto-Migrate] Failed to run migrations:', error.message);
    // Continue anyway, maybe tables already exist
  }
  
`;
  
  content = content.substring(0, insertIndex) + migrationCode + content.substring(insertIndex);
  fs.writeFileSync(path, content);
  console.log('Added auto-migration to index.ts');
}
