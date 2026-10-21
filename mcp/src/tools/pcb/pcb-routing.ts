import { TIMEOUT_POLICY } from '@copilot/shared/timeout-policy';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import * as z from 'zod/v4';
import type { Bridge } from '../../bridge';
import { runPcbRouterDsl } from '../../routing/routing-operation';
import { ROUTER_DSL_DOC_PATH, SKILL_DOC_PATH } from '../../utils/dirs';
import { textResult } from '../../utils/tool-result';
import { targetedToolHandler } from '../handler';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RawPcbSchema } from '@copilot/shared/types/pcb/raw';
import { PcbDrcBundleSchema } from '@copilot/shared/types/pcb/drc';
import { importEasyEdaBoardV2 } from '../../routing/easyeda-board-v2';

const DEFAULT_ROUTING_WAIT_MS = TIMEOUT_POLICY.mutationWaitMs;

export function registerPcbRoutingTools(server: McpServer, bridge: Bridge) {
    server.registerTool('export_pcb_routing_board', {
        title: 'Export PCB RoutingBoard V2',
        description: 'Read the current PCB into the backend RoutingBoardV2 contract. Save board, diagnostics and native capture in a JSON file for export audits. Does not route, refill or modify the PCB. Keep the PCB unchanged during the sequential CAD reads. Reload a V2-capable extension first.',
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: z.object({ file: z.string().min(1).describe('Output JSON path; its parent directory must exist.') }),
    }, targetedToolHandler(bridge, async ({ file }) => {
        const capture = await bridge.requestEasyEda('export-routing-input', { version: 2 }) as Record<string, unknown>;
        if (typeof capture?.text !== 'string') throw new Error('EasyEDA returned no autoroute JSON');
        const path = resolve(file);
        // Retain the native evidence even when conversion finds an unsupported structure.
        await writeFile(path, `${JSON.stringify({ capture })}\n`, 'utf8');
        if (!capture.pcb) throw new Error(`RoutingBoard V2 native capture is unavailable. Reload the extension. Native response saved to ${path}`);
        const { board, diagnostics } = importEasyEdaBoardV2(JSON.parse(capture.text), RawPcbSchema().parse(capture.pcb), PcbDrcBundleSchema().parse(capture.drc));
        await writeFile(path, `${JSON.stringify({ board, diagnostics, capture })}\n`, 'utf8');
        return textResult({ file: path, components: board.components.length, pads: board.pads.length,
            tracks: board.copper.fixed.tracks.length, vias: board.copper.fixed.vias.length, zones: board.copper.fixed.zones.length, diagnostics });
    }));
    server.registerTool(
        'run_pcb_router_dsl',
        {
            title: 'Run PCB Router DSL',
            description: `Apply DRC, copper-only, or routing intent from an eda-copilot-router DSL file to the currently opened EasyEDA PCB. Long work returns an operation_id for wait_operation. PCB instructions: ${SKILL_DOC_PATH}. Authoritative router DSL declarations: ${ROUTER_DSL_DOC_PATH}`,
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            inputSchema: z.object({
                file: z.string().min(1).describe('Path to a JavaScript PCB routing DSL file.'),
                wait_ms: z.number().int().min(1_000).max(TIMEOUT_POLICY.operationWaitMaxMs).default(DEFAULT_ROUTING_WAIT_MS)
                    .describe('Initial synchronous wait before returning a pcb-dsl operation_id.'),
            }),
        },
        targetedToolHandler(bridge, async ({ file, wait_ms }) => textResult(await runPcbRouterDsl(
            bridge,
            file,
            wait_ms ?? DEFAULT_ROUTING_WAIT_MS,
        ))),
    );
}
