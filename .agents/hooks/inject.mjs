// SessionStart / PreInvocation: keep the role card and laws in context across long
// sessions and compactions (TEAM-8). Usage: node hooks/inject.mjs session|invocation
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { emit, gitChangedPaths, loadState, readRole, readStdin, roleCard, saveState } from './lib.mjs';

const REMINDER_EVERY = 25;
const mode = process.argv[2] ?? 'invocation';
const input = readStdin();
const conv = String(input.conversationId ?? 'unknown');
const role = readRole();
const card = roleCard(role);

const sessions = loadState('sessions.json', {});
const s = sessions[conv] ?? { invocations: 0, offset: 0, checkpoints: 0, baseline: null };

/** Count new compaction checkpoints appended to the transcript since the last call. */
function newCheckpoints(file) {
  if (!file) return 0;
  try {
    const size = statSync(file).size;
    if (size < s.offset) s.offset = 0; // transcript rotated
    if (size === s.offset) return 0;
    const fd = openSync(file, 'r');
    const buf = Buffer.alloc(size - s.offset);
    readSync(fd, buf, 0, buf.length, s.offset);
    closeSync(fd);
    s.offset = size;
    return (buf.toString('utf8').match(/"type"\s*:\s*"CHECKPOINT"/g) ?? []).length;
  } catch {
    return 0;
  }
}

const steps = [];
if (mode === 'session') {
  s.baseline = gitChangedPaths();
  steps.push({
    systemMessage: {
      systemMessage: `${card}\n\nStart: git pull, then read new messages for you in docs/team/comms/*/ (TEAM-3.3).`,
    },
  });
} else {
  s.invocations += 1;
  const fresh = newCheckpoints(input.transcriptPath);
  if (fresh > 0) {
    s.checkpoints += fresh;
    steps.push({
      systemMessage: {
        systemMessage: `Context was compacted. Your standing rules did not change. Re-read your brief before continuing.\n\n${card}`,
      },
    });
  } else if (!role) {
    steps.push({ ephemeralMessage: card });
  } else if (s.invocations % REMINDER_EVERY === 0) {
    steps.push({
      ephemeralMessage: `Hearthwild reminder (${role}): doctrine is read-only · stay in your lane · open every image you produce · cite evidence, no superlatives · end with Changed/Evidence/Gaps.`,
    });
  }
}

sessions[conv] = s;
saveState('sessions.json', sessions);
emit(steps.length ? { injectSteps: steps } : {});
