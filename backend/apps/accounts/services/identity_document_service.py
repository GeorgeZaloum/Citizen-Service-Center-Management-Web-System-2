from apps.accounts.repositories import IdentityDocumentRepository, UserRepository
from apps.audit.services import AuditService
from shared.constants import ROLE_CITIZEN, ROLE_SYSTEM_ADMIN
from shared.exceptions import ResourceNotFound


class IdentityDocumentService:
    """Access to citizens' ID card images (FR-VER-01; FR-VER-02 in Sprint 2)."""

    @staticmethod
    def can_view(*, actor, owner):
        """The citizen and the System Administrator. Sprint 2 adds the employees who
        process one of the citizen's requests in their department."""
        return actor.id == owner.id or actor.role == ROLE_SYSTEM_ADMIN

    @staticmethod
    def get_document(*, actor, user_id, side, ip=None):
        """A refused request looks like "not found" and is recorded."""
        owner = UserRepository.get_by_id(user_id)
        if owner is None or owner.role != ROLE_CITIZEN:
            raise ResourceNotFound("Document not found.")
        if not IdentityDocumentService.can_view(actor=actor, owner=owner):
            AuditService.log_unauthorized(
                actor=actor, entity_type="identity_document", entity_id=owner.id, reason="view ID card", ip=ip
            )
            raise ResourceNotFound("Document not found.")
        document = IdentityDocumentRepository.get(user_id=owner.id, side=side)
        if document is None:
            raise ResourceNotFound("Document not found.")
        return document
