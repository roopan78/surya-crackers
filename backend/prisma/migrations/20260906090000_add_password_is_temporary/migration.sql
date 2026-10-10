-- Marks a passwordHash that we generated and emailed (Google sign-up) rather
-- than one the customer chose. Existing rows kept their own passwords, so false.
ALTER TABLE "users" ADD COLUMN "passwordIsTemporary" BOOLEAN NOT NULL DEFAULT false;
