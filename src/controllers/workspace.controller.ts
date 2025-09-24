import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createWorkspaceSchema } from "../type/workspace.type";

class WorkspaceController {
  //****************************************  Login  *****************************************/
  public createWorkspace = expressAsyncHandler(async (req: Request, res: Response) => {
    
    const { name } = createWorkspaceSchema.parse(req.body);

    if (name) {
      res.status(400).json({ error: "Workspace is required" });
      return;
    }

   const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: user.id,
      },
    });
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
export default WorkspaceController;