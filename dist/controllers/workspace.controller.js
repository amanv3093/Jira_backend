"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const workspace_type_1 = require("../type/workspace.type");
class WorkspaceController {
    constructor() {
        //****************************************  Login  *****************************************/
        this.createWorkspace = (0, express_async_handler_1.default)(async (req, res) => {
            const { name } = workspace_type_1.createWorkspaceSchema.parse(req.body);
            if (name) {
                res.status(400).json({ error: "Workspace is required" });
                return;
            }
            //    const workspace = await prisma.workspace.create({
            //       data: {
            //         name,
            //         ownerId: user.id,
            //       },
            //     });
            // res.status(200).json({
            //   accessToken,
            //   refreshToken,
            //   user: {
            //     id: user.id,
            //     email: user.email,
            //     first_name: user.first_name,
            //     last_name: user.last_name,
            //     role: user.role,
            //   },
            // });
        });
    }
}
exports.default = WorkspaceController;
