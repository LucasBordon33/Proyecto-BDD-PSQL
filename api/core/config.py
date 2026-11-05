from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    postgres_user: str = Field(validation_alias="DB_USER")
    postgres_password: str = Field(validation_alias="DB_PASSWORD")
    postgres_db: str = Field(validation_alias="DB_NAME")
    postgres_host: str = Field(default="db", validation_alias="DB_HOST")
    postgres_port: int = Field(default=5432, validation_alias="DB_PORT")
    db_command_timeout: int = 30
    db_pool_min_size: int = 5
    db_pool_max_size: int = 20

settings = Settings()

