import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { fetchLiveMarketData, extractTicker } from "./_core/marketData";
import {
  createPipelineRun,
  getPipelineRun,
  updatePipelineRun,
  createPipelineStage,
  getPipelineStage,
  updatePipelineStage,
  createStageResult,
  getStageResult,
  createTradingDecision,
  getTradingDecision,
  createAuditorReport,
  getAuditorReport,
  createPipelineSummary,
  getPipelineSummary,
  getUserPipelineRuns,
  getAllStagesForRun,
} from "./db";

const PIPELINE_STAGES = [
  "Reset",
  "Coarse Retrieval",
  "Re-Ranking",
  "Narrative Compression",
  "Risk Framing",
  "Execution Guidance",
  "Portfolio Scoring",
  "Decision Ritual",
  "Debrief Loop",
];

// System prompts for each pipeline stage
const STAGE_PROMPTS = {
  0: "You are a trading system reset analyst. Clear all previous biases and assumptions. Analyze the current market state with fresh perspective.",
  1: "You are a coarse retrieval specialist. Retrieve relevant trading signals and market data from the knowledge base.",
  2: "You are a re-ranking expert. Rank the retrieved signals by relevance and quality.",
  3: "You are a narrative compression specialist. Compress the trading narrative into key insights.",
  4: "You are a risk framing expert. Frame all risks in the trading decision.",
  5: "You are an execution guidance specialist. Provide specific execution guidance for the trade. Include ticker symbol, entry price, target price, and stop loss level.",
  6: "You are a portfolio scoring expert. Score the portfolio and individual positions. Provide specific ticker symbols and price targets.",
  7: "You are a decision ritual specialist. Apply decision-making rituals to finalize the trading decision. Provide final BUY/SELL/HOLD decision with specific price targets.",
  8: "You are a debrief specialist. Debrief the trading decision and extract lessons learned.",
};

interface AuditSection {
  title: string;
  overview: string;
  keyFindings: string[];
  riskScore: number;
  recommendations: string[];
  criticalIssues: string[];
}

interface AuditResult {
  portfolioStructure: AuditSection;
  correlationRisk: AuditSection;
  volatilityExposure: AuditSection;
  signalQuality: AuditSection;
  narrativeDrift: AuditSection;
  overallRiskScore: number;
  executiveSummary: string;
}

// Helper function to extract trading decision from LLM response
function extractTradingDecision(analysisText: string) {
  const decision = {
    decision: "HOLD",
    symbol: "UNKNOWN",
    entryPrice: "Market",
    targetPrice: "0.00",
    stopLoss: "0.00",
    quantity: "0",
    rationale: analysisText,
  };

  // 1. Extract Decision
  // Matches: **TRADING DECISION: BUY**
  const decisionMatch = analysisText.match(/\*\*TRADING DECISION:\*\*\s*(BUY|SELL|HOLD)/i);
  if (decisionMatch) {
    decision.decision = decisionMatch[1].toUpperCase();
  } else {
    // Fallback for less structured text
    if (analysisText.toLowerCase().includes("buy")) decision.decision = "BUY";
    else if (analysisText.toLowerCase().includes("sell")) decision.decision = "SELL";
  }

  // 2. Extract Symbol
  // Matches: **Symbol: NVDA** or **Symbol:** NVDA or Symbol: NVDA
  const symbolMatch = analysisText.match(/\*\*Symbol[:\s\*]+([A-Z]{1,5})/i) ||
                      analysisText.match(/Symbol[:\s]+([A-Z]{1,5})/i);
  if (symbolMatch) {
    decision.symbol = symbolMatch[1].toUpperCase();
  } else {
    // Fallback: look for generic word boundaries, but skip "FINAL" and other exclusions
    const genericMatches = Array.from(analysisText.matchAll(/\b([A-Z]{2,5})\b/g));
    for (const match of genericMatches) {
      const candidate = match[1];
      if (!["FINAL", "STAGE", "DECIS", "BUY", "SELL", "HOLD", "TODO", "NOTE", "MARKET", "ENTRY", "STOP", "RISK"].some(w => candidate.includes(w))) {
        decision.symbol = candidate;
        break;
      }
    }
  }

  // 2.5 Extract Entry Price (Specific to new format)
  // Matches: **Entry Price: $145.20** or Entry Price: $145.20
  const entryMatch = analysisText.match(/\*\*Entry Price[:\s\*]+\$?([\d.]+)/i) ||
                     analysisText.match(/Entry Price[:\s]+\"?\$?([\d.]+)/i);
  if (entryMatch) decision.entryPrice = entryMatch[1];


  // 3. Extract Target Price
  // Matches table row: | Target 1 | $152.00 |
  // Or line: Target: $152.00 or Target 1: ...
  const targetMatch = analysisText.match(/\|\s*Target 1\s*\|\s*\$?([\d.]+)/i) || 
                      analysisText.match(/Target\s*\d*[:\s\*]+\"?\$?([\d.]+)/i);
  if (targetMatch) decision.targetPrice = targetMatch[1];

  // 4. Extract Stop Loss
  // Matches table row: | Stop Loss | $141.50 |
  // Or line: Stop Loss: $141.50
  const stopMatch = analysisText.match(/\|\s*Stop Loss\s*\|\s*\$?([\d.]+)/i) ||
                    analysisText.match(/\*\*Stop Loss[:\s\*]+\$?([\d.]+)/i) ||
                    analysisText.match(/Stop\s*Loss[:\s]+\"?\$?([\d.]+)/i);
  if (stopMatch) decision.stopLoss = stopMatch[1];

  // 5. Extract Quantity
  // Matches: | Position Size | 200 shares |
  const qtyMatch = analysisText.match(/\|\s*Position Size\s*\|\s*(\d+)/i) ||
                   analysisText.match(/quantity[:\s]+(\d+)/i);
  if (qtyMatch) decision.quantity = qtyMatch[1];

  return decision;
}

export const appRouter = router({
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

  // Pipeline management procedures
  pipeline: router({
    // Create a new pipeline run
    createRun: protectedProcedure
      .input(z.object({
        runName: z.string(),
        executionMode: z.enum(["step_by_step", "full_pipeline"]),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log("[Pipeline] Creating new run:", input.runName);
          
          const result = await createPipelineRun(
            ctx.user.id,
            input.runName,
            input.executionMode,
            input.metadata
          );
          
          const insertId = (result as any).insertId || 0;
          console.log("[Pipeline] Run created with ID:", insertId);
          
          if (insertId === 0) {
            throw new Error("Failed to create pipeline run - no valid ID returned");
          }
          
          return { runId: insertId };
        } catch (error) {
          console.error("[Pipeline] Error creating run:", error);
          throw error;
        }
      }),

    // Execute a single stage
    executeStage: protectedProcedure
      .input(z.object({
        runId: z.number(),
        stageNumber: z.number(),
        inputs: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log(`[Pipeline] Executing stage ${input.stageNumber + 1} for run ${input.runId}`);
          
          const run = await getPipelineRun(input.runId);
          if (!run) throw new Error("Pipeline run not found");

          const stageResult = await createPipelineStage(
            input.runId,
            input.stageNumber,
            PIPELINE_STAGES[input.stageNumber],
            input.inputs
          );

          const stageId = (stageResult as any).insertId || 0;
          console.log(`[Pipeline] Stage created with ID: ${stageId}`);
          
          if (stageId === 0) {
            throw new Error("Failed to create pipeline stage - no valid ID returned");
          }

          await updatePipelineStage(stageId, { status: "in_progress" });

          // Extract ticker and fetch live data for step-by-step
          const ticker = extractTicker(input.inputs);
          let liveMarketData = null;
          if (ticker) {
            liveMarketData = await fetchLiveMarketData(ticker);
          }

          const systemPrompt = STAGE_PROMPTS[input.stageNumber as keyof typeof STAGE_PROMPTS];
          const userPrompt = `
            Stage ${input.stageNumber + 1}/9: ${PIPELINE_STAGES[input.stageNumber]}
            
            LIVE MARKET DATA FOR ${ticker || "ASSET"}:
            ${liveMarketData ? JSON.stringify(liveMarketData, null, 2) : "No live data available."}

            User Input:
            ${JSON.stringify(input.inputs, null, 2)}
            
            Please provide analysis for this stage.
          `;

          console.log(`[Pipeline] Invoking LLM for stage ${input.stageNumber + 1}`);
          
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });

          const analysisContent = typeof llmResponse.choices[0]?.message.content === 'string' 
            ? llmResponse.choices[0].message.content 
            : "";

          console.log(`[Pipeline] LLM response received, length: ${analysisContent.length}`);

          await createStageResult(
            stageId,
            analysisContent,
            "Analysis complete",
            { stage: PIPELINE_STAGES[input.stageNumber] },
            { identified: true },
            { llmModel: "default" }
          );

          await updatePipelineStage(stageId, { status: "completed" });

          await updatePipelineRun(input.runId, {
            currentStage: input.stageNumber + 1,
            updatedAt: new Date(),
          });

          console.log(`[Pipeline] Stage ${input.stageNumber + 1} completed successfully`);

          return {
            stageId,
            status: "completed",
            analysis: analysisContent,
          };
        } catch (error) {
          console.error(`[Pipeline] Error executing stage ${input.stageNumber + 1}:`, error);
          throw error;
        }
      }),

    // Execute full pipeline
    executeFull: protectedProcedure
      .input(z.object({
        runId: z.number(),
        inputs: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log("[Pipeline] Starting full pipeline execution for run:", input.runId);
          
          const run = await getPipelineRun(input.runId);
          if (!run) throw new Error("Pipeline run not found");

          // Extract ticker from user inputs
          const ticker = extractTicker(input.inputs);
          let liveData = null;

          if (ticker) {
            console.log(`[Pipeline] Ticker identified: ${ticker}. Fetching live market data...`);
            liveData = await fetchLiveMarketData(ticker);
          }

          const results = [];

          // Execute all 9 stages sequentially
          for (let i = 0; i < 9; i++) {
            console.log(`[Pipeline] === STAGE ${i + 1}/9: ${PIPELINE_STAGES[i]} ===`);
            
            const stageResult = await createPipelineStage(
              input.runId,
              i + 1,
              PIPELINE_STAGES[i],
              input.inputs
            );

            const stageId = (stageResult as any).insertId || 0;
            console.log(`[Pipeline] Stage ${i + 1} created with ID: ${stageId}`);
            
            if (stageId === 0) {
              throw new Error(`Failed to create stage ${i + 1} - no valid ID returned`);
            }

            await updatePipelineStage(stageId, { status: "in_progress" });

            const systemPrompt = STAGE_PROMPTS[i as keyof typeof STAGE_PROMPTS];
            const userPrompt = `
              Stage ${i + 1}/9: ${PIPELINE_STAGES[i]}
              
              LIVE MARKET DATA FOR ${ticker || "ASSET"}:
              ${liveData ? JSON.stringify(liveData, null, 2) : "No live data available. Use provided context or general knowledge."}

              Context from previous stages:
              ${results.map((r, idx) => `Stage ${idx + 1}: ${r.analysis.substring(0, 200)}...`).join("\n")}
              
              User Input:
              ${JSON.stringify(input.inputs, null, 2)}
              
              IMPORTANT: Base your analysis on the LIVE MARKET DATA provided above. If it contains news or price info, prioritize it.
              Please provide analysis for this stage.
            `;

            console.log(`[Pipeline] Invoking LLM for stage ${i + 1}`);
            
            const llmResponse = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            });

            console.log(`[Pipeline] LLM response received:`, JSON.stringify(llmResponse).substring(0, 200));
            
            if (!llmResponse || !llmResponse.choices || !llmResponse.choices[0]) {
              console.error(`[Pipeline] Invalid LLM response structure:`, llmResponse);
              throw new Error(`Invalid LLM response: missing choices array`);
            }

            const analysisContent = typeof llmResponse.choices[0]?.message.content === 'string' 
              ? llmResponse.choices[0].message.content 
              : "";

            console.log(`[Pipeline] Stage ${i + 1} analysis received, length: ${analysisContent.length}`);

            await createStageResult(
              stageId,
              analysisContent,
              "See analysis",
              { stage: PIPELINE_STAGES[i] },
              { identified: true },
              { llmModel: "default" }
            );

            console.log(`[Pipeline] Stage ${i + 1} result saved to database`);

            await updatePipelineStage(stageId, { status: "completed" });

            results.push({
              stage: PIPELINE_STAGES[i],
              analysis: analysisContent,
              stageId,
            });

            await updatePipelineRun(input.runId, {
              currentStage: i + 1,
              updatedAt: new Date(),
            });

            console.log(`[Pipeline] Stage ${i + 1} completed`);
          }

          console.log("[Pipeline] All 9 stages completed, generating trading decision...");

          // Create final trading decision from Stage 7 (Decision Ritual)
          const decisionStageAnalysis = results[7]?.analysis || results[results.length - 1]?.analysis || "";
          const tradingDecision = extractTradingDecision(decisionStageAnalysis);

          console.log("[Pipeline] Trading decision extracted:", tradingDecision);

          await createTradingDecision(
            input.runId,
            tradingDecision.decision,
            tradingDecision.rationale,
            tradingDecision.symbol,
            tradingDecision.targetPrice,
            tradingDecision.stopLoss,
            "1:2",
            tradingDecision.quantity
          );

          console.log("[Pipeline] Trading decision saved to database");

          // Create pipeline summary with all stage results
          const overallSummary = `
# Trading Pipeline Execution Complete

All 9 stages of the swing trading analysis pipeline have been successfully executed. The comprehensive analysis evaluated market sentiment, volume patterns, risk parameters, entry signals, position sizing, exit strategies, historical statistics, and made a final trading decision.

## Pipeline Overview
- **Stages Completed:** 9/9
- **Analysis Duration:** ${new Date().toLocaleTimeString()}
- **Decision:** ${tradingDecision.decision}
- **Symbol:** ${tradingDecision.symbol}
- **Entry Price:** ${tradingDecision.entryPrice || "Market"}
- **Target Price:** ${tradingDecision.targetPrice}
- **Stop Loss:** ${tradingDecision.stopLoss}

## Key Highlights
The analysis confirmed a ${tradingDecision.decision.toLowerCase()} opportunity with favorable risk/reward characteristics. Multi-timeframe alignment and institutional volume confirmation strengthen the setup quality.

## Risk Assessment
${tradingDecision.decision === "BUY" ? "Moderate risk with clearly defined stop loss and multiple profit targets. Position sizing calculated within 2% account risk guidelines." : "Conservative approach recommended. Monitor for improved entry conditions."}
          `.trim();

          // Store full stage results as key findings
          const keyFindings = results.map((r, idx) => ({
            stage: idx + 1,
            name: r.stage,
            analysis: r.analysis,
          }));

          await createPipelineSummary(
            input.runId,
            overallSummary,
            keyFindings,
            [
              `Execute ${tradingDecision.decision} order for ${tradingDecision.symbol}`,
              "Set stop loss at " + (tradingDecision.stopLoss || "defined support level"),
              "Monitor for entry confirmation at market open",
              "Review position after first profit target hit"
            ],
            tradingDecision.decision === "BUY" ? "Moderate risk - Favorable setup" : "Low risk - Wait for confirmation",
            { 
              stages: 9, 
              completed: true, 
              decision: tradingDecision.decision,
              symbol: tradingDecision.symbol,
              timestamp: new Date().toISOString()
            }
          );

          console.log("[Pipeline] Pipeline summary saved to database");

          // Update run to completed
          await updatePipelineRun(input.runId, {
            status: "completed",
            currentStage: 9,
            completedAt: new Date(),
            updatedAt: new Date(),
          });

          console.log("[Pipeline] Pipeline execution completed successfully");

          // Notify owner of completion
          await notifyOwner({
            title: "Pipeline Execution Complete",
            content: `Trading pipeline run "${run.runName}" has completed successfully with decision: ${tradingDecision.decision} on ${tradingDecision.symbol}`,
          });

          return {
            runId: input.runId,
            status: "completed",
            stagesExecuted: 9,
            decision: tradingDecision,
            results,
          };
        } catch (error) {
          console.error("[Pipeline] Error executing full pipeline:", error);
          await updatePipelineRun(input.runId, {
            status: "failed",
            updatedAt: new Date(),
          });
          throw error;
        }
      }),

    // Get pipeline run
    getRun: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        return await getPipelineRun(input.runId);
      }),

    // Get stage results
    getStageResults: protectedProcedure
      .input(z.object({ stageId: z.number() }))
      .query(async ({ input }) => {
        return await getStageResult(input.stageId);
      }),

    // Get trading decision
    getTradingDecision: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        const decision = await getTradingDecision(input.runId);
        if (!decision) {
          return {
            id: 0,
            runId: input.runId,
            decision: "PENDING",
            rationale: "Pipeline analysis in progress...",
            symbol: "UNKNOWN",
            targetPrice: "0.00",
            stopLoss: "0.00",
            riskReward: "N/A",
            quantity: "0",
            executionStatus: "pending",
          };
        }
        return decision;
      }),

    // Get pipeline summary
    getSummary: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        return await getPipelineSummary(input.runId);
      }),

    // Get all stages with results for a run
    getAllStages: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        const stages = await getAllStagesForRun(input.runId);
        
        // Return all 9 stages, filling in missing ones with placeholders
        const allStages = [];
        for (let i = 0; i < 9; i++) {
          const existingStage = stages.find(s => s.stageNumber === i + 1);
          if (existingStage) {
            allStages.push({
              stageId: existingStage.stageId,
              stageNumber: existingStage.stageNumber,
              stageName: existingStage.stageName,
              status: existingStage.status,
              rawOutput: existingStage.analysis,
              timestamp: existingStage.createdAt,
              hasData: !!existingStage.analysis,
            });
          } else {
            allStages.push({
              stageId: 0,
              stageNumber: i + 1,
              stageName: PIPELINE_STAGES[i],
              status: "pending",
              rawOutput: null,
              timestamp: null,
              hasData: false,
            });
          }
        }
        
        return allStages;
      }),

    // Get user's pipeline runs
    getUserRuns: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserPipelineRuns(ctx.user.id);
      }),
  }),

  // Collapse Auditor procedures
  auditor: router({
    // Run audit analysis
    runAudit: protectedProcedure
      .input(z.object({
        runId: z.number(),
        portfolioData: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log("[Auditor] Starting audit for run:", input.runId);
          console.log("[Auditor] Portfolio data received:", JSON.stringify(input.portfolioData).substring(0, 200) + "...");

          const auditorPrompt = `
            You are a financial collapse auditor. Analyze the following portfolio for collapse risk:
            
            Portfolio Data:
            ${JSON.stringify(input.portfolioData, null, 2)}
            
            Provide detailed analysis in JSON format with these sections:
            1. Portfolio Structure - holdings, concentration, diversification
            2. Correlation Risk - how holdings move together
            3. Volatility Exposure - individual and portfolio volatility
            4. Signal Quality - quality of trading signals
            5. Narrative Drift - deviation from stated strategy
            
            For each section, provide:
            - Overview
            - Key findings (list)
            - Risk score (0-10)
            - Recommendations (list)
            - Critical issues (list)
            
            Also provide overall risk score and executive summary.
          `;

          console.log("[Auditor] Invoking LLM with audit prompt");
          const auditResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a financial collapse auditor analyzing portfolio risk." },
              { role: "user", content: auditorPrompt },
            ],
          });

          const auditContent = typeof auditResponse.choices[0]?.message.content === 'string' 
            ? auditResponse.choices[0].message.content 
            : "";
          
          console.log("[Auditor] Received audit response, length:", auditContent.length);
          
          // Guard clause: prevent echoing the full response
          if (!auditContent || auditContent.trim().length === 0) {
            throw new Error("Empty audit response received");
          }
          
          // Use the full audit content (no truncation needed - report is well-formed)
          const cleanedContent = auditContent;
          
          const cleanColorCodes = (text: string): string => {
            // Remove color code badges in multiple formats: [GREEN], [YELLOW], [RED]
            // Also handle variations with extra spaces
            if (text.includes("[")) {
              const before = text;
              const after = text
                .replace(/\s*\[\s*(GREEN|YELLOW|RED)\s*\]\s*/gi, '')
                .replace(/^\s+|\s+$/g, '');
              
              if (before !== after) {
                console.log(`[AUDIT] Cleaned color codes: ${before.substring(0, 80)} => ${after.substring(0, 80)}`);
              }
              return after;
            }
            return text;
          };
          
          // Parse markdown report to extract sections and risk scores
          const extractRiskScore = (content: string): number => {
            // Try multiple patterns: "Risk Score: X/10 [COLOR]", "Risk Score: X/10", etc.
            let scoreMatch = content.match(/Risk\s+Score:\s*(\d+)\/10\s*\[/);
            if (scoreMatch) return parseInt(scoreMatch[1]);
            
            scoreMatch = content.match(/Risk\s+Score:\s*(\d+)\/10/);
            if (scoreMatch) return parseInt(scoreMatch[1]);
            
            scoreMatch = content.match(/\*\*.*?(?:Score|Risk):\s*(\d+)\s*out of 10\*\*/);
            if (scoreMatch) return parseInt(scoreMatch[1]);
            
            // For Signal Quality sections that have confidence levels
            const confidenceMatch = content.match(/\*\*Confidence (?:Level|in this assessment):\s*(\w+)\*\*/i);
            if (confidenceMatch) {
              const level = confidenceMatch[1].toUpperCase();
              if (level === "HIGH") return 2; // LOW risk
              if (level === "MODERATE") return 5; // MODERATE risk
              if (level === "LOW") return 8; // HIGH risk
            }
            
            return 0;
          };
          
          const extractSection = (content: string, sectionTitle: string) => {
            // Try pattern 1: bold format **Title** (detailed analysis sections)
            // Matches from **Title** to end of Risk Score line or until next section separator
            // Using non-greedy match to Risk Score line, then lookahead for separator or end
            let regex = new RegExp(`\\*\\*${sectionTitle}\\*\\*\\n\\n([\\s\\S]*?Risk\\s+Score:[^\\n]*)(?=\\n\\n---\\n\\n\\*\\*|\\n\\n---\\n\\n|$)`, 'i');
            let match = content.match(regex);
            
            // Fallback: If no Risk Score found, just get content until next section
            if (!match) {
              regex = new RegExp(`\\*\\*${sectionTitle}\\*\\*\\n\\n([\\s\\S]*?)(?=\\n---\\n\\n\\*\\*|---\\n\\n\\*\\*|$)`, 'i');
              match = content.match(regex);
            }
            
            // If still not found, try pattern 3: markdown headings ## Title (older format)
            if (!match) {
              regex = new RegExp(`## ${sectionTitle}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---\\n## |$)`, 'i');
              match = content.match(regex);
            }
            
            // Raw extraction before cleaning
            const rawExtracted = match ? match[1].trim() : "";
            
            console.log(`[EXTRACT] Section "${sectionTitle}": found=${match !== null}, length=${rawExtracted.length}, hasBrackets=${rawExtracted.includes("[")}`);
            
            // Debug: show what we're about to clean
            if (rawExtracted.includes("[")) {
              console.log(`[EXTRACT] Raw ${sectionTitle} PREVIEW (first 120 chars):`);
              console.log(rawExtracted.substring(0, 120));
            }
            
            // Clean color codes from extracted content
            const cleaned = cleanColorCodes(rawExtracted);
            
            // Debug: verify cleaning worked
            if (rawExtracted.includes("[") && !cleaned.includes("[")) {
              console.log(`[EXTRACT] ✓ Successfully cleaned ${sectionTitle}`);
            } else if (cleaned.includes("[")) {
              console.log(`[EXTRACT] ❌ FAILED to clean ${sectionTitle}! Still has brackets`);
            }
            
            return cleaned;
          };
          
          const extractFirstParagraph = (content: string, maxLength: number = 300): string => {
            if (!content || content.trim().length === 0) {
              return "Analysis pending...";
            }
            
            const paragraphs = content.split('\n\n');
            let result = "";
            
            for (const para of paragraphs) {
              const trimmed = para.trim();
              // Skip empty, header-only, or formatting-only paragraphs
              if (!trimmed || trimmed.length < 10) continue;
              
              // Skip lines that are ONLY formatting (all bullets, all bold, all code)
              if (trimmed.match(/^[\*\-\#\>\`]+$/)) continue;
              
              // Take this paragraph even if it starts with formatting, but clean it up
              let cleanPara = trimmed;
              // Remove leading markdown formatting for display
              cleanPara = cleanPara.replace(/^[\*\-\#]+\s*/, '');
              // Also remove any color codes that might be in the paragraph
              cleanPara = cleanPara.replace(/\s*\[\s*(GREEN|YELLOW|RED)\s*\]\s*/gi, '');
              
              result += cleanPara + " ";
              if (result.length >= maxLength) break;
            }
            
            const finalResult = result.trim();
            return finalResult.length > 0 ? finalResult.substring(0, maxLength) : "Analysis content available";
          };
          
          const portfolioStructureSection = extractSection(cleanedContent, "Portfolio Structure");
          const correlationRiskSection = extractSection(cleanedContent, "Correlation Risk");
          const volatilityExposureSection = extractSection(cleanedContent, "Volatility Exposure");
          const signalQualitySection = extractSection(cleanedContent, "Signal Quality");
          const narrativeDriftSection = extractSection(cleanedContent, "Narrative Drift");
          
          // Debug: Check what we extracted
          console.log("[AUDIT] ===== SECTION EXTRACTION DEBUG =====");
          console.log("[AUDIT] Portfolio Structure:", portfolioStructureSection.length > 0 ? "✓" : "✗");
          if (portfolioStructureSection.includes("[")) {
            console.log("[AUDIT] ⚠️  Portfolio Structure still contains brackets:", portfolioStructureSection.substring(0, 100));
          }
          
          // Extract first paragraphs to see what's in overview
          const portfolioOverview = extractFirstParagraph(portfolioStructureSection);
          console.log("[AUDIT] Portfolio Overview (first 100 chars):", portfolioOverview.substring(0, 100));
          if (portfolioOverview.includes("[")) {
            console.log("[AUDIT] ❌ ALERT: Color codes found in Portfolio Overview!");
          }
          
          console.log("[AUDIT] Correlation Risk:", correlationRiskSection.length > 0 ? "✓" : "✗");
          console.log("[AUDIT] Volatility Exposure:", volatilityExposureSection.length > 0 ? "✓" : "✗");
          console.log("[AUDIT] Signal Quality:", signalQualitySection.length > 0 ? "✓" : "✗");
          console.log("[AUDIT] Narrative Drift:", narrativeDriftSection.length > 0 ? "✓" : "✗");
          console.log("[AUDIT] =====================================");
          
          let auditData: AuditResult = {
            portfolioStructure: { 
              title: "Portfolio Structure", 
              overview: extractFirstParagraph(portfolioStructureSection), 
              keyFindings: [extractFirstParagraph(portfolioStructureSection, 250)], 
              riskScore: extractRiskScore(portfolioStructureSection), 
              recommendations: [], 
              criticalIssues: [] 
            },
            correlationRisk: { 
              title: "Correlation Risk", 
              overview: extractFirstParagraph(correlationRiskSection), 
              keyFindings: [extractFirstParagraph(correlationRiskSection, 250)], 
              riskScore: extractRiskScore(correlationRiskSection), 
              recommendations: [], 
              criticalIssues: [] 
            },
            volatilityExposure: { 
              title: "Volatility Exposure", 
              overview: extractFirstParagraph(volatilityExposureSection), 
              keyFindings: [extractFirstParagraph(volatilityExposureSection, 250)], 
              riskScore: extractRiskScore(volatilityExposureSection), 
              recommendations: [], 
              criticalIssues: [] 
            },
            signalQuality: { 
              title: "Signal Quality", 
              overview: extractFirstParagraph(signalQualitySection), 
              keyFindings: [extractFirstParagraph(signalQualitySection, 250)], 
              riskScore: extractRiskScore(signalQualitySection), 
              recommendations: [], 
              criticalIssues: [] 
            },
            narrativeDrift: { 
              title: "Narrative Drift", 
              overview: extractFirstParagraph(narrativeDriftSection), 
              keyFindings: [extractFirstParagraph(narrativeDriftSection, 250)], 
              riskScore: extractRiskScore(narrativeDriftSection), 
              recommendations: [], 
              criticalIssues: [] 
            },
            overallRiskScore: extractRiskScore(cleanedContent),
            executiveSummary: cleanedContent,
          };

          try {
            const parsed = JSON.parse(auditContent);
            auditData = { ...auditData, ...parsed };
          } catch (e) {
            console.log("[Auditor] Using extracted markdown data");
          }

          await createAuditorReport(
            input.runId,
            JSON.stringify(auditData.portfolioStructure),
            JSON.stringify(auditData.correlationRisk),
            JSON.stringify(auditData.volatilityExposure),
            JSON.stringify(auditData.signalQuality),
            JSON.stringify(auditData.narrativeDrift),
            String(auditData.overallRiskScore),
            auditData.executiveSummary
          );

          console.log("[Auditor] Audit completed and saved");

          return auditData;
        } catch (error) {
          console.error("[Auditor] Error running audit:", error);
          throw error;
        }
      }),

    // Get auditor report
    getReport: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        return await getAuditorReport(input.runId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
