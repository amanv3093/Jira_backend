"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const constants_1 = require("./src/constant/constants");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Enable CORS
app.use((0, cors_1.default)({
    origin: "http://localhost:3000", // frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // if you want cookies/auth
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Routes
const auth_route_1 = __importDefault(require("./src/routes/auth.route"));
const workspace_route_1 = __importDefault(require("./src/routes/workspace.route"));
const project_route_1 = __importDefault(require("./src/routes/project.route"));
const task_route_1 = __importDefault(require("./src/routes/task.route"));
const member_route_1 = __importDefault(require("./src/routes/member.route"));
app.use("/api/v1/auth", auth_route_1.default);
app.use("/api/v1/workspace", workspace_route_1.default);
app.use("/api/v1/project", project_route_1.default);
app.use("/api/v1/task", task_route_1.default);
app.use("/api/v1/member", member_route_1.default);
app.listen(constants_1.PORT, () => console.log(`Server is running on PORT ${constants_1.PORT}`));
