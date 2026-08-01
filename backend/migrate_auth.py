import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost/hospital_management")

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        try:
            print("Adding is_active column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"))
        except Exception as e:
            print(f"Skipped is_active: {e}")
            
        try:
            print("Adding is_email_verified column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print(f"Skipped is_email_verified: {e}")
            
        try:
            print("Adding email_verified_at column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped email_verified_at: {e}")
            
        try:
            print("Adding email_verification_token_hash column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR(255) NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped email_verification_token_hash: {e}")
            
        try:
            print("Adding email_verification_expires_at column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMP NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped email_verification_expires_at: {e}")
            
        try:
            print("Adding password_reset_token_hash column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(255) NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped password_reset_token_hash: {e}")
            
        try:
            print("Adding password_reset_expires_at column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped password_reset_expires_at: {e}")
            
        try:
            print("Adding last_login_at column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL;"))
        except Exception as e:
            print(f"Skipped last_login_at: {e}")

        # Update existing users to be verified so they can still log in
        try:
            print("Setting existing users to verified...")
            conn.execute(text("UPDATE users SET is_email_verified = TRUE WHERE is_email_verified IS NULL OR is_email_verified = FALSE;"))
        except Exception as e:
            print(f"Failed to update existing users: {e}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
