import re


def normalize_mobile_number(value):
    """Return a compact international-style number, or None when it is invalid."""
    normalized = re.sub(r"[\s().-]", "", str(value or ""))
    return normalized if re.fullmatch(r"\+?\d{8,15}", normalized) else None
