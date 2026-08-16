# dsh-verify — pinned Playwright Chromium image
# The Playwright base image already ships a matching Chromium build,
# so we skip the npm post-install browser download.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

ENTRYPOINT ["node", "bin/verify.mjs"]
CMD ["--help"]
