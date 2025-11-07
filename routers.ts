import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createGame, deleteGame, getGame, getUserGames, updateGame } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Chess game management
  game: router({
    // Create a new game
    create: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const gameId = await createGame(ctx.user.id, input.title);
        return { gameId };
      }),

    // Get all user's games
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserGames(ctx.user.id);
    }),

    // Get a specific game
    get: protectedProcedure
      .input(z.object({ gameId: z.number() }))
      .query(async ({ input }) => {
        return await getGame(input.gameId);
      }),

    // Update game (add moves, update position, etc.)
    update: protectedProcedure
      .input(
        z.object({
          gameId: z.number(),
          pgn: z.string().optional(),
          moves: z.array(z.string()).optional(),
          result: z.string().optional(),
          currentPosition: z.string().optional(),
          isCompleted: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { gameId, ...updates } = input;
        await updateGame(gameId, updates);
        return { success: true };
      }),

    // Delete a game
    delete: protectedProcedure
      .input(z.object({ gameId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGame(input.gameId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
