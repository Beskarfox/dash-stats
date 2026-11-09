import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required: the API refuses to start if it is empty or left to the old public default.
    API_KEY: str = os.getenv("API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/sql_app.db")
    
    # Cron interval in seconds (default is 1 hour = 3600 seconds)
    COLLECTION_INTERVAL_SECONDS: int = int(os.getenv("COLLECTION_INTERVAL_SECONDS", "3600"))

    # Backup schedule
    BACKUP_CHECK_INTERVAL_SECONDS: int = int(os.getenv("BACKUP_CHECK_INTERVAL_SECONDS", "3600"))
    BACKUP_AGE_THRESHOLD_SECONDS: int = int(os.getenv("BACKUP_AGE_THRESHOLD_SECONDS", "604800"))

    # Retention limits (number of archives to keep). Set to 0 to disable backups for a service.
    MAX_BACKUPS_NEXTCLOUD: int = int(os.getenv("MAX_BACKUPS_NEXTCLOUD", "0"))
    MAX_BACKUPS_MINECRAFT: int = int(os.getenv("MAX_BACKUPS_MINECRAFT", "0"))
    MAX_BACKUPS_OUTLINE: int = int(os.getenv("MAX_BACKUPS_OUTLINE", "0"))

    # Nextcloud MariaDB credentials used by mysqldump (no default: must be set in .env)
    NEXTCLOUD_DB_USER: str = os.getenv("NEXTCLOUD_DB_USER", "")
    NEXTCLOUD_DB_PASSWORD: str = os.getenv("NEXTCLOUD_DB_PASSWORD", "")

    # Minecraft Server settings
    MINECRAFT_HOST: str = os.getenv("MINECRAFT_HOST", "minecraft-paper")
    MINECRAFT_PORT: int = int(os.getenv("MINECRAFT_PORT", "25565"))
    MINECRAFT_LOG_PATH: str = os.getenv("MINECRAFT_LOG_PATH", "/opt/minecraft/data/logs/latest.log")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

