/**
 * The connectors, from inside a chat: one `@deepseek-ai/dsh-mcp-client` per
 * connection the Connectors page made, mounted here in the agent's scope so
 * its tools arrive as `mcp__<server>__<tool>` like any other MCP server's. The
 * client is pointed at the connectors service's loopback proxy, which holds
 * the credential; a connection that changes (a new token, a tool switched off,
 * a disconnect) is remounted or dropped as it happens. A preset row, like
 * Reach; it needs the host row `dsh-ceis/connectors`.
 */
import type { Context, Fiber } from '@deepseek-ai/cordis'
import * as mcpClient from '@deepseek-ai/dsh-mcp-client'
import type {} from './connectors.ts'

export const name = 'ceis-connectors-tools'
export const inject = ['tools', 'ceisConnectors']

export function apply(ctx: Context): void {
  const connectors = ctx.ceisConnectors
  const mounted = new Map<string, { version: number; fiber: Fiber }>()

  const sync = () => {
    const live = new Map(connectors.live().map((c) => [c.id, c]))
    for (const [id, entry] of mounted) {
      const current = live.get(id)
      if (current && current.version === entry.version) continue
      mounted.delete(id)
      void entry.fiber.dispose().catch((error: unknown) => ctx.logger.warn('ceis connectors: unmount %s: %s', id, error instanceof Error ? error.message : String(error)))
    }
    for (const c of live.values()) {
      if (mounted.has(c.id)) continue
      try {
        const fiber = ctx.plugin(mcpClient as unknown as Parameters<Context['plugin']>[0], connectors.clientConfig(c))
        mounted.set(c.id, { version: c.version, fiber })
      } catch (error) {
        ctx.logger.warn('ceis connectors: mount %s: %s', c.label, error instanceof Error ? error.message : String(error))
      }
    }
  }

  sync()
  ctx.effect(() => connectors.onChange(sync), 'ceis connectors: follow the page')
}
