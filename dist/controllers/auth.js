"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
const validation_1 = require("../lib/validation");
const api_response_1 = require("../utils/api-response");
class AuthController {
    constructor() {
        //****************************************  Login  *****************************************/
        this.login = (0, express_async_handler_1.default)(async (req, res) => {
            if (req.method !== "POST") {
                res.status(405).end();
                return;
            }
            const parsed = validation_1.loginSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors });
                return;
            }
            const { email, password } = parsed.data;
            if (!email || !password) {
                res.status(400).json({ error: "Email and password required" });
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }
            const valid = await bcrypt_1.default.compare(password, user.passwordHash);
            if (!valid) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }
            const accessToken = (0, jwt_1.signAccessToken)({ sub: user.id, role: user.role });
            const refreshToken = (0, jwt_1.signRefreshToken)({ sub: user.id });
            await prisma_1.prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                },
            });
            res.status(200).json({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                },
            });
        });
        //****************************************  signup  *****************************************/
        this.signup = (0, express_async_handler_1.default)(async (req, res) => {
            if (req.method !== "POST") {
                res.status(405).end();
                return;
            }
            const parsed = validation_1.signupSchema.safeParse(req.body);
            if (!parsed.success) {
                const errors = parsed.error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                }));
                return (0, api_response_1.sendResponse)(res, 400, null, "Validation failed", errors);
            }
            const { email, password, first_name, last_name } = parsed.data;
            const existing = await prisma_1.prisma.user.findFirst({
                where: {
                    email: email,
                },
            });
            if (existing) {
                res.status(409).json({ error: "User already exists" });
                return;
            }
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
            const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
            const user = await prisma_1.prisma.user.create({
                data: {
                    email,
                    first_name,
                    last_name,
                    fullname: `${first_name} ${last_name}`,
                    passwordHash,
                },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                    isEmailVerified: true,
                    createdAt: true,
                },
            });
            res.status(201).json({ user });
        });
    }
}
exports.default = AuthController;
