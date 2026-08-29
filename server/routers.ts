import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createRepositoryStaticScan, createScenarioRun, getExportPayload, getScanDetail, listUserScans, saveMoscaAssumptions } from "./ecdat";
import { buildCopilotOutputSchema, buildCryptoAnalystPrompt, parseCopilotReply } from "./ecdatCopilot";
import { buildSeededPreviewExport } from "./ecdatPreviewExport";
import { getSeededScenario, scenarioCatalog, scenarioIds } from "./ecdatSeed";
import { invokeLLM } from "./_core/llm";
import { RepositoryScanError } from "./scanners/repositoryScanner";

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
  ecdat: router({
    scenarioCatalog: publicProcedure.query(() =>
      scenarioCatalog.map(({ findings, recommendations, relationships, waves, ...scenario }) => ({
        ...scenario,
        sampledFindingCount: findings.length,
      }))
    ),
    preview: publicProcedure
      .input(z.object({ scenario: z.enum(scenarioIds) }).optional())
      .query(({ input }) => getSeededScenario(input?.scenario ?? "python-web")),
    previewExport: publicProcedure
      .input(z.object({ scenario: z.enum(scenarioIds) }).optional())
      .query(({ input }) => buildSeededPreviewExport(getSeededScenario(input?.scenario ?? "python-web"))),
    runDemo: protectedProcedure
      .input(z.object({ scenario: z.enum(scenarioIds), repositoryUrl: z.string().url().optional() }))
      .mutation(({ ctx, input }) => createScenarioRun(ctx.user.id, input.scenario, input.repositoryUrl)),
    scanRepository: protectedProcedure
      .input(z.object({ repositoryUrl: z.string().url().max(500) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const detail = await createRepositoryStaticScan(ctx.user.id, input.repositoryUrl);
          return { status: "completed" as const, detail };
        } catch (error) {
          if (error instanceof RepositoryScanError) {
            return { status: "unavailable" as const, message: error.code === "access" ? "That public GitHub repository could not be read. Check that the repository exists and is publicly accessible." : error.message };
          }
          if (error instanceof Error && error.message.startsWith("No supported cryptographic source")) {
            return { status: "unavailable" as const, message: error.message };
          }
          throw error;
        }
      }),
    scans: protectedProcedure.query(({ ctx }) => listUserScans(ctx.user.id)),
    detail: protectedProcedure
      .input(z.object({ scanKey: z.string().min(1) }))
      .query(({ ctx, input }) => getScanDetail(ctx.user.id, input.scanKey)),
    saveMoscaAssumptions: protectedProcedure
      .input(
        z.object({
          scanKey: z.string().min(1),
          dataLifetimeYears: z.number().min(1).max(100),
          migrationMonths: z.number().min(1).max(120),
          crqcHorizonYears: z.number().min(1).max(100),
        })
      )
      .mutation(({ ctx, input }) => saveMoscaAssumptions(ctx.user.id, input)),
    export: protectedProcedure
      .input(z.object({ scanKey: z.string().min(1) }))
      .query(({ ctx, input }) => getExportPayload(ctx.user.id, input.scanKey)),
    chat: protectedProcedure
      .input(z.object({
        scanKey: z.string().min(1),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1400) })).min(1).max(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const detail = await getScanDetail(ctx.user.id, input.scanKey);
        const findingKeys = detail.findings.map(finding => finding.findingKey);
        const response = await invokeLLM({
          model: "gpt-5-mini",
          outputSchema: buildCopilotOutputSchema(findingKeys),
          messages: [
            { role: "system", content: buildCryptoAnalystPrompt(detail) },
            ...input.messages.map(message => ({ role: message.role, content: message.content })),
          ],
        });
        const raw = response.choices[0]?.message.content;
        return parseCopilotReply(typeof raw === "string" ? raw : "", findingKeys);
      }),
  }),
});

export type AppRouter = typeof appRouter;
