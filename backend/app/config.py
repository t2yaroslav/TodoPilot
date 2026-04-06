from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/todopilot"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 525600
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_api_base: str = ""
    llm_debug: bool = False
    admin_email: str = ""  # email of admin user (gets is_admin=True on login)
    vite_google_client_id: str = ""  # Google OAuth Client ID for sign-in (shared with frontend)
    upload_dir: str = "uploads"
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "text"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
