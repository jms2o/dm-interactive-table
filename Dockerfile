FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma.config.ts ./server/prisma.config.ts
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/assets ./assets

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:deploy --workspace server && npm run start --workspace server"]
