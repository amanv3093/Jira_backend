import express from "express";
import cors from "cors";
import { PORT } from "./constant/constants";
import dotenv from "dotenv";
dotenv.config();
const app = express();

// Enable CORS
app.use(cors({
  origin: "http://localhost:3000", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // if you want cookies/auth
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
import auth from "./routes/auth.route";
import workspace from "./routes/workspace.route";
import project from "./routes/project.route";
import task from "./routes/task.route";
import member from "./routes/member.route";

app.use("/api/v1/auth", auth);
app.use("/api/v1/workspace", workspace);
app.use("/api/v1/project", project);
app.use("/api/v1/task", task);
app.use("/api/v1/member", member);



app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
