from django.core.files import File

from apps.accounts.models import IdentityDocument


class IdentityDocumentRepository:
    @staticmethod
    def create(*, user, side, file) -> IdentityDocument:
        document = IdentityDocument(user=user, side=side)
        file.seek(0)
        document.file_path.save(file.name, File(file), save=False)
        document.save()
        return document

    @staticmethod
    def get(*, user_id: int, side: str) -> IdentityDocument | None:
        return IdentityDocument.objects.filter(user_id=user_id, side=side).first()
