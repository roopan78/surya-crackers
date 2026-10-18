import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { releaseTokenEnabled, releaseTokenMisconfigured } from './middleware/releaseToken.middleware';
import { purgeExpiredAccounts, RETENTION_DAYS } from './services/account.service';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Surya Crackers API listening on port ${env.PORT} [${env.NODE_ENV}]`);

  // Said out loud at boot because the alternative is a publish that 401s with a
  // deliberately vague message — the route will not tell a caller whether the
  // token is wrong or the feature is off, so the operator is told here instead.
  if (releaseTokenMisconfigured()) {
    console.warn(
      'APP_RELEASE_TOKEN is set but too short to be used (needs 32+ characters). ' +
        'Release-token publishing is DISABLED; publishing still works with an admin session.',
    );
  } else {
    console.log(`Release-token publishing: ${releaseTokenEnabled() ? 'enabled' : 'disabled'}`);
  }
});

/**
 * Deletes accounts whose 90 days have run out. A plain daily timer rather than
 * a scheduler service: the sweep is a single indexed query that almost always
 * finds nothing, and tying it to the API means there is no second thing to
 * deploy, pay for, or forget. It runs shortly after boot as well, so a restart
 * is never a missed day.
 *
 * `unref()` keeps the timer from holding the process open during shutdown.
 */
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PURGE_STARTUP_DELAY_MS = 60 * 1000;

async function runPurge(): Promise<void> {
  try {
    await purgeExpiredAccounts();
  } catch (error) {
    // Never let a failed sweep take the API down with it — it retries tomorrow.
    console.error(
      JSON.stringify({
        scope: 'account',
        event: 'PURGE_RUN_FAILED',
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

setTimeout(() => {
  void runPurge();
  setInterval(() => void runPurge(), PURGE_INTERVAL_MS).unref();
}, PURGE_STARTUP_DELAY_MS).unref();

console.log(`Deactivated-account purge: every 24h, retention ${RETENTION_DAYS} days`);

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
