import json
from sqlalchemy import event
from sqlalchemy.orm import Mapper
from sqlalchemy.engine import Connection
from app.models.all_models import AuditLog, Base, User
from app.core.context import current_user_id, current_user_ip, current_user_agent
from datetime import datetime, date

AUDIT_TARGETS = [
    'prescriptions', 'lab_results', 'radiology_reports', 'billing', 'financial_transactions',
    'insurance_claims', 'roles', 'patients', 'departments', 'medicines', 'stock_transactions'
]

def to_dict(obj):
    if obj is None:
        return None
    res = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, (datetime, date)):
            val = val.isoformat()
        res[c.name] = val
    return res

def serialize_changes(state):
    old_values = {}
    new_values = {}
    
    for attr in state.mapper.column_attrs:
        hist = getattr(state.attrs, attr.key).history
        if hist.has_changes():
            # Never log sensitive data
            if attr.key in ['hashed_password', 'password', 'token', 'secret']:
                continue
                
            old_val = hist.deleted[0] if hist.deleted else None
            new_val = hist.added[0] if hist.added else None
            
            if isinstance(old_val, (datetime, date)): old_val = old_val.isoformat()
            if isinstance(new_val, (datetime, date)): new_val = new_val.isoformat()
            
            old_values[attr.key] = old_val
            new_values[attr.key] = new_val
            
    return old_values, new_values

def log_event(mapper, connection, target, action):
    table_name = target.__tablename__
    if table_name not in AUDIT_TARGETS:
        return
        
    actor_id = current_user_id.get()
    ip = current_user_ip.get()
    ua = current_user_agent.get()
    
    old_vals, new_vals = None, None
    
    if action == 'insert':
        # On insert, everything is new, old is empty.
        new_vals = {}
        for c in target.__table__.columns:
            if c.name in ['hashed_password', 'password', 'token', 'secret']: continue
            val = getattr(target, c.name)
            if isinstance(val, (datetime, date)): val = val.isoformat()
            new_vals[c.name] = val
            
    elif action == 'update':
        from sqlalchemy.orm import attributes
        state = attributes.instance_state(target)
        old_vals, new_vals = serialize_changes(state)
        if not old_vals and not new_vals:
            return # No relevant changes
            
    elif action == 'delete':
        old_vals = {}
        for c in target.__table__.columns:
            if c.name in ['hashed_password', 'password', 'token', 'secret']: continue
            val = getattr(target, c.name)
            if isinstance(val, (datetime, date)): val = val.isoformat()
            old_vals[c.name] = val

    resource_id = getattr(target, 'id', None)
    
    # We must construct an insert statement for audit log directly to avoid endless recursion
    from sqlalchemy import insert
    stmt = insert(AuditLog).values(
        actor_user_id=actor_id,
        action=f"{action}_{table_name}",
        resource_type=table_name,
        resource_id=str(resource_id) if resource_id else None,
        old_values=old_vals,
        new_values=new_vals,
        ip_address=ip,
        user_agent=ua
    )
    connection.execute(stmt)

def setup_audit_listeners():
    for mapper in Base.registry.mappers:
        # Check if table belongs to our targets to limit event hook overhead
        if mapper.mapped_table.name in AUDIT_TARGETS:
            event.listen(mapper.class_, 'after_insert', lambda m, c, t: log_event(m, c, t, 'insert'))
            event.listen(mapper.class_, 'after_update', lambda m, c, t: log_event(m, c, t, 'update'))
            event.listen(mapper.class_, 'after_delete', lambda m, c, t: log_event(m, c, t, 'delete'))
