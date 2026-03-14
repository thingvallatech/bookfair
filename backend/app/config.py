from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = "postgresql+asyncpg://biospark:biospark@localhost:5432/biospark"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "biospark"
    modal_token_id: str = ""
    modal_token_secret: str = ""
    frontend_url: str = "https://biospark.vercel.app"
    cors_origins: list[str] = ["https://biospark.vercel.app", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
