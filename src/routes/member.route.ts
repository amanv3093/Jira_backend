import { Router } from "express";
import MemberController from "../controllers/member.controller";
import { AuthMiddleware } from "../middleware/auth";


const router = Router();

const { Invite,join,getMemberByWorkspaceId,verifyInvite,removeMember,updateMemberRole} = new MemberController();

router.route("/:id").get(AuthMiddleware,getMemberByWorkspaceId);
router.route("/invite").post(AuthMiddleware,Invite);
router.route("/join").post(AuthMiddleware,join);
router.get("/verify-invite/:token", verifyInvite);
router.route("/:workspaceId/:memberId").delete(AuthMiddleware, removeMember);
router.route("/:workspaceId/:memberId/role").put(AuthMiddleware, updateMemberRole);

export default router;
