# --- Stage 1: builder ---
# Installs ALL dependencies (including dev, needed for the TS compiler
# and Nest CLI), generates the Prisma client, and compiles to dist/.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only manifest files first — Docker caches this layer, so
# `npm ci` only re-runs when package.json/lock actually change,
# not on every source code edit.
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Now copy the rest of the source and build.
COPY . .
RUN npm run build

# --- Stage 2: runner ---
# Only what's needed to RUN the compiled app — no TypeScript compiler,
# no dev dependencies, no source .ts files. This is what actually
# ships and runs in production.
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (skips devDependencies entirely).
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# postinstall already ran `prisma generate` during `npm ci` above
# (via the postinstall script), so the generated client is already
# in node_modules — no separate generate step needed here.

# Copy the compiled output from the builder stage.
COPY --from=builder /app/dist ./dist

# NestJS default port; overridden by PORT env var if the platform sets one.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/v1/health || exit 1

# Matches your own start:prod script exactly.
CMD ["node", "dist/src/main"]