import { spawnSync } from 'child_process';

/** Binary override (absolute path or name on PATH). */
export function resolveOpenClawBinary(): string {
  const v = process.env.OPENCLAW_BIN?.trim();
  return v && v.length > 0 ? v : 'openclaw';
}

export type OpenClawAgentInvokeOptions = {
  message: string;
  agent?: string;
  sessionId?: string;
  thinking?: string;
  deliver?: boolean;
  local?: boolean;
  to?: string;
  replyChannel?: string;
  replyTo?: string;
};

/**
 * Builds argv for `openclaw agent`.
 * @see https://docs.openclaw.ai/cli/agent
 */
export function buildOpenClawAgentArgs(opts: OpenClawAgentInvokeOptions): string[] {
  const args: string[] = ['agent', '--message', opts.message];
  if (opts.agent) {
    args.push('--agent', opts.agent);
  }
  if (opts.sessionId) {
    args.push('--session-id', opts.sessionId);
  }
  if (opts.thinking) {
    args.push('--thinking', opts.thinking);
  }
  if (opts.deliver) {
    args.push('--deliver');
  }
  if (opts.local) {
    args.push('--local');
  }
  if (opts.to) {
    args.push('--to', opts.to);
  }
  if (opts.replyChannel) {
    args.push('--reply-channel', opts.replyChannel);
  }
  if (opts.replyTo) {
    args.push('--reply-to', opts.replyTo);
  }
  return args;
}

/**
 * Runs OpenClaw and returns the exit code (0 = success).
 */
export function runOpenClawAgent(opts: OpenClawAgentInvokeOptions): number {
  const bin = resolveOpenClawBinary();
  const args = buildOpenClawAgentArgs(opts);
  const result = spawnSync(bin, args, { stdio: 'inherit' });

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.error(
        `Command not found: "${bin}". Install the OpenClaw CLI (e.g. npm install -g openclaw) or set OPENCLAW_BIN.`
      );
      return 127;
    }
    console.error(err.message);
    return 1;
  }

  if (result.signal) {
    console.error(`openclaw exited with signal ${result.signal}`);
    return 1;
  }

  return result.status ?? 0;
}
