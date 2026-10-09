FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

# Pinned MercuryWorkshop/Scramjet-App (AGPL-3.0)
RUN git clone https://github.com/MercuryWorkshop/Scramjet-App.git . \
    && git checkout f6f83cbc93091e47b9c357eb00ea289828aedf94 \
    && rm -rf .git

# Install upstream deps, then add the epoxy transport
RUN npm install --no-audit --no-fund \
    && npm install --no-audit --no-fund --no-save @mercuryworkshop/epoxy-transport@^3

# Apply the Mist.Dev patches (epoxy transport, no COOP/COEP so it can be iframed)
COPY index.js src/index.js
COPY public-index.js public/index.js

ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
