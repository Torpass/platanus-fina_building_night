import "dotenv/config";
import { supabase } from "./src/services/supabase.service";

async function run() {
  const { data, error } = await supabase.from("posts").select("id, image_url, caption").limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
