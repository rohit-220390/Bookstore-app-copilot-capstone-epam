import { createAppServer } from './app-server.js';
import { seedBooks } from '../catalog/seed-data.js';

const port = Number(process.env.PORT ?? 3000);
const server = createAppServer(seedBooks);
server.listen(port, () => {
  console.log(`bookstore-app listening on port ${port} (UI at /, API at /api/search)`);
});
