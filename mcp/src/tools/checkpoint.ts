import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import * as z from 'zod/v4';
import { Bridge } from "../bridge";
import { textResult } from "../utils/tool-result";
import { toolHandler } from './handler';

export function registerCheckpointTools(server: McpServer, bridge: Bridge) {
    server.registerTool(
        'list_checkpoints',
        {
            title: 'List EasyEDA Checkpoints',
            description: 'List saved checkpoints with names, newest first. Defaults to limit 16 and offset 0; use offset to page through older checkpoints.',
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: z.object({
                limit: z.number().int().min(1).max(512).optional(),
                offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
            }),
        },
        toolHandler(bridge, async ({ limit, offset }) => {
            const result = await bridge.requestEasyEda('checkpoint-list', { limit, offset });
            return textResult(result);
        }),
    );

    server.registerTool(
        'save_checkpoint_for_current_page',
        {
            title: 'Save EasyEDA Checkpoint',
            description: 'Save a checkpoint for the current EasyEDA document. Give it a short descriptive name for recovery; only describe checks as passed after verification. Restore by the returned ID, even when names match.',
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: z.object({
                name: z.string().trim().max(200).optional(),
            }),
        },
        toolHandler(bridge, async ({ name }) => {
            const result = await bridge.requestEasyEda('checkpoint-save', { name });
            return textResult(result);
        }),
    );

    server.registerTool(
        'restore_checkpoint_for_current_page',
        {
            title: 'Restore EasyEDA Checkpoint',
            description: 'Restore one checkpoint by id in EasyEDA.',
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            inputSchema: z.object({
                id: z.string().optional(),
            }),
        },
        toolHandler(bridge, async ({ id }) => {
            const result = await bridge.requestEasyEda('checkpoint-restore', { checkpointId: id });
            return textResult(result);
        }),
    );
}
