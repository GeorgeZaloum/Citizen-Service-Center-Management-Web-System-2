from django.core.paginator import Paginator

from shared.exceptions import ValidationFailed

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def paginate(request, queryset):
    """Slice `queryset` by `?page=` and `?page_size=`; returns (items, meta)."""
    page_number = _positive_int(request.query_params.get("page"), "page", 1)
    page_size = min(_positive_int(request.query_params.get("page_size"), "page_size", DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number) if paginator.count else []
    meta = {
        "pagination": {
            "page": page_number,
            "page_size": page_size,
            "total_items": paginator.count,
            "total_pages": paginator.num_pages if paginator.count else 0,
        }
    }
    return list(page), meta


def _positive_int(raw, name, default):
    if raw in (None, ""):
        return default
    if not str(raw).isdigit() or int(raw) < 1:
        raise ValidationFailed(details={name: ["A positive integer is required."]})
    return int(raw)
