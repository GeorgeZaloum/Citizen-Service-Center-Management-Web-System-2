from drf_spectacular.utils import inline_serializer
from rest_framework import serializers


def envelope(name, data_fields=None, paginated=False):
    """OpenAPI description of the success body {success, message, data[, meta]}."""
    fields = {
        "success": serializers.BooleanField(default=True),
        "message": serializers.CharField(),
        "data": inline_serializer(name=f"{name}Data", fields=data_fields)
        if data_fields
        else serializers.JSONField(allow_null=True),
    }
    if paginated:
        fields["meta"] = inline_serializer(
            name=f"{name}Meta",
            fields={
                "pagination": inline_serializer(
                    name=f"{name}Pagination",
                    fields={
                        "page": serializers.IntegerField(),
                        "page_size": serializers.IntegerField(),
                        "total_items": serializers.IntegerField(),
                        "total_pages": serializers.IntegerField(),
                    },
                )
            },
        )
    return inline_serializer(name=name, fields=fields)
