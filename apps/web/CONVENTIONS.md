# MediRDV CI — Conventions Frontend

> Ce document fait référence pour toute contribution au dossier `apps/web`.

---

## 1. Stack technique

| Couche             | Technologie                                  | Version ciblée |
| ------------------ | -------------------------------------------- | -------------- |
| Framework          | **Next.js 14** (App Router)                  | 14.x           |
| Langage            | **TypeScript** (`strict`, `strictNullChecks`, `noImplicitAny`) | 5.x |
| Styles             | **Tailwind CSS** (design system dérivé de Pluxes) | 3.x        |
| Agenda             | **FullCalendar.io** (vues jour / semaine / mois) | 6.x         |
| Cache serveur      | **React Query** (TanStack Query)             | 5.x            |
| État UI local      | **Zustand** (pas de Redux)                   | 4.x            |
| Validation         | **Zod** (formulaires côté client)            | 3.x            |
| Vidéo              | **SDK Daily.co** (ou Whereby, à confirmer)   | —              |
| Backend consommé   | API REST Flask — endpoints sous `/api/v1/…`  | —              |

---

## 2. Structure de dossiers

```
apps/web/
├── app/
│   ├── (public)/                 → pages publiques (accueil, recherche, profil médecin)
│   ├── (auth)/                   → login, register, reset-password
│   ├── (patient)/                → espace patient (protégé, rôle = patient)
│   ├── (praticien)/              → espace médecin + secrétaire (protégé)
│   ├── (teleconsult)/[roomId]/   → session vidéo
│   └── layout.tsx                → layout racine
├── components/
│   ├── ui/                       → composants de base (design system Pluxes)
│   ├── agenda/                   → composants calendrier / FullCalendar
│   ├── appointments/             → composants rendez-vous
│   ├── auth/                     → composants authentification
│   └── notifications/            → composants notifications
├── lib/
│   ├── api/                      → client HTTP + hooks React Query par domaine
│   ├── auth/                     → gestion JWT / refresh, contexte rôle
│   └── validation/               → schémas Zod
├── stores/                       → stores Zustand
├── types/                        → types partagés (miroir des DTO backend)
└── styles/                       → fichiers CSS globaux, tokens Tailwind
```

---

## 3. Conventions de nommage

| Élément                   | Convention      | Exemple                          |
| ------------------------- | --------------- | -------------------------------- |
| Composants React          | `PascalCase`    | `AppointmentCard.tsx`            |
| Fonctions / variables     | `camelCase`     | `fetchAppointments`, `isLoading` |
| Routes fichiers Next.js   | `kebab-case`    | `reset-password/page.tsx`        |
| Types / Interfaces        | `PascalCase`    | `Appointment`, `UserDTO`         |
| Stores Zustand            | `camelCase`     | `useAgendaStore.ts`              |
| Hooks custom              | `camelCase`     | `useAppointments.ts`             |

---

## 4. Règles de code

1. **Composants fonctionnels uniquement** — pas de classes React.
2. **Un composant = un fichier** — colocation des classes Tailwind dans le JSX (pas de CSS modules séparés).
3. **Hooks** pour toute logique réutilisable.
4. **TypeScript strict** — `strictNullChecks: true`, `noImplicitAny: true`.
5. **Validation** — tout formulaire côté client utilise un schéma Zod.
6. **État serveur** — React Query (TanStack) pour le fetching, le cache et les mutations.
7. **État UI** — Zustand pour l'état purement côté client (sidebar ouverte, modal visible, etc.).

---

## 5. Langue de l'interface

Toutes les chaînes visibles par l'utilisateur sont rédigées en **français** (marché ivoirien).
Les noms de variables, fonctions, composants et commentaires techniques restent en **anglais**.

---

## 6. Qualité & outillage

| Outil       | Rôle                                        | Bloquant ? |
| ----------- | -------------------------------------------- | ---------- |
| ESLint      | Analyse statique, règles Next.js + TypeScript | ✅ Oui     |
| Prettier    | Formatage automatique                         | ✅ Oui     |

---

## 7. Commits

Convention **Conventional Commits** obligatoire :

```
feat:   nouvelle fonctionnalité
fix:    correction de bug
chore:  maintenance / dépendances
docs:   documentation
refactor: refactorisation sans changement fonctionnel
style:  formatage (pas de changement logique)
test:   ajout / modification de tests
```

Format : `<type>(<scope optionnel>): <description courte en minuscules>`

Exemples :
- `feat(agenda): ajouter la vue semaine FullCalendar`
- `fix(auth): corriger le refresh token expiré`
- `chore: mettre à jour les dépendances Tailwind`

---

## 8. Profils utilisateur

| Profil                | Rôle dans l'application                                  |
| --------------------- | -------------------------------------------------------- |
| **Patient**           | Recherche de médecin, prise de RDV, téléconsultation     |
| **Médecin Spécialiste** | Gestion agenda, consultation RDV, téléconsultation      |
| **Secrétaire Médicale** | Gestion agenda du médecin, prise de RDV pour patients  |

---

## 9. API Backend

- Base URL : configurée via variable d'environnement `NEXT_PUBLIC_API_URL`
- Tous les endpoints sont préfixés `/api/v1/`
- Authentification : JWT (access token + refresh token)
- Le client HTTP centralisé se trouve dans `lib/api/`

---

*Dernière mise à jour : 28 juillet 2026*
