import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const FREE_MEMBER_LIMIT = 10;

class SubscriptionController {
  //******** Create Checkout Session *********/
  public createCheckoutSession = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const { workspaceId } = req.body;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        if (!workspaceId) {
          res.status(400).json({ error: "workspaceId is required" });
          return;
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          res.status(404).json({ error: "Workspace not found" });
          return;
        }

        // Only workspace owner can upgrade
        if (workspace.ownerId !== user.id) {
          res.status(403).json({ error: "Only workspace owner can upgrade the plan" });
          return;
        }

        if (workspace.plan === "PRO") {
          res.status(400).json({ error: "Workspace is already on the Pro plan" });
          return;
        }

        // Create or reuse Stripe customer
        let customerId = workspace.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.full_name,
            metadata: {
              workspaceId: workspace.id,
              userId: user.id,
            },
          });
          customerId = customer.id;
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { stripeCustomerId: customerId },
          });
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Pro Plan",
                  description: "Unlimited workspace members",
                },
                unit_amount: 900, // $9.00
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          metadata: {
            workspaceId: workspace.id,
          },
          success_url: `${process.env.FRONTEND_URL}workspace/${workspaceId}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}workspace/${workspaceId}/settings?billing=cancelled`,
        });

        res.status(200).json({
          data: { url: session.url },
          message: "Checkout session created",
        });
      } catch (err) {
        console.error("Checkout error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //******** Stripe Webhook *********/
  public handleWebhook = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const workspaceId = session.metadata?.workspaceId;

          if (workspaceId && session.subscription) {
            await prisma.workspace.update({
              where: { id: workspaceId },
              data: {
                plan: "PRO",
                stripeSubscriptionId: session.subscription as string,
                maxMembers: 999,
              },
            });
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const workspace = await prisma.workspace.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });

          if (workspace) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: {
                plan: "FREE",
                stripeSubscriptionId: null,
                maxMembers: FREE_MEMBER_LIMIT,
              },
            });
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const ws = await prisma.workspace.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });

          if (ws && subscription.status === "active") {
            await prisma.workspace.update({
              where: { id: ws.id },
              data: { plan: "PRO", maxMembers: 999 },
            });
          } else if (ws && (subscription.status === "canceled" || subscription.status === "unpaid")) {
            await prisma.workspace.update({
              where: { id: ws.id },
              data: { plan: "FREE", maxMembers: FREE_MEMBER_LIMIT, stripeSubscriptionId: null },
            });
          }
          break;
        }
      }

      res.status(200).json({ received: true });
    }
  );

  //******** Get Subscription Status *********/
  public getSubscriptionStatus = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const workspaceId = req.params.workspaceId;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            id: true,
            plan: true,
            maxMembers: true,
            stripeSubscriptionId: true,
            stripeCustomerId: true,
          },
        });

        if (!workspace) {
          res.status(404).json({ error: "Workspace not found" });
          return;
        }

        // Count unique members in the workspace
        const members = await prisma.member.findMany({
          where: { workspaceId },
          select: { userId: true },
        });
        const memberCount = new Set(members.map((m) => m.userId)).size;

        res.status(200).json({
          data: {
            plan: workspace.plan,
            maxMembers: workspace.maxMembers,
            currentMembers: memberCount,
            hasSubscription: !!workspace.stripeSubscriptionId,
          },
          message: "Subscription status fetched",
        });
      } catch (err) {
        console.error("Subscription status error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //******** Create Customer Portal Session *********/
  public createPortalSession = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const { workspaceId } = req.body;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace || !workspace.stripeCustomerId) {
          res.status(400).json({ error: "No billing account found" });
          return;
        }

        if (workspace.ownerId !== user.id) {
          res.status(403).json({ error: "Only workspace owner can manage billing" });
          return;
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: workspace.stripeCustomerId,
          return_url: `${process.env.FRONTEND_URL}workspace/${workspaceId}/settings`,
        });

        res.status(200).json({
          data: { url: portalSession.url },
          message: "Portal session created",
        });
      } catch (err) {
        console.error("Portal session error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  //******** Verify Checkout Session (for local/test without webhooks) *********/
  public verifyCheckoutSession = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const { sessionId } = req.body;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        if (!sessionId) {
          res.status(400).json({ error: "sessionId is required" });
          return;
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          res.status(400).json({ error: "Payment not completed" });
          return;
        }

        const workspaceId = session.metadata?.workspaceId;
        if (!workspaceId) {
          res.status(400).json({ error: "No workspace associated with this session" });
          return;
        }

        // Verify user is the workspace owner
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace || workspace.ownerId !== user.id) {
          res.status(403).json({ error: "Unauthorized" });
          return;
        }

        // Update workspace to PRO
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            plan: "PRO",
            stripeSubscriptionId: session.subscription as string,
            maxMembers: 999,
          },
        });

        res.status(200).json({
          data: { plan: "PRO" },
          message: "Workspace upgraded to Pro successfully",
        });
      } catch (err) {
        console.error("Verify session error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

export default SubscriptionController;
