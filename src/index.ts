import express from "express";
import cors from "cors";
import { PORT } from "./constant/constants";
import dotenv from "dotenv";
dotenv.config();
const app = express();

// Enable CORS

app.options("*", cors({
  origin: "http://localhost:3000",
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
import auth from "./routes/auth.route";
import workspace from "./routes/workspace.route";
import project from "./routes/project.route";
import task from "./routes/task.route";
import member from "./routes/member.route";
import common from "./routes/common.route";

app.use("/api/v1/auth", auth);
app.use("/api/v1/workspace", workspace);
app.use("/api/v1/project", project);
app.use("/api/v1/task", task);
app.use("/api/v1/member", member);
app.use("/api/v1", common);

import { sendEmail } from "./utils/sendEmail";

app.get("/send",async () => {
  await sendEmail({
    to: "amanverma9452@gmail.com",
    subject: "Hello from Node + TS ✅",
    text: "This is a plain text email",
    html: "<h2>Hello 👋</h2><p>This email is sent from <b>Node + TypeScript</b></p>"
  });
});


app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
export default app;