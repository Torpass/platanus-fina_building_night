import "dotenv/config";

import { createServer } from "./server";

// Import workers to register them (side-effect)
import "./workers/scraping-worker";
import "./workers/analysis-worker";

const PORT = process.env.PORT || 3001;

const app = createServer();

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Workers initialized: scraping-worker, analysis-worker`);
});
