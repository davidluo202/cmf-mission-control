const fs = require('fs');
const path = 'canton-financial-test/server/newsRouter.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('debugDb')) {
  const mutationToAdd = `
  debugDb: publicProcedure.query(async () => {
    return {
      hasUrl: !!process.env.DATABASE_URL,
      urlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : null,
    };
  }),
`;
  
  content = content.replace('export const newsRouter = router({', 'export const newsRouter = router({' + mutationToAdd);
  fs.writeFileSync(path, content);
  console.log('Added debugDb to newsRouter.ts');
}
