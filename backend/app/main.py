import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import algorithms, analogies, benchmarks, discovery, mechanisms
from app.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(title="BioSpark API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mechanisms.router, prefix="/api/mechanisms", tags=["mechanisms"])
app.include_router(analogies.router, prefix="/api/analogies", tags=["analogies"])
app.include_router(algorithms.router, prefix="/api/algorithms", tags=["algorithms"])
app.include_router(benchmarks.router, prefix="/api/benchmarks", tags=["benchmarks"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["discovery"])


@app.get("/api/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("BioSpark API started")
