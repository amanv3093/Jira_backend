"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Email is required and must be valid" }),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters long"),
    first_name: zod_1.z.string({ required_error: "First name is required" }),
    last_name: zod_1.z.string({ required_error: "Last name is required" }),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
