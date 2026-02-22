from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://todopulse:todopulse_secret@localhost:5432/todopulse"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_api_base: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
