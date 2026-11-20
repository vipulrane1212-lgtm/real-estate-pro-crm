-- ==============================================================================
-- Migration: 002_audit_trigger.sql
-- Diksha Real Estate CRM - Automated Audit Log Trigger on Insert/Update/Delete
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_entity_id TEXT;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    -- Safely retrieve the current authenticated user ID
    BEGIN
        v_actor_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        v_entity_id := (to_jsonb(OLD)->>'id');
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_entity_id := (to_jsonb(NEW)->>'id');
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        v_entity_id := (to_jsonb(NEW)->>'id');
        v_new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        v_actor_id,
        TG_OP,
        TG_TABLE_NAME,
        v_entity_id,
        v_old_data,
        v_new_data,
        now()
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Log triggers on initial core tables
DROP TRIGGER IF EXISTS tr_audit_profiles ON public.profiles;
CREATE TRIGGER tr_audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

DROP TRIGGER IF EXISTS tr_audit_employees ON public.employees;
CREATE TRIGGER tr_audit_employees
    AFTER INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

DROP TRIGGER IF EXISTS tr_audit_company_settings ON public.company_settings;
CREATE TRIGGER tr_audit_company_settings
    AFTER INSERT OR UPDATE OR DELETE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

DROP TRIGGER IF EXISTS tr_audit_role_permissions ON public.role_permissions;
CREATE TRIGGER tr_audit_role_permissions
    AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();
