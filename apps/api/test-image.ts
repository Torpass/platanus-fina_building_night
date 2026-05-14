import "dotenv/config";
import { apifyService } from "./src/services/apify.service";

async function run() {
  const res = await apifyService.scrapeProfile("nomadastours.ve", 1);
  console.log(res.posts[0]);
}
run();
