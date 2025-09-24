"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkspaceSchema = exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, { message: "Workspace name cannot be empty" }),
});
exports.updateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: "Workspace name cannot be empty" }).optional(),
});
