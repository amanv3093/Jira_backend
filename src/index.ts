import express from "express";
import cors from "cors";
import { PORT } from "./constant/constants";
import dotenv from "dotenv";
dotenv.config();
const app = express();

// Enable CORS

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
}));

// Stripe webhook needs raw body — must be before express.json()
import SubscriptionController from "./controllers/subscription.controller";
const { handleWebhook } = new SubscriptionController();
app.post("/api/v1/subscription/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
import auth from "./routes/auth.route";
import workspace from "./routes/workspace.route";
import project from "./routes/project.route";
import task from "./routes/task.route";
import member from "./routes/member.route";
import common from "./routes/common.route";
import dashboard from "./routes/dashboard.route";
import subscription from "./routes/subscription.route";
import user from "./routes/user.route";
import sprint from "./routes/sprint.route";
import ai from "./routes/ai.route";

app.use("/api/v1/auth", auth);
app.use("/api/v1/workspace", workspace);
app.use("/api/v1/project", project);
app.use("/api/v1/task", task);
app.use("/api/v1/member", member);
app.use("/api/v1/dashboard", dashboard);
app.use("/api/v1/subscription", subscription);
app.use("/api/v1/user", user);
app.use("/api/v1/sprint", sprint);
app.use("/api/v1/ai", ai);
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

import { startDueDateReminderCron } from "./cron/dueDateReminder";

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startDueDateReminderCron();
});
export default app;