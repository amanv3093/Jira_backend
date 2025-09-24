"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const client_1 = require("@prisma/client");
const jwt_1 = require("../lib/jwt");
const prisma = new client_1.PrismaClient();
const AuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        req.user = user; // attach user to request
        next(); // pass control to next middleware or route handler
    }
    catch (err) {
        console.error(err);
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.AuthMiddleware = AuthMiddleware;
