"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workspace_controller_1 = __importDefault(require("../controllers/workspace.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const { createWorkspace } = new workspace_controller_1.default();
router.route("/workspace").post(auth_1.AuthMiddleware, createWorkspace);
exports.default = router;
