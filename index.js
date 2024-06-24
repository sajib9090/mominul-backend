import { port } from "./important.js";
import app from "./src/app/app.js";
import connectDB from "./src/app/config/db.js";

app.listen(port, async () => {
  console.log(`backend app listening on port ${port}`);
  await connectDB();
});
