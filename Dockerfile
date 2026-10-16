# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Stage 1: Angular frontend
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS frontend
WORKDIR /src
COPY frontend/interview-forge/package.json frontend/interview-forge/package-lock.json frontend/interview-forge/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY frontend/interview-forge/ ./
RUN npx ng build --configuration production

# ---------------------------------------------------------------------------
# Stage 2: .NET build + tests
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props InterviewForge.sln ./
COPY src/InterviewForge.Domain/*.csproj src/InterviewForge.Domain/
COPY src/InterviewForge.Application/*.csproj src/InterviewForge.Application/
COPY src/InterviewForge.Infrastructure/*.csproj src/InterviewForge.Infrastructure/
COPY src/InterviewForge.Api/*.csproj src/InterviewForge.Api/
COPY tests/InterviewForge.UnitTests/*.csproj tests/InterviewForge.UnitTests/
COPY tests/InterviewForge.IntegrationTests/*.csproj tests/InterviewForge.IntegrationTests/
RUN dotnet restore InterviewForge.sln
COPY src/ src/
COPY tests/ tests/
COPY data/ data/
# Set RUN_TESTS=false to skip tests for a faster image build.
ARG RUN_TESTS=true
RUN if [ "$RUN_TESTS" = "true" ]; then dotnet test InterviewForge.sln -c Release --no-restore; fi
RUN dotnet publish src/InterviewForge.Api/InterviewForge.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish ./
COPY --from=frontend /src/dist/interview-forge/ ./wwwroot/
# Seed Markdown is baked into the image; a mounted /data may override it.
COPY data/*.md data/*.json ./seed/
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data && chown -R app:app /data /app

ENV ASPNETCORE_URLS=http://+:8888 \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__DefaultConnection="Data Source=/data/interviewforge.db" \
    Import__DataDirectory=/data \
    Import__FallbackDataDirectory=/app/seed \
    DOTNET_gcServer=0

EXPOSE 8888
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS http://localhost:8888/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
