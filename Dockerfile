# dsh-verify — pinned Playwright Chromium image
# The Playwright base image already ships a matching Chromium build,
# so we skip the npm post-install browser download.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

# Default: run as MCP server (stdio) so container-based checks (Glama, connectors, etc.)
# can introspect the server. Override with: docker run --rm <image> node bin/verify.mjs --help
ENTRYPOINT ["node", "mcp/server.mjs"]
