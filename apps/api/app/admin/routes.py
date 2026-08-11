"""
MediRDV CI — Routes du module ``admin``.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, or_
from werkzeug.exceptions import BadRequest, Forbidden, NotFound

from app.auth.decorators import require_role
from app.extensions import db, redis_client
from app.models import (
    AdminActionLog,
    Appointment,
    AppointmentStatus,
    ConsultationType,
    SecretaryDoctor,
    SecretaryDoctorStatus,
    User,
    UserRole,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1")


def _count_users(role: UserRole | None = None, active: bool | None = None) -> int:
    query = db.session.query(func.count(User.id)).select_from(User)
    if role is not None:
        query = query.filter(User.role == role)
    if active is not None:
        query = query.filter(User.is_active.is_(active))
    return int(query.scalar() or 0)


def _count_appointments(
    status: AppointmentStatus | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> int:
    query = db.session.query(func.count(Appointment.id)).select_from(Appointment)
    if status is not None:
        query = query.filter(Appointment.status == status)
    if start is not None:
        query = query.filter(Appointment.slot_start >= start)
    if end is not None:
        query = query.filter(Appointment.slot_start < end)
    return int(query.scalar() or 0)


def _serialize_user(user: User) -> dict[str, Any]:
    profile_summary = None
    if user.role == UserRole.MEDECIN and user.doctor_profile:
        profile_summary = (
            user.doctor_profile.specialty
            or user.doctor_profile.cabinet_name
            or "Profil médecin"
        )
    elif user.role == UserRole.PATIENT and user.patient_profile:
        profile_summary = user.patient_profile.address or "Profil patient"
    elif user.role == UserRole.SECRETAIRE:
        profile_summary = "Secrétaire médicale"

    return {
        "id": str(user.id),
        "role": user.role.value,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "profile_summary": profile_summary,
    }


def _parse_bool_param(value: str | None) -> bool | None:
    if value is None or value == "":
        return None
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes", "oui"}:
        return True
    if normalized in {"false", "0", "no", "non"}:
        return False
    raise BadRequest("is_active invalide.")


def _build_activity_series(days: int = 14) -> list[dict[str, Any]]:
    start_date = (datetime.now().date() - timedelta(days=days - 1))
    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(datetime.now().date() + timedelta(days=1), time.min)

    series: dict[str, dict[str, Any]] = {}
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        key = day.isoformat()
        series[key] = {
            "date": key,
            "label": day.strftime("%d/%m"),
            "appointments": 0,
            "presentiel_appointments": 0,
            "video_appointments": 0,
            "confirmed": 0,
            "cancelled": 0,
            "completed": 0,
            "missed": 0,
            "new_users": 0,
            "new_doctors": 0,
            "new_patients": 0,
            "new_secretaries": 0,
            "new_admins": 0,
        }

    appointments = (
        db.session.query(Appointment)
        .filter(Appointment.slot_start >= start_dt, Appointment.slot_start < end_dt)
        .all()
    )
    for appt in appointments:
        key = appt.slot_start.date().isoformat()
        bucket = series.get(key)
        if bucket is None:
            continue
        bucket["appointments"] += 1
        if appt.type == ConsultationType.VIDEO:
            bucket["video_appointments"] += 1
        else:
            bucket["presentiel_appointments"] += 1
        if appt.status == AppointmentStatus.CONFIRME:
            bucket["confirmed"] += 1
        elif appt.status == AppointmentStatus.ANNULE:
            bucket["cancelled"] += 1
        elif appt.status == AppointmentStatus.EFFECTUE:
            bucket["completed"] += 1
        elif appt.status == AppointmentStatus.MANQUE:
            bucket["missed"] += 1

    users = (
        db.session.query(User)
        .filter(User.created_at >= start_dt, User.created_at < end_dt)
        .all()
    )
    for user in users:
        key = user.created_at.date().isoformat() if user.created_at else None
        if key is None:
            continue
        bucket = series.get(key)
        if bucket is None:
            continue
        bucket["new_users"] += 1
        if user.role == UserRole.MEDECIN:
            bucket["new_doctors"] += 1
        elif user.role == UserRole.PATIENT:
            bucket["new_patients"] += 1
        elif user.role == UserRole.SECRETAIRE:
            bucket["new_secretaries"] += 1
        elif user.role == UserRole.ADMIN:
            bucket["new_admins"] += 1

    return list(series.values())


def _serialize_admin_action(action: AdminActionLog) -> dict[str, Any]:
    admin_name = None
    if action.admin:
        admin_name = f"{action.admin.first_name} {action.admin.last_name}"

    target_name = None
    if action.target_user:
        target_name = f"{action.target_user.first_name} {action.target_user.last_name}"

    return {
        "id": str(action.id),
        "action": action.action,
        "admin_id": str(action.admin_id),
        "admin_name": admin_name,
        "target_user_id": str(action.target_user_id),
        "target_user_name": target_name,
        "previous_is_active": action.previous_is_active,
        "new_is_active": action.new_is_active,
        "note": action.note,
        "created_at": action.created_at.isoformat() if action.created_at else None,
    }


def _serialize_appointment(appt: Appointment) -> dict[str, Any]:
    doctor_name = None
    patient_name = None
    if appt.doctor:
        doctor_name = f"{appt.doctor.first_name} {appt.doctor.last_name}"
    if appt.patient:
        patient_name = f"{appt.patient.first_name} {appt.patient.last_name}"

    return {
        "id": str(appt.id),
        "doctor_id": str(appt.doctor_id),
        "doctor_name": doctor_name,
        "patient_id": str(appt.patient_id),
        "patient_name": patient_name,
        "slot_start": appt.slot_start.isoformat(),
        "slot_end": appt.slot_end.isoformat(),
        "type": appt.type.value,
        "status": appt.status.value,
        "reason": appt.reason,
        "created_at": appt.created_at.isoformat() if appt.created_at else None,
    }


def _system_health() -> dict[str, str]:
    health: dict[str, str] = {"database": "disconnected", "redis": "disconnected"}

    try:
        db.session.execute(db.text("SELECT 1"))
        health["database"] = "connected"
    except Exception:
        health["database"] = "disconnected"

    try:
        if redis_client is not None:
            redis_client.ping()
            health["redis"] = "connected"
        else:
            health["redis"] = "not_configured"
    except Exception:
        health["redis"] = "disconnected"

    return health


def _users_query() -> Any:
    query = db.session.query(User).order_by(User.created_at.desc(), User.id.desc())
    search = (request.args.get("search") or "").strip()
    role = (request.args.get("role") or "").strip()
    is_active = _parse_bool_param(request.args.get("is_active"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.email.ilike(pattern),
            )
        )

    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError as exc:
            raise BadRequest("Rôle invalide.") from exc

    if is_active is not None:
        query = query.filter(User.is_active.is_(is_active))

    return query


def _get_user_detail(user: User) -> dict[str, Any]:
    appointments_query = (
        db.session.query(Appointment)
        .filter(
            or_(
                Appointment.doctor_id == user.id,
                Appointment.patient_id == user.id,
            )
        )
    )

    if user.role in {UserRole.MEDECIN, UserRole.PATIENT}:
        related_appointments = (
            appointments_query.order_by(Appointment.slot_start.desc()).limit(10).all()
        )
    else:
        related_appointments = []

    appointments_total = appointments_query.count()
    appointments_confirmed = appointments_query.filter(
        Appointment.status == AppointmentStatus.CONFIRME
    ).count()
    appointments_cancelled = appointments_query.filter(
        Appointment.status == AppointmentStatus.ANNULE
    ).count()
    appointments_effectue = appointments_query.filter(
        Appointment.status == AppointmentStatus.EFFECTUE
    ).count()
    appointments_manque = appointments_query.filter(
        Appointment.status == AppointmentStatus.MANQUE
    ).count()
    upcoming_appointments = appointments_query.filter(
        Appointment.slot_start >= datetime.now()
    ).count()

    action_history = (
        db.session.query(AdminActionLog)
        .filter(AdminActionLog.target_user_id == user.id)
        .order_by(AdminActionLog.created_at.desc(), AdminActionLog.id.desc())
        .limit(10)
        .all()
    )

    return {
        "user": _serialize_user(user),
        "stats": {
            "appointments_total": appointments_total,
            "appointments_confirmed": appointments_confirmed,
            "appointments_cancelled": appointments_cancelled,
            "appointments_effectue": appointments_effectue,
            "appointments_manque": appointments_manque,
            "upcoming_appointments": upcoming_appointments,
        },
        "related_appointments": [_serialize_appointment(appt) for appt in related_appointments],
        "action_history": [_serialize_admin_action(item) for item in action_history],
        "actions": {
            "is_self": False,
            "can_disable": user.is_active,
            "can_enable": not user.is_active,
            "last_admin_protection": user.role == UserRole.ADMIN,
        },
    }


@admin_bp.route("/admin/users", methods=["GET"])
@require_role("admin")
def list_users() -> Any:
    """Retourne les utilisateurs filtrés pour l'administration."""
    query = _users_query()

    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 12)), 1), 50)
    except ValueError as exc:
        raise BadRequest("Paramètres de pagination invalides.") from exc

    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()

    summary = [
        {"role": role.value, "label": role.value, "count": _count_users(role)}
        for role in UserRole
    ]

    return (
        jsonify(
            {
                "users": [_serialize_user(user) for user in users],
                "total": total,
                "page": page,
                "per_page": per_page,
                "summary": summary,
            }
        ),
        200,
    )


@admin_bp.route("/admin/users/<string:user_id>", methods=["GET"])
@require_role("admin")
def get_user_detail(user_id: str) -> Any:
    """Retourne le détail admin d'un utilisateur."""
    try:
        target_uuid = UUID(user_id)
    except ValueError as exc:
        raise BadRequest("Identifiant utilisateur invalide.") from exc

    target = db.session.get(User, target_uuid)
    if target is None:
        raise NotFound("Utilisateur introuvable.")

    detail = _get_user_detail(target)
    current_user_id = UUID(get_jwt_identity())
    active_admins = _count_users(UserRole.ADMIN, active=True)

    detail["actions"].update(
        {
            "is_self": target.id == current_user_id,
            "can_disable": (
                target.is_active
                and target.id != current_user_id
                and not (target.role == UserRole.ADMIN and active_admins <= 1)
            ),
            "can_enable": not target.is_active,
            "is_last_admin": target.role == UserRole.ADMIN and active_admins <= 1,
        }
    )

    return jsonify(detail), 200


@admin_bp.route("/admin/users/<string:user_id>/status", methods=["PATCH"])
@require_role("admin")
def toggle_user_status(user_id: str) -> Any:
    """Active ou désactive un compte utilisateur."""
    try:
        target_uuid = UUID(user_id)
    except ValueError as exc:
        raise BadRequest("Identifiant utilisateur invalide.") from exc

    target = db.session.get(User, target_uuid)
    if target is None:
        raise NotFound("Utilisateur introuvable.")

    payload = request.get_json(silent=True) or {}
    if "is_active" not in payload:
        raise BadRequest("Le champ is_active est obligatoire.")

    new_status = bool(payload["is_active"])
    current_user_id = UUID(get_jwt_identity())

    if target.id == current_user_id and not new_status:
        raise Forbidden("Vous ne pouvez pas désactiver votre propre compte.")

    if target.role == UserRole.ADMIN and not new_status:
        active_admins = (
            db.session.query(func.count(User.id))
            .filter(User.role == UserRole.ADMIN, User.is_active.is_(True))
            .scalar()
            or 0
        )
        if target.is_active and active_admins <= 1:
            raise Forbidden("Impossible de désactiver le dernier administrateur actif.")

    if target.is_active == new_status:
        return (
            jsonify(
                {
                    "message": "Statut utilisateur deja a jour.",
                    "user": _serialize_user(target),
                }
            ),
            200,
        )

    previous_status = target.is_active
    target.is_active = new_status
    current_user = db.session.get(User, current_user_id)
    db.session.add(
        AdminActionLog(
            admin_id=current_user_id,
            target_user_id=target.id,
            action="toggle_user_status",
            previous_is_active=previous_status,
            new_is_active=new_status,
            note=(
                f"Compte {'reactive' if new_status else 'desactive'}"
                + (f" par {current_user.first_name} {current_user.last_name}" if current_user else "")
            ),
        )
    )
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Statut utilisateur mis à jour avec succès.",
                "user": _serialize_user(target),
            }
        ),
        200,
    )


@admin_bp.route("/admin/dashboard", methods=["GET"])
@require_role("admin")
def dashboard() -> Any:
    """Retourne une vue d'ensemble administrative de la plateforme."""
    now = datetime.now()
    start_of_week = datetime.combine(
        now.date() - timedelta(days=now.weekday()),
        datetime.min.time(),
    )
    end_of_week = start_of_week + timedelta(days=7)

    doctor_count = _count_users(UserRole.MEDECIN)
    patient_count = _count_users(UserRole.PATIENT)
    secretary_count = _count_users(UserRole.SECRETAIRE)
    admin_count = _count_users(UserRole.ADMIN)
    active_user_count = _count_users(active=True)
    active_doctor_count = (
        db.session.query(func.count(User.id))
        .select_from(User)
        .filter(User.role == UserRole.MEDECIN, User.is_active.is_(True))
        .scalar()
        or 0
    )

    active_link_count = (
        db.session.query(func.count(SecretaryDoctor.id))
        .filter(SecretaryDoctor.status == SecretaryDoctorStatus.ACTIVE)
        .scalar()
        or 0
    )

    overview = {
        "total_users": _count_users(),
        "active_users": active_user_count,
        "doctors": doctor_count,
        "active_doctors": int(active_doctor_count),
        "patients": patient_count,
        "secretaries": secretary_count,
        "admins": admin_count,
        "active_secretary_links": int(active_link_count),
        "appointments_total": _count_appointments(),
        "appointments_confirmed": _count_appointments(AppointmentStatus.CONFIRME),
        "appointments_cancelled": _count_appointments(AppointmentStatus.ANNULE),
        "appointments_effectue": _count_appointments(AppointmentStatus.EFFECTUE),
        "appointments_manque": _count_appointments(AppointmentStatus.MANQUE),
        "appointments_week": _count_appointments(start=start_of_week, end=end_of_week),
        "appointments_week_confirmed": _count_appointments(
            AppointmentStatus.CONFIRME,
            start_of_week,
            end_of_week,
        ),
        "appointments_week_cancelled": _count_appointments(
            AppointmentStatus.ANNULE,
            start_of_week,
            end_of_week,
        ),
        "video_appointments_week": (
            db.session.query(func.count(Appointment.id))
            .filter(
                Appointment.type == ConsultationType.VIDEO,
                Appointment.status == AppointmentStatus.CONFIRME,
                Appointment.slot_start >= start_of_week,
                Appointment.slot_start < end_of_week,
            )
            .scalar()
            or 0
        ),
    }

    total_for_ratio = overview["doctors"] + overview["patients"] + overview["secretaries"] + overview["admins"]
    role_distribution = [
        {"role": "admin", "label": "Administrateurs", "count": admin_count},
        {"role": "medecin", "label": "Médecins", "count": doctor_count},
        {"role": "secretaire", "label": "Secrétaires", "count": secretary_count},
        {"role": "patient", "label": "Patients", "count": patient_count},
    ]

    recent_users = (
        db.session.query(User)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(8)
        .all()
    )
    recent_appointments = (
        db.session.query(Appointment)
        .order_by(Appointment.created_at.desc(), Appointment.slot_start.desc())
        .limit(8)
        .all()
    )
    activity_series = _build_activity_series(30)
    appointment_status_breakdown = [
        {"status": "confirme", "label": "Confirmés", "count": _count_appointments(AppointmentStatus.CONFIRME)},
        {"status": "annule", "label": "Annulés", "count": _count_appointments(AppointmentStatus.ANNULE)},
        {"status": "effectue", "label": "Effectués", "count": _count_appointments(AppointmentStatus.EFFECTUE)},
        {"status": "manque", "label": "Manqués", "count": _count_appointments(AppointmentStatus.MANQUE)},
    ]

    return (
        jsonify(
            {
                "overview": overview,
                "role_distribution": role_distribution,
                "activity_series": activity_series,
                "appointment_status_breakdown": appointment_status_breakdown,
                "recent_users": [_serialize_user(user) for user in recent_users],
                "recent_appointments": [
                    _serialize_appointment(appt) for appt in recent_appointments
                ],
                "system": _system_health(),
                "meta": {
                    "snapshot_at": now.isoformat(),
                    "role_total": total_for_ratio,
                },
            }
        ),
        200,
    )
