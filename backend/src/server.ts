import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { releaseTokenEnabled, releaseTokenMisconfigured } from './middleware/releaseToken.middleware';

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

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
