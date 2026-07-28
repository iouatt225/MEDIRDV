"""
MediRDV CI — Contrôleurs et routes pour le module ``dashboard``.
"""

from __future__ import annotations

import csv
from datetime import datetime, timedelta
from io import StringIO
from typing import Any
from uuid import UUID

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import get_jwt_identity, get_jwt, jwt_required

from app.agenda.services import calculate_availabilities
from app.auth.decorators import require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, ConsultationType, SecretaryDoctor, SecretaryDoctorStatus, User, UserRole

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/v1")


@dashboard_bp.route("/dashboard/doctor", methods=["GET"])
@require_role("medecin")
def get_doctor_dashboard() -> Any:
    """Retourne les indicateurs de performance (KPIs) pour le médecin connecté."""
    doctor_id = UUID(get_jwt_identity())

    # Fenêtre : début de la semaine actuelle (lundi) à la fin de la semaine (dimanche)
    now = datetime.now()
    start_of_week = datetime.combine(now.date() - timedelta(days=now.weekday()), datetime.min.time())
    end_of_week = start_of_week + timedelta(days=7)

    # 1. Nombre de RDV de la semaine (confirmés)
    weekly_appointments = (
        db.session.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.slot_start >= start_of_week,
            Appointment.slot_start < end_of_week,
            Appointment.status == AppointmentStatus.CONFIRME,
        )
        .count()
    )

    # 2. Nombre d'annulations de la semaine
    weekly_cancellations = (
        db.session.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.slot_start >= start_of_week,
            Appointment.slot_start < end_of_week,
            Appointment.status == AppointmentStatus.ANNULE,
        )
        .count()
    )

    # 3. Nombre de téléconsultations de la semaine
    weekly_video_consultations = (
        db.session.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.slot_start >= start_of_week,
            Appointment.slot_start < end_of_week,
            Appointment.type == ConsultationType.VIDEO,
            Appointment.status == AppointmentStatus.CONFIRME,
        )
        .count()
    )

    # 4. Taux de remplissage
    # Calculé comme : RDV confirmés / (RDV confirmés + Créneaux libres réels)
    free_slots = calculate_availabilities(doctor_id, start_of_week, end_of_week)
    total_slots = weekly_appointments + len(free_slots)
    filling_rate = (weekly_appointments / total_slots * 100) if total_slots > 0 else 0.0

    return (
        jsonify(
            {
                "weekly_appointments": weekly_appointments,
                "weekly_cancellations": weekly_cancellations,
                "weekly_video_consultations": weekly_video_consultations,
                "filling_rate": round(filling_rate, 2),
            }
        ),
        200,
    )


@dashboard_bp.route("/appointments/export", methods=["GET"])
@jwt_required()
def export_appointments() -> Any:
    """Exporte les rendez-vous d'un médecin au format CSV."""
    current_user_id = UUID(get_jwt_identity())
    claims = get_jwt()
    current_role = claims.get("role")

    if current_role not in [UserRole.MEDECIN.value, UserRole.SECRETAIRE.value]:
        return jsonify({"error": "forbidden", "message": "Accès réservé."}), 403

    doctor_id_str = request.args.get("doctor_id")
    if current_role == UserRole.MEDECIN.value:
        doctor_id = current_user_id
    else:
        # Secrétaire : vérifie son lien d'accès au médecin spécifié
        if not doctor_id_str:
            return jsonify({"error": "bad_request", "message": "doctor_id requis."}), 400
        try:
            doctor_id = UUID(doctor_id_str)
        except ValueError:
            return jsonify({"error": "bad_request", "message": "doctor_id invalide."}), 400

        link = SecretaryDoctor.query.filter_by(
            secretary_id=current_user_id,
            doctor_id=doctor_id,
            status=SecretaryDoctorStatus.ACTIVE,
        ).first()
        if not link:
            return jsonify({"error": "forbidden", "message": "Non rattaché à ce médecin."}), 403

    from_str = request.args.get("from")
    to_str = request.args.get("to")

    query = Appointment.query.filter(Appointment.doctor_id == doctor_id)

    if from_str:
        try:
            query = query.filter(Appointment.slot_start >= datetime.fromisoformat(from_str))
        except ValueError:
            return jsonify({"error": "bad_request", "message": "Date de début 'from' invalide."}), 400
    if to_str:
        try:
            query = query.filter(Appointment.slot_start <= datetime.fromisoformat(to_str))
        except ValueError:
            return jsonify({"error": "bad_request", "message": "Date de fin 'to' invalide."}), 400

    appointments = query.order_by(Appointment.slot_start.asc()).all()

    # Génération du CSV en mémoire
    si = StringIO()
    cw = csv.writer(si)
    # En-têtes sans informations médicales sensibles
    cw.writerow(["id", "patient_name", "slot_start", "slot_end", "type", "status", "reason"])

    for appt in appointments:
        patient = appt.patient
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Inconnu"
        cw.writerow(
            [
                str(appt.id),
                patient_name,
                appt.slot_start.isoformat(),
                appt.slot_end.isoformat(),
                appt.type.value,
                appt.status.value,
                appt.reason or "",
            ]
        )

    response = Response(si.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=appointments.csv"
    return response
