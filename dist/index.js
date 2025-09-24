"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const constants_1 = require("./constant/constants");
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
const auth_route_1 = __importDefault(require("./routes/auth.route"));
app.use("/api/v1/auth", auth_route_1.default);
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
app.listen(constants_1.PORT, () => console.log(`Server is running on PORT ${constants_1.PORT}`));
