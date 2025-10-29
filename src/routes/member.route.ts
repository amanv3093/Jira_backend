import { Router } from "express";
import MemberController from "../controllers/member.controller";
import { AuthMiddleware } from "../middleware/auth";


const router = Router();

const { Invite,join,getMemberByWorkspaceId,verifyInvite} = new MemberController();

router.route("/:id").get(AuthMiddleware,getMemberByWorkspaceId);
router.route("/invite").post(AuthMiddleware,Invite);
router.route("/join").post(AuthMiddleware,join);
router.get("/verify-invite/:token", verifyInvite);


export default router;
