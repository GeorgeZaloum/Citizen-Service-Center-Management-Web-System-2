import uuid
from pathlib import PurePath

from django.db import models


def identity_document_path(document, filename):
    """Random file name under the owner's folder; the original name is never kept."""
    return f"identity_documents/{document.user_id}/{uuid.uuid4().hex}{PurePath(filename).suffix.lower()}"


class IdentityDocument(models.Model):
    """One side of a citizen's ID card. The file is on disk; the database keeps its path."""

    SIDE_FRONT = "FRONT"
    SIDE_BACK = "BACK"

    SIDE_CHOICES = [
        (SIDE_FRONT, "Front"),
        (SIDE_BACK, "Back"),
    ]

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="identity_documents")
    side = models.CharField(max_length=10, choices=SIDE_CHOICES)
    file_path = models.FileField(upload_to=identity_document_path, max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "identity_documents"
        constraints = [models.UniqueConstraint(fields=["user", "side"], name="identity_documents_one_per_side")]

    def __str__(self):
        return f"IdentityDocument<{self.user_id}:{self.side}>"
