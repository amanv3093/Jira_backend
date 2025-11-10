import { Router } from "express";
import MemberController from "../controllers/member.controller";
import { AuthMiddleware } from "../middleware/auth";
import CommonController from "../controllers/common.controller";


const router = Router();

const { } = new CommonController();

// router.route("/:id").get(AuthMiddleware,getMemberByWorkspaceId);



export default router;
