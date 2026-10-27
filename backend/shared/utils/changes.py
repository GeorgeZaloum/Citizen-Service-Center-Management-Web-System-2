from datetime import date, datetime, time


def to_json_value(value):
    if isinstance(value, datetime | date | time):
        return value.isoformat()
    return value


def json_ready(values):
    """A dict of values ready to be stored in a JSON column."""
    if values is None:
        return None
    return {key: to_json_value(value) for key, value in values.items()}


def snapshot(instance, fields):
    """The current values of `fields` on `instance`."""
    return {field: to_json_value(getattr(instance, field)) for field in fields}


def changed_values(before, after):
    """Only the fields that changed, as (old_value, new_value)."""
    changed = [field for field in after if before.get(field) != after[field]]
    return {field: before.get(field) for field in changed}, {field: after[field] for field in changed}
