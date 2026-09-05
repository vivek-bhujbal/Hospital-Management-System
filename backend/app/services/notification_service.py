"""Role-aware in-app notification creation.

Notifications are added to the caller's transaction.  This keeps a workflow
change and the notification describing it atomic; the real-time endpoint then
observes committed rows and pushes a lightweight refresh event to the user.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.all_models import Notification, NotificationPreference, User


def create_in_app_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    subject: str,
    body: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Notification | None:
    """Add one deduplicated in-app notification to the current transaction."""
    recipient = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not recipient:
        return None

    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()
    if preferences and not preferences.in_app_enabled:
        return None

    raw_key = "|".join(
        (
            str(user_id),
            notification_type,
            "in_app",
            entity_type or "",
            str(entity_id or ""),
        )
    )
    idempotency_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    existing = db.query(Notification).filter(
        Notification.idempotency_key == idempotency_key
    ).first()
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        channel="in_app",
        subject=subject,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        status="sent",
        sent_at=now,
        idempotency_key=idempotency_key,
    )
    db.add(notification)
    return notification


def notify_users(
    db: Session,
    user_ids: Iterable[int | None],
    *,
    actor_id: int | None,
    notification_type: str,
    subject: str,
    body: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> None:
    for user_id in {value for value in user_ids if value is not None}:
        if user_id == actor_id:
            continue
        create_in_app_notification(
            db,
            user_id=user_id,
            notification_type=notification_type,
            subject=subject,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
        )


def active_user_ids_for_roles(db: Session, *roles: str) -> list[int]:
    if not roles:
        return []
    return [
        row[0]
        for row in db.query(User.id).filter(
            User.role.in_(roles),
            User.is_active.is_(True),
        ).all()
    ]


def _int_id(resource_id: str | None) -> int | None:
    try:
        return int(resource_id) if resource_id is not None else None
    except (TypeError, ValueError):
        return None


def create_notifications_for_audit_event(
    db: Session,
    *,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: str | None,
    old_values: dict | None,
    new_values: dict | None,
) -> None:
    """Translate important audited workflow events into recipient updates."""
    from app.models.all_models import (
        AmbulanceRequest,
        Appointment,
        Billing,
        Doctor,
        Employee,
        EmployeePermission,
        InsuranceClaim,
        LabOrder,
        LabOrderItem,
        LabResult,
        NursingTask,
        Patient,
        PatientVital,
        Prescription,
        RadiologyOrder,
        RadiologyReport,
        RadiologyStudy,
    )

    entity_id = _int_id(resource_id)
    if entity_id is None:
        return

    def patient_user_id(patient_id: int | None) -> int | None:
        patient = db.get(Patient, patient_id) if patient_id else None
        return patient.user_id if patient else None

    def doctor_user_id(doctor_id: int | None) -> int | None:
        doctor = db.get(Doctor, doctor_id) if doctor_id else None
        return doctor.user_id if doctor else None

    if action.startswith("appointment.") or action.startswith("consultation."):
        appointment = db.get(Appointment, entity_id)
        if not appointment:
            return
        patient = db.get(Patient, appointment.patient_id)
        doctor = db.get(Doctor, appointment.doctor_id)
        patient_name = patient.name if patient else "Patient"
        doctor_name = doctor.name if doctor else "the assigned doctor"
        patient_user = patient.user_id if patient else None
        doctor_user = doctor.user_id if doctor else None
        when = f"{appointment.appt_date:%d %b %Y} at {appointment.appt_time.strftime('%I:%M %p')}"

        if action == "appointment.created":
            notify_users(
                db,
                [
                    doctor_user,
                    *active_user_ids_for_roles(
                        db, "receptionist", "hospital_manager", "admin"
                    ),
                ],
                actor_id=actor.id,
                notification_type=action,
                subject="New appointment request",
                body=f"{patient_name} requested an appointment with {doctor_name} on {when}.",
                entity_type="appointment",
                entity_id=entity_id,
            )
            if patient_user == actor.id:
                create_in_app_notification(
                    db,
                    user_id=actor.id,
                    notification_type="appointment.booking_received",
                    subject="Appointment request received",
                    body=f"Your appointment with {doctor_name} on {when} is awaiting confirmation.",
                    entity_type="appointment",
                    entity_id=entity_id,
                )
            return

        messages = {
            "appointment.confirmed": ("Appointment confirmed", f"{patient_name}'s appointment on {when} has been confirmed."),
            "appointment.checked_in": ("Patient checked in", f"{patient_name} has checked in for the appointment on {when}."),
            "appointment.cancelled": ("Appointment cancelled", f"{patient_name}'s appointment on {when} has been cancelled."),
            "consultation.started": ("Consultation started", f"The consultation with {doctor_name} has started."),
            "consultation.completed": ("Consultation completed", f"The consultation with {doctor_name} is complete and the prescription is available."),
        }
        message = messages.get(action)
        if not message:
            return
        recipients: list[int | None] = [patient_user, doctor_user]
        if action == "appointment.cancelled":
            recipients.extend(active_user_ids_for_roles(
                db, "receptionist", "hospital_manager", "admin"
            ))
        if action == "consultation.completed":
            recipients.extend(active_user_ids_for_roles(db, "pharmacist", "accountant"))
        notify_users(
            db,
            recipients,
            actor_id=actor.id,
            notification_type=action,
            subject=message[0],
            body=message[1],
            entity_type="appointment",
            entity_id=entity_id,
        )
        return

    if action.startswith("nursing_task."):
        task = db.get(NursingTask, entity_id)
        if not task:
            return
        patient = db.get(Patient, task.patient_id)
        patient_name = patient.name if patient else "the patient"
        if action == "nursing_task.assigned":
            notify_users(
                db,
                [task.assigned_nurse_id],
                actor_id=actor.id,
                notification_type=action,
                subject="New nursing task assigned",
                body=f"{task.task_type} has been assigned for {patient_name}.",
                entity_type="nursing_task",
                entity_id=entity_id,
            )
        elif action == "nursing_task.status_changed":
            notify_users(
                db,
                [doctor_user_id(task.created_by_doctor_id), patient_user_id(task.patient_id)],
                actor_id=actor.id,
                notification_type=f"{action}.{task.status}",
                subject="Nursing task updated",
                body=f"{task.task_type} for {patient_name} is now {task.status.replace('_', ' ')}.",
                entity_type="nursing_task",
                entity_id=entity_id,
            )
        return

    if action in {"patient_vital.recorded", "nursing_note.created"}:
        patient_id = None
        if action == "patient_vital.recorded":
            record = db.get(PatientVital, entity_id)
            patient_id = record.patient_id if record else None
        else:
            patient_id = (new_values or {}).get("patient_id")
        if not patient_id:
            return
        patient = db.get(Patient, patient_id)
        doctor_ids = [row[0] for row in db.query(Appointment.doctor_id).filter(Appointment.patient_id == patient_id).distinct().all()]
        notify_users(
            db,
            [doctor_user_id(value) for value in doctor_ids],
            actor_id=actor.id,
            notification_type=action,
            subject="Nursing record updated",
            body=f"A nurse added {'vitals' if action == 'patient_vital.recorded' else 'an observation'} for {patient.name if patient else 'a patient'}.",
            entity_type=resource_type,
            entity_id=entity_id,
        )
        return

    if action == "laboratory.order_created":
        order = db.get(LabOrder, entity_id)
        if order:
            notify_users(
                db,
                active_user_ids_for_roles(db, "lab_technician"),
                actor_id=actor.id,
                notification_type=action,
                subject="New laboratory order",
                body=f"A new lab order is ready for {db.get(Patient, order.patient_id).name if db.get(Patient, order.patient_id) else 'a patient'}.",
                entity_type="lab_order",
                entity_id=entity_id,
            )
        return

    if action == "laboratory.result_finalized":
        result = db.get(LabResult, entity_id)
        item = db.get(LabOrderItem, result.order_item_id) if result else None
        order = db.get(LabOrder, item.order_id) if item else None
        if order:
            notify_users(
                db,
                [doctor_user_id(order.doctor_id), patient_user_id(order.patient_id)],
                actor_id=actor.id,
                notification_type=action,
                subject="Lab result finalized",
                body="A laboratory result is finalized and ready to review.",
                entity_type="lab_order",
                entity_id=order.id,
            )
        return

    if action == "radiology.order_created":
        order = db.get(RadiologyOrder, entity_id)
        if order:
            notify_users(
                db,
                active_user_ids_for_roles(db, "radiologist"),
                actor_id=actor.id,
                notification_type=action,
                subject="New imaging order",
                body="A new imaging order is ready for review.",
                entity_type="radiology_order",
                entity_id=entity_id,
            )
        return

    if action == "radiology.report_finalized":
        report = db.get(RadiologyReport, entity_id)
        study = db.get(RadiologyStudy, report.study_id) if report else None
        order = db.get(RadiologyOrder, study.order_id) if study else None
        if order:
            notify_users(
                db,
                [doctor_user_id(order.doctor_id), patient_user_id(order.patient_id)],
                actor_id=actor.id,
                notification_type=action,
                subject="Radiology report finalized",
                body="An imaging report is finalized and ready to review.",
                entity_type="radiology_order",
                entity_id=order.id,
            )
        return

    if action.startswith("pharmacy.prescription_"):
        prescription_id = (
            (new_values or {}).get("prescription_id")
            if action == "pharmacy.prescription_dispensed"
            else entity_id
        )
        prescription = db.get(Prescription, prescription_id)
        appointment = db.get(Appointment, prescription.appointment_id) if prescription else None
        if appointment:
            state = action.removeprefix("pharmacy.prescription_").replace("_", " ")
            notify_users(
                db,
                [patient_user_id(appointment.patient_id), doctor_user_id(appointment.doctor_id)],
                actor_id=actor.id,
                notification_type=action,
                subject="Prescription update",
                body=f"The prescription is now {state}.",
                entity_type="prescription",
                entity_id=prescription_id,
            )
        return

    if action in {"billing.payment_collected", "accounting.payment_recorded"}:
        billing = db.get(Billing, entity_id)
        if billing:
            notify_users(
                db,
                [patient_user_id(billing.patient_id)],
                actor_id=actor.id,
                notification_type=action,
                subject="Payment received",
                body=f"Payment for invoice #{billing.id} was recorded successfully.",
                entity_type="billing",
                entity_id=billing.id,
            )
        return

    if action.startswith("insurance.claim_"):
        claim = db.get(InsuranceClaim, entity_id)
        patient_id = None
        if claim:
            policy = getattr(claim, "patient_id", None)
            patient_id = policy
            if patient_id is None and getattr(claim, "policy_id", None):
                from app.models.all_models import InsurancePolicy
                policy_record = db.get(InsurancePolicy, claim.policy_id)
                patient_id = policy_record.patient_id if policy_record else None
        if patient_id:
            recipients = [patient_user_id(patient_id)]
            if action == "insurance.claim_created":
                recipients.extend(active_user_ids_for_roles(db, "insurance_officer"))
            notify_users(
                db,
                recipients,
                actor_id=actor.id,
                notification_type=action,
                subject="Insurance claim update",
                body=f"Your insurance claim is now {getattr(claim, 'status', 'updated').replace('_', ' ')}.",
                entity_type="insurance_claim",
                entity_id=entity_id,
            )
        return

    if action == "staff.permissions.updated" and resource_type == "employee_permission":
        permission_record = db.get(EmployeePermission, entity_id)
        employee = db.get(Employee, permission_record.employee_id) if permission_record else None
        if employee:
            create_in_app_notification(
                db,
                user_id=employee.user_id,
                notification_type=action,
                subject="Page access updated",
                body="Your Receptionist page access was updated by an administrator.",
                entity_type="user",
                entity_id=employee.user_id,
            )
        return

    if action in {
        "staff.account_created",
        "staff.shift.updated",
        "staff.role.updated",
        "hospital_manager.activated",
        "admin.created",
        "admin.password_reset",
        "admin.activated",
    } and resource_type == "user":
        target = db.get(User, entity_id)
        if target and target.is_active:
            descriptions = {
                "staff.account_created": "Your hospital staff account is ready.",
                "staff.shift.updated": "Your working shift was updated by an administrator.",
                "staff.role.updated": "Your staff role and access were updated by an administrator.",
                "staff.permissions.updated": "Your page access was updated by an administrator.",
                "hospital_manager.activated": "Your Hospital Manager account was activated.",
                "admin.created": "Your Administrator account is ready.",
                "admin.password_reset": "Your account password was reset by a Super Administrator.",
                "admin.activated": "Your Administrator account was activated.",
            }
            create_in_app_notification(
                db,
                user_id=target.id,
                notification_type=action,
                subject="Account access updated",
                body=descriptions[action],
                entity_type="user",
                entity_id=target.id,
            )
        return

    if action in {"role_permission.granted", "role_permission.revoked"}:
        values = new_values if action.endswith("granted") else old_values
        role = (values or {}).get("role")
        if role:
            notify_users(
                db,
                active_user_ids_for_roles(db, role),
                actor_id=actor.id,
                notification_type=f"{action}.{entity_id}",
                subject="Role access updated",
                body="Your role permissions were updated by a Super Administrator.",
                entity_type="role_permission",
                entity_id=entity_id,
            )
        return

    if action == "ambulance.request_created":
        request = db.get(AmbulanceRequest, entity_id)
        recipients = active_user_ids_for_roles(db, "ambulance_staff", "hospital_manager", "admin")
        if request and getattr(request, "patient_id", None):
            recipients.append(patient_user_id(request.patient_id))
        notify_users(
            db,
            recipients,
            actor_id=actor.id,
            notification_type=action,
            subject="New ambulance request",
            body="A new transport request is waiting for dispatch.",
            entity_type="ambulance_request",
            entity_id=entity_id,
        )
        return

    if action.startswith("ambulance.") and resource_type == "ambulance_trip":
        from app.models.all_models import AmbulanceTrip

        trip = db.get(AmbulanceTrip, entity_id)
        ambulance_request = db.get(AmbulanceRequest, trip.request_id) if trip else None
        if ambulance_request and ambulance_request.patient_id:
            status = (new_values or {}).get("status", trip.status if trip else "updated")
            notify_users(
                db,
                [patient_user_id(ambulance_request.patient_id)],
                actor_id=actor.id,
                notification_type=f"{action}.{status}",
                subject="Ambulance trip update",
                body=f"Your ambulance request is now {str(status).replace('_', ' ')}.",
                entity_type="ambulance_request",
                entity_id=ambulance_request.id,
            )
