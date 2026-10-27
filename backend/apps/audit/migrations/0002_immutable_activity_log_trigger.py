# FR-LOG-05 at database level: PostgreSQL refuses UPDATE, DELETE and TRUNCATE on
# activity_logs, whoever runs them (the application, the admin site or raw SQL).

from django.db import migrations

CREATE_TRIGGERS = """
CREATE OR REPLACE FUNCTION activity_logs_reject_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'activity_logs is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_logs_no_update_or_delete
    BEFORE UPDATE OR DELETE ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION activity_logs_reject_change();

CREATE TRIGGER activity_logs_no_truncate
    BEFORE TRUNCATE ON activity_logs
    FOR EACH STATEMENT EXECUTE FUNCTION activity_logs_reject_change();
"""

DROP_TRIGGERS = """
DROP TRIGGER IF EXISTS activity_logs_no_truncate ON activity_logs;
DROP TRIGGER IF EXISTS activity_logs_no_update_or_delete ON activity_logs;
DROP FUNCTION IF EXISTS activity_logs_reject_change();
"""


class Migration(migrations.Migration):
    dependencies = [("audit", "0001_initial")]

    operations = [migrations.RunSQL(CREATE_TRIGGERS, DROP_TRIGGERS)]
