import { describe, test, expect } from '@jest/globals';
import { buildOpenClawAgentArgs, resolveOpenClawBinary } from '../openclaw-cli';

describe('openclaw-cli', () => {
  test('buildOpenClawAgentArgs minimal', () => {
    expect(buildOpenClawAgentArgs({ message: 'hello' })).toEqual([
      'agent',
      '--message',
      'hello',
    ]);
  });

  test('buildOpenClawAgentArgs with options', () => {
    expect(
      buildOpenClawAgentArgs({
        message: 'Summarize',
        agent: 'coder',
        sessionId: '42',
        thinking: 'medium',
        deliver: true,
        local: true,
        to: '+15555550123',
        replyChannel: 'slack',
        replyTo: '#reports',
      })
    ).toEqual([
      'agent',
      '--message',
      'Summarize',
      '--agent',
      'coder',
      '--session-id',
      '42',
      '--thinking',
      'medium',
      '--deliver',
      '--local',
      '--to',
      '+15555550123',
      '--reply-channel',
      'slack',
      '--reply-to',
      '#reports',
    ]);
  });

  test('resolveOpenClawBinary respects OPENCLAW_BIN', () => {
    process.env.OPENCLAW_BIN = '/opt/openclaw/bin/openclaw';
    expect(resolveOpenClawBinary()).toBe('/opt/openclaw/bin/openclaw');
    delete process.env.OPENCLAW_BIN;
    expect(resolveOpenClawBinary()).toBe('openclaw');
  });
});
