# The lair is a plain node process; this is the box for anyone without one. State lives
# in LAIR_HOME — mount a volume there or the keys and clones die with the container.
FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git openssh-client \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @anthropic-ai/claude-code

WORKDIR /app
COPY . .
RUN npm ci --omit=optional

ENV LAIR_HOME=/data
VOLUME /data
EXPOSE 3131

# ANTHROPIC_API_KEY comes in from the environment at run time, never this file.
CMD ["npm", "run", "start", "-w", "@broodmother/lair"]
