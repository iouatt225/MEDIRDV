"""
MediRDV CI — Logique métier et recherche de médecins.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import math
from typing import Any
from uuid import UUID

from werkzeug.exceptions import NotFound

from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilitySlot,
    BlockedSlot,
    DoctorProfile,
    PatientProfile,
    User,
    UserRole,
)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance géodésique en kilomètres entre deux points."""
    R = 6371.0  # Rayon de la Terre en km

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_upcoming_slots(doctor_id: UUID, days: int = 7, limit: int = 3) -> list[datetime]:
    """Calcule à la volée les prochains créneaux de disponibilité d'un médecin.

    Prend les créneaux réguliers, et soustrait les rendez-vous réservés
    ainsi que les plages bloquées.
    """
    now = datetime.now()
    end_date = now + timedelta(days=days)

    # 1. Charger la configuration des disponibilités récurrentes du médecin
    recurrent_slots = AvailabilitySlot.query.filter_by(doctor_id=doctor_id).all()

    # 2. Charger les plages bloquées
    blocked_slots = BlockedSlot.query.filter(
        BlockedSlot.doctor_id == doctor_id,
        BlockedSlot.end_datetime >= now,
        BlockedSlot.start_datetime <= end_date,
    ).all()

    # 3. Charger les rendez-vous déjà réservés et confirmés
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == AppointmentStatus.CONFIRME,
        Appointment.slot_end >= now,
        Appointment.slot_start <= end_date,
    ).all()

    available_slots: list[datetime] = []

    # 4. Parcourir chaque jour de l'intervalle pour générer les occurrences
    for d_offset in range(days + 1):
        target_date = (now + timedelta(days=d_offset)).date()
        day_of_week = target_date.weekday()  # 0 = Lundi, 6 = Dimanche

        for slot in recurrent_slots:
            if slot.day_of_week != day_of_week:
                continue

            curr_time = datetime.combine(target_date, slot.start_time)
            end_time_limit = datetime.combine(target_date, slot.end_time)

            # Génération par intervalle duration_min
            while curr_time + timedelta(minutes=slot.duration_min) <= end_time_limit:
                s_start = curr_time
                s_end = curr_time + timedelta(minutes=slot.duration_min)

                # Écarter les créneaux passés
                if s_start <= now:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                # Écarter les chevauchements avec les plages bloquées
                overlaps_blocked = False
                for bs in blocked_slots:
                    if s_start < bs.end_datetime and s_end > bs.start_datetime:
                        overlaps_blocked = True
                        break
                if overlaps_blocked:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                # Écarter les chevauchements avec les rendez-vous
                overlaps_appt = False
                for appt in appointments:
                    if s_start < appt.slot_end and s_end > appt.slot_start:
                        overlaps_appt = True
                        break
                if overlaps_appt:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                available_slots.append(s_start)
                curr_time += timedelta(minutes=slot.duration_min)

    available_slots.sort()
    return available_slots[:limit]


def search_doctors(
    filters: dict[str, Any], page: int = 1, per_page: int = 10
) -> tuple[list[DoctorProfile], int]:
    """Recherche des médecins actifs selon spécialité, ville et localisation géographique."""
    query = DoctorProfile.query.join(User).filter(User.is_active == True)

    # Filtrer par spécialité (ilike)
    specialty = filters.get("specialty")
    if specialty:
        query = query.filter(DoctorProfile.specialty.ilike(f"%{specialty}%"))

    # Filtrer par ville (ilike dans l'adresse)
    city = filters.get("city")
    if city:
        query = query.filter(DoctorProfile.address.ilike(f"%{city}%"))

    doctors = query.all()

    # Filtrer par coordonnées (Haversine)
    lat = filters.get("lat")
    lng = filters.get("lng")
    if lat is not None and lng is not None:
        radius = filters.get("radius", 15.0)  # Rayon de 15km par défaut
        filtered: list[DoctorProfile] = []
        for doc in doctors:
            if doc.latitude is not None and doc.longitude is not None:
                dist = haversine_distance(lat, lng, doc.latitude, doc.longitude)
                if dist <= radius:
                    filtered.append(doc)
        doctors = filtered

    # Pagination manuelle du résultat filtré
    total = len(doctors)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_doctors = doctors[start_idx:end_idx]

    # Calcul des créneaux disponibles à la volée pour les résultats affichés
    for doc in paginated_doctors:
        doc.upcoming_availabilities = get_upcoming_slots(doc.user_id)  # type: ignore[attr-defined]

    return paginated_doctors, total


def update_user_profile(user_id: UUID, data: dict[str, Any]) -> User:
    """Met à jour les informations d'un utilisateur et de son profil spécifique."""
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFound("Utilisateur introuvable.")

    # Mise à jour des informations utilisateur
    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "email" in data:
        user.email = data["email"]
    if "phone" in data:
        user.phone = data["phone"]

    # Mise à jour du profil spécifique selon le rôle
    if user.role == UserRole.PATIENT and user.patient_profile:
        patient = user.patient_profile
        if "date_of_birth" in data:
            patient.date_of_birth = data["date_of_birth"]
        if "phone_secondary" in data:
            patient.phone_secondary = data["phone_secondary"]
        if "address" in data:
            patient.address = data["address"]
    elif user.role == UserRole.MEDECIN and user.doctor_profile:
        doctor = user.doctor_profile
        if "specialty" in data:
            doctor.specialty = data["specialty"]
        if "cabinet_name" in data:
            doctor.cabinet_name = data["cabinet_name"]
        if "address" in data:
            doctor.address = data["address"]
        if "bio" in data:
            doctor.bio = data["bio"]
        if "languages" in data:
            doctor.languages = data["languages"]
        if "fee" in data:
            doctor.fee = data["fee"]
        if "photo_url" in data:
            doctor.photo_url = data["photo_url"]
        if "latitude" in data:
            doctor.latitude = data["latitude"]
        if "longitude" in data:
            doctor.longitude = data["longitude"]

    db.session.commit()
    return user
