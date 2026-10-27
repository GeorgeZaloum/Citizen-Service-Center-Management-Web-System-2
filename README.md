# Citizen Service Center Management Web System

Graduation project (Software Engineering, Solo Scrum). A web system that digitizes the
transactions of a citizen service center: citizens submit and track requests, employees
process the requests of their own department, department managers run their department,
and the System Administrator manages the whole center.

## Architecture Statement
The system follows a Client-Server Architecture.
The backend is organized using a 3-Layer Architecture (Presentation, Business Logic, Data Access)
within a Modular Monolith design. SOLID principles are applied to improve maintainability and code quality.

## Technology Stack
- Backend: Django 5.2 LTS, Django REST Framework, drf-spectacular (OpenAPI), Django sessions with CSRF
- Database: PostgreSQL
- Frontend: React (added later in `frontend/`)

## Current Status
**Sprint 1 – Account & Access Management: complete on the backend.** 28 requirements
(FR-AUTH-01 – 07, FR-VER-01, FR-DEP-01 – 07, FR-USR-01 – 09, FR-LOG-01, FR-LOG-02, FR-LOG-05,
FR-SET-01), use cases UC-01 – UC-19, 108 tests passing on PostgreSQL.

---

## Repository Structure

```
Citizen-Service-Center-Management-Web-System/
├── .env.example          copy to .env (never committed)
├── README.md
└── backend/
    ├── manage.py · requirements.txt · pytest.ini · pyproject.toml · conftest.py
    ├── config/           settings/base.py · urls.py · wsgi.py · asgi.py · tests.py (API contract test)
    ├── shared/           code used by every module
    │   ├── constants/    roles, account statuses, role capabilities
    │   ├── exceptions/   domain exceptions + the handler that formats every error
    │   ├── pagination/   ?page= and ?page_size=
    │   ├── permissions/  role permissions + session authentication with CSRF
    │   ├── responses/    success_response(), error_payload(), OpenAPI envelope
    │   ├── utils/        client IP, before/after values for the activity log
    │   └── validators/   password strength, phone, national ID, ID card image
    ├── apps/
    │   ├── accounts/         users, authentication, ID card images (UC-01 – UC-08, UC-15 – UC-18)
    │   ├── departments/      departments and their lifecycle (UC-09 – UC-14)
    │   ├── audit/            immutable activity log (FR-LOG-01, FR-LOG-02, FR-LOG-05)
    │   └── center_settings/  center information (UC-19)
    └── docs/openapi.yaml     API contract for the front end
```

### The module template (every module, every sprint)

```
apps/<module>/
├── models/          one file per model; __init__.py exports them
├── repositories/    create / get / save / delete: the data access of each model
├── selectors/       read queries (lists, filters, department isolation)
├── services/        one service class per entity, static methods: the business rules
├── api/
│   ├── views.py         thin: validate with a serializer, call the service, return success_response
│   ├── serializers.py   input validation and output shape
│   ├── urls.py          mounted at /api/v1/<module>/ in config/urls.py
│   └── permissions.py   who may call the module's endpoints
├── tests/           APITestCase / TestCase per use case
├── management/commands/   (when needed) seed commands
├── migrations/
├── admin.py · apps.py
```

**Request flow:** `urls.py → views.py → serializers.py (input) → services/ (rules) → repositories/ or selectors/ (database) → models/`,
then back as `{success, message, data, meta}`, or as `{success: false, error: {type, code, details}}` when a
service raises a `shared.exceptions` error. No database query in views or serializers, no business rule in views.

**Adding a sprint:** create the new modules with exactly these folders (Sprint 2: `services`; Sprints 2 – 4:
`requests`; Sprint 3: `archive`, `payments`; Sprint 4: `notifications`; Sprint 5: `feedback`, `reports`), add one
line per module to `config/urls.py` and `INSTALLED_APPS`, record every sensitive operation with
`AuditService.log(...)`, and regenerate `docs/openapi.yaml`.

---

## Getting Started

Requirements: Python 3.12+, PostgreSQL 14+.

```bash
copy .env.example .env          # then set DB_PASSWORD, DJANGO_SECRET_KEY, SEED_ADMIN_PASSWORD
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
createdb -U postgres citizen_service_center
python manage.py migrate
python manage.py seed_data        # departments Municipality, Traffic, Civil Registry; center settings; first System Administrator
python manage.py seed_local_data  # optional demo accounts for the front end
python manage.py runserver        # Swagger UI: http://localhost:8000/api/docs/
```

| Command (from `backend/`) | Purpose |
|---|---|
| `pytest` | All tests |
| `pytest apps/departments` | Tests of one module |
| `ruff check . && ruff format --check .` | Lint and formatting |
| `python manage.py spectacular --file docs/openapi.yaml` | Regenerate the API contract (a test fails if it is outdated) |

### Seeded accounts
- System Administrator: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (default email `admin@csc.local`)
- Demo accounts (`seed_local_data`), password `Demo-Pass1`:
  - Department Managers: `manager.municipality@demo.csc`, `manager.traffic@demo.csc`, `manager.civil-registry@demo.csc`
  - Employees: `employee1.<department>@demo.csc`, `employee2.<department>@demo.csc`
  - Citizens: `citizen1@demo.csc`, `citizen2@demo.csc` (with placeholder ID card images)

---

## API Contract for the Front End

Base URL `/api/v1/`. Full contract: `backend/docs/openapi.yaml`, or Swagger UI at `/api/docs/`.

```json
{ "success": true, "message": "Users list", "data": { "users": [] }, "meta": { "pagination": { "page": 1, "page_size": 20, "total_items": 0, "total_pages": 0 } } }
```
```json
{ "success": false, "error": { "type": "validation_error", "code": "weak_password", "details": { "detail": "The password is not strong enough.", "password": ["The password must contain a digit."] } } }
```

`error.details` always holds `detail` (a message) and, for invalid input, one list of messages per field.
`error.code` is stable: map it to your own messages.

| HTTP | `type` | `code` |
|---|---|---|
| 400 | `validation_error` | `validation_error`, `weak_password`, `incorrect_current_password`, `password_same_as_current`, `confirmation_mismatch`, `invalid_working_hours` |
| 400 | `request_error` | `malformed_request` |
| 401 | `authentication_error` | `not_authenticated`, `invalid_credentials`, `account_locked` (details: `locked_until`, `retry_after_seconds`) |
| 403 | `permission_error` | `permission_denied`, `csrf_failed`, `already_authenticated`, `account_disabled`, `immutable_field`, `scope_violation`, `self_action_forbidden`, `audit_log_immutable` |
| 404 | `not_found` | `not_found` (also for accounts outside your department) |
| 405 / 415 | `request_error` | `method_not_allowed`, `unsupported_media_type` |
| 409 | `business_rule_violation` | `account_exists`, `email_taken`, `phone_taken`, `invalid_state_transition`, `department_required`, `no_active_department`, `no_other_active_department`, `department_not_active`, `department_name_taken`, `department_not_suspended`, `department_archived`, `department_has_active_accounts`, `department_has_requests`, `department_has_no_requests` |
| 500 | `server_error` | `server_error` |

### Session and CSRF
1. Send every request with credentials (`axios.defaults.withCredentials = true`); CORS allows `CORS_ALLOWED_ORIGINS` from `.env`.
2. `GET /api/v1/auth/csrf/` returns the token and sets the `csrftoken` cookie.
3. Send `X-CSRFToken` on every POST, PUT, PATCH and DELETE, login and registration included.
4. Login rotates the token: read the `csrftoken` cookie again after logging in.
5. `GET /api/v1/auth/me/` returns `role`, `department` and `capabilities`: route each role to its interface from it.
   A `401` means the session ended: go to the login page.
6. ID card images are binary responses: download them with the session (as a blob).

---

## Endpoints, Use Cases and Requirements

SA = System Administrator, DM = Department Manager.

| Method | Path (`/api/v1/...`) | Use case | Requirements | Roles |
|---|---|---|---|---|
| GET | `auth/csrf/` | — | — | Everyone |
| POST | `auth/register/` (multipart) | UC-01 | FR-AUTH-01, FR-VER-01, FR-USR-03, FR-LOG-02 | Visitors |
| POST | `auth/login/` | UC-02 | FR-AUTH-02, FR-AUTH-07, FR-USR-05, FR-USR-07 | Everyone |
| POST | `auth/logout/` | UC-06 | FR-AUTH-03 | Logged in |
| GET | `auth/me/` | UC-02 step 4 | FR-AUTH-02, FR-USR-07 | Logged in |
| PATCH | `auth/me/` | UC-08 | FR-AUTH-06 | Logged in |
| POST | `auth/me/password/` | UC-07 | FR-AUTH-05 | Logged in |
| GET | `auth/users/` | UC-18 | FR-USR-09, FR-USR-08 | DM (own employees), SA |
| POST | `auth/users/` | UC-04, UC-05 | FR-USR-01, FR-USR-02, FR-USR-03, FR-DEP-06, FR-LOG-02 | SA (managers), DM (employees) |
| GET | `auth/users/{id}/` | UC-15 – 17 step 2 | FR-USR-08 | DM (own employees), SA |
| PATCH | `auth/users/{id}/` | UC-15 | FR-USR-04, FR-USR-08, FR-LOG-02 | DM (own employees), SA |
| POST | `auth/users/{id}/reset-password/` | UC-03 | FR-AUTH-04, FR-USR-08, FR-LOG-02 | DM (own employees), SA (managers, citizens) |
| PATCH | `auth/users/{id}/status/` | UC-16 | FR-USR-05, FR-USR-08, FR-LOG-02 | DM (own employees), SA (all but self) |
| POST | `auth/users/{id}/transfer/` | UC-17 | FR-USR-06, FR-USR-08, FR-LOG-02 | SA |
| GET | `auth/users/{id}/identity-documents/{front\|back}/` | — | FR-VER-01 | The citizen, SA |
| GET | `departments/` | UC-14 | FR-DEP-01, FR-DEP-07 | SA |
| POST | `departments/` | UC-09 | FR-DEP-02, FR-DEP-06, FR-LOG-02 | SA |
| GET | `departments/{id}/` | UC-14 steps 3 – 4 | FR-DEP-07 | SA |
| PATCH | `departments/{id}/` | UC-10 | FR-DEP-03, FR-LOG-02 | SA |
| DELETE | `departments/{id}/` (body `confirm_name`) | UC-12 | FR-DEP-05, FR-LOG-02 | SA |
| PATCH | `departments/{id}/status/` | UC-11 | FR-DEP-04, FR-LOG-02 | SA |
| POST | `departments/{id}/archive/` | UC-12 2b | FR-DEP-05, FR-LOG-02 | SA |
| POST | `departments/{id}/managers/{user_id}/remove/` | UC-13 | FR-DEP-06, FR-USR-05, FR-USR-06, FR-LOG-02 | SA |
| GET | `center-settings/` | UC-19 step 2, UC-02 3a | FR-SET-01 | Everyone |
| PUT | `center-settings/` | UC-19 | FR-SET-01, FR-LOG-02 | SA |

FR-USR-07 (role checks) and FR-USR-08 (department isolation) apply to every endpoint; FR-LOG-01 and
FR-LOG-02 are recorded by the services through `AuditService`; FR-LOG-05 is enforced by the audit module.

---

## Security Baseline
- **Sessions, not JWT:** HttpOnly session cookie + CSRF on every unsafe request. Sessions live in the ERD
  table `sessions` with their user, so a password change, a reset or a deactivation ends them.
- **Department isolation on the server:** `apps/accounts/selectors/user_selectors.py` limits every account
  query to the caller's scope; an account outside it answers `404`, and write attempts on it are recorded.
- **Login lockout:** 5 failed attempts lock the account for 15 minutes (`.env`); one generic error message.
- **ID card images:** stored in `backend/media/` (never committed, never served directly), path only in the
  database, downloaded through a permission-checked endpoint.
- **Immutable activity log:** refused by the model, by the queryset and by a PostgreSQL trigger.
- **Email:** notifications only (later sprints). No activation links, recovery links or passwords by email.

## SOLID and Design Patterns

| Principle / pattern | Where |
|---|---|
| Single responsibility | models hold data; repositories and selectors query; services decide; views translate HTTP; serializers validate input |
| Open/closed | the role tables in `UserService` (`SYSTEM_ADMIN_TARGETS`, `CREATABLE_ROLE`) and `DepartmentService.ALLOWED_TRANSITIONS`: new rules are new entries, not new branches; `shared/constants/capabilities.py` |
| Liskov substitution | module permissions extend the shared ones (`CanManageUsers(IsAccountManager)`); every domain error is a `DomainException` the one handler formats |
| Interface segregation | one small repository per model; selectors separated from writes |
| Dependency inversion | views depend on services, services on repositories and selectors, never the reverse; shared rules live in `shared/` |
| Repository + Selector | `apps/*/repositories/`, `apps/*/selectors/` |
| Service Layer | `apps/*/services/` |
| State transitions table | `DepartmentService.ALLOWED_TRANSITIONS` |
| Explicit audit call (not signals) | `AuditService.log(...)` in every service: only the service knows the actor, the reason and the values before and after, and the entry joins the same transaction |

## Engineering Standards
- Keep business rules in the service layer, transport logic in the API layer, persistence in repositories and selectors.
- Check scope before writing, outside the transaction, so rejected attempts stay in the activity log.
- Every endpoint has an OpenAPI description; regenerate `docs/openapi.yaml` after API changes.
- Every main flow and alternative of the use case specifications has a test.

## Decisions taken in Sprint 1
- Removing a manager by deactivation (UC-13) clears the department link; the account must be transferred
  (UC-17) before it can be reactivated (`department_required`).
- `activity_logs` adds `department_id` (a plain number, so history survives a deleted department and stays
  with the old department after a transfer) and `ip_address`; `user_id` may be empty for anonymous events.
- The System Administrator creates Department Managers only; Department Managers create their employees (UC-05).
- Unique phone for every account; national ID 11 digits; phone `09XXXXXXXX`; password at least 8 characters with
  upper case, lower case and a digit; ID images JPG or PNG up to 5 MB; sessions last 8 hours.
- Archiving (UC-12 2b) applies only to a department linked to requests. Requests arrive in Sprint 3, so for now
  every removable department is deleted; the request and service counts return 0 until then.
