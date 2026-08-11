from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import bcrypt, db
from app.models import (
    DoctorProfile,
    PatientProfile,
    SecretaryDoctor,
    SecretaryDoctorStatus,
    User,
    UserRole,
)


def init_db():
    app = create_app("development")

    with app.app_context():
        print("Création des tables dans la base de données locale...")
        db.create_all()
        print("Base de données initialisée.")

        # Hachage des mots de passe de test
        hashed_password = bcrypt.generate_password_hash("password").decode("utf-8")
        admin_password_hash = bcrypt.generate_password_hash("Admin123").decode("utf-8")

        # 0. Création de l'admin de test
        admin_phone = "+22509999999"
        admin_user = User.query.filter_by(phone=admin_phone).first()
        if not admin_user:
            print("Création de l'admin de test...")
            admin_user = User(
                role=UserRole.ADMIN,
                phone=admin_phone,
                email="admin@medirdv.ci",
                password_hash=admin_password_hash,
                first_name="MediRDV",
                last_name="Admin",
                is_active=True,
            )
            db.session.add(admin_user)
            print(f"Admin créé : ID={admin_user.id}")
        else:
            print("L'admin de test existe déjà.")

        # 1. Création du médecin de test
        doctor_phone = "+2250102030405"
        doctor_user = User.query.filter_by(phone=doctor_phone).first()
        if not doctor_user:
            print("Création du médecin de test...")
            doctor_user = User(
                role=UserRole.MEDECIN,
                phone=doctor_phone,
                email="dr.dupont@medirdv.ci",
                password_hash=hashed_password,
                first_name="Jean",
                last_name="Dupont",
                is_active=True,
            )
            db.session.add(doctor_user)
            db.session.flush()  # pour avoir l'ID du user

            doctor_profile = DoctorProfile(
                user_id=doctor_user.id,
                specialty="Cardiologue",
                cabinet_name="Clinique des Spécialités Cocody",
                address="Boulevard Latrille, Cocody, Abidjan",
                bio="Cardiologue expert avec plus de 10 ans d'expérience.",
                fee=20000,
                cancellation_delay_hours=24,
            )
            db.session.add(doctor_profile)
            print(f"Médecin créé : ID={doctor_user.id}")
        else:
            print("Le médecin de test existe déjà.")

        # 2. Création du patient de test
        patient_phone = "+2250506070809"
        patient_user = User.query.filter_by(phone=patient_phone).first()
        if not patient_user:
            print("Création du patient de test...")
            patient_user = User(
                role=UserRole.PATIENT,
                phone=patient_phone,
                email="patient.test@mail.com",
                password_hash=hashed_password,
                first_name="Awa",
                last_name="Koffi",
                is_active=True,
            )
            db.session.add(patient_user)
            db.session.flush()

            patient_profile = PatientProfile(
                user_id=patient_user.id,
                date_of_birth=None,
            )
            db.session.add(patient_profile)
            print(f"Patient créé : ID={patient_user.id}")
        else:
            print("Le patient de test existe déjà.")

        # 3. Création de la secrétaire de test
        secretary_phone = "+2250708091011"
        secretary_user = User.query.filter_by(phone=secretary_phone).first()
        if not secretary_user:
            print("Création de la secrétaire de test...")
            secretary_user = User(
                role=UserRole.SECRETAIRE,
                phone=secretary_phone,
                email="secretaire@medirdv.ci",
                password_hash=hashed_password,
                first_name="Marie",
                last_name="Koné",
                is_active=True,
            )
            db.session.add(secretary_user)
            db.session.flush()

            # Associer la secrétaire au médecin
            sec_doc = SecretaryDoctor(
                secretary_id=secretary_user.id,
                doctor_id=doctor_user.id,
                status=SecretaryDoctorStatus.ACTIVE,
            )
            db.session.add(sec_doc)
            print(
                f"Secrétaire créée : ID={secretary_user.id} "
                f"(associée au médecin)"
            )
        else:
            print("La secrétaire de test existe déjà.")

        db.session.commit()
        print("Toutes les donnees de test ont ete inserees avec succes !")


if __name__ == "__main__":
    init_db()
