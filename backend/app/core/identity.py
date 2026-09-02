EMAIL_ALREADY_REGISTERED = (
    "This email is already registered. Please use a different email address."
)


def normalize_email(value: object) -> str:
    """Return the canonical representation used by every HMS account."""
    return str(value).strip().lower()
