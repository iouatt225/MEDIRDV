# MediRDV CI — Prompt d'implémentation FRONTEND
**Stack :** Next.js 14 (App Router) + TypeScript + Tailwind CSS
**Base UI :** Template HTML/Bootstrap "Pluxes" (arisetheme) — à convertir en composants React
**Source fonctionnelle :** Cahier des charges MVP v1.0 (Mars 2026) + Plan de Projet Développé v1.0 (Mai 2026)

---

## Comment utiliser ce document

Ce document est un **prompt d'implémentation à exécuter bloc par bloc**, dans l'ordre.
Chaque bloc est autonome : contexte, objectif, livrables attendus, contraintes techniques.
Donne un bloc à la fois à l'agent/IA de développement (ou à toi-même en session de code),
valide le résultat, puis passe au bloc suivant. Ne pas paralléliser les blocs entre eux
sans avoir terminé le Bloc 0 et le Bloc 1.

⚠️ **Point d'attention sur le template Pluxes** : le site `html.arisetheme.com/pluxes`
bloque l'accès automatisé (robots.txt), il n'a donc pas pu être inspecté directement pour
constituer ce prompt. Avant de lancer le Bloc 1, télécharge le ZIP du template acheté et
place-le dans `design/pluxes-source/` du repo — le Bloc 1 doit commencer par un inventaire
réel des pages/composants disponibles plutôt que par des suppositions.

---

## BLOC 0 — Contexte projet & conventions globales

**Objectif :** poser le cadre que l'agent de développement doit respecter sur tous les blocs suivants.

**Contexte produit**
MediRDV CI est une plateforme web de prise de rendez-vous médicaux (inspirée de Doctolib)
pour le marché ivoirien. Trois profils : Médecin Spécialiste, Secrétaire Médicale, Patient.
MVP sur 10 semaines, cible 50 médecins pilotes à Abidjan au lancement, objectif 200 médecins
abonnés en fin d'année 1.

**Stack technique imposée**
- Next.js 14, App Router, TypeScript strict (`strictNullChecks`, `noImplicitAny`)
- Tailwind CSS (design system dérivé du template Pluxes)
- FullCalendar.io pour les vues agenda (jour/semaine/mois)
- React Query (TanStack) pour le cache des données serveur
- Zustand pour l'état UI local (pas de Redux)
- Zod pour la validation des formulaires côté client
- SDK Daily.co (ou Whereby) pour l'intégration vidéo
- Backend consommé : API REST Flask (voir prompt BACKEND séparé) — endpoints sous `/api/v1/...`

**Conventions de code**
- Composants fonctionnels uniquement, hooks, pas de classes
- Un composant = un fichier, colocation des styles Tailwind (pas de CSS modules séparés)
- Nommage : `PascalCase` pour composants, `camelCase` pour fonctions/variables, `kebab-case` pour les routes de fichiers Next.js
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- ESLint + Prettier bloquants
- Toute chaîne visible utilisateur en **français** (marché ivoirien)

**Structure de dossiers cible (monorepo, dossier `apps/web`)**
```
apps/web/
├── app/
│   ├── (public)/                 → pages publiques (accueil, recherche, profil médecin public)
│   ├── (auth)/                   → login, register, reset-password
│   ├── (patient)/                → espace patient (protégé, rôle=patient)
│   ├── (praticien)/               → espace médecin + secrétaire (protégé)
│   ├── (teleconsult)/[roomId]/   → session vidéo
│   └── layout.tsx
├── components/
│   ├── ui/                       → composants de base issus du design system Pluxes
│   ├── agenda/
│   ├── appointments/
│   ├── auth/
│   └── notifications/
├── lib/
│   ├── api/                      → client HTTP + hooks React Query par domaine
│   ├── auth/                     → gestion JWT/refresh, contexte rôle
│   └── validation/                → schémas Zod
├── stores/                       → stores Zustand
├── types/                        → types partagés (miroir des DTO backend)
└── styles/
```

**Livrable attendu pour ce bloc :** confirmation de la structure + fichier `CONVENTIONS.md` à la racine de `apps/web` reprenant les règles ci-dessus.

---

## BLOC 1 — Setup projet & intégration du design system Pluxes

**Objectif :** initialiser le projet Next.js et transformer le template Pluxes (HTML/CSS/JS statique) en composants React réutilisables.

**Tâches**
1. `create-next-app` avec TypeScript, App Router, Tailwind CSS, ESLint activés.
2. Faire l'inventaire réel du ZIP Pluxes déposé dans `design/pluxes-source/` : lister les pages HTML disponibles, la palette de couleurs (extraire les variables CSS/SCSS), la typographie, les icônes utilisées, les composants réutilisables (header, footer, cards, boutons, formulaires, modales).
3. Configurer `tailwind.config.ts` avec les tokens extraits (couleurs primaires/secondaires, radius, ombres, breakpoints) pour que le rendu Tailwind soit visuellement fidèle au template.
4. Convertir en composants React (dans `components/ui/`) les éléments récurrents : `Button`, `Card`, `Badge` (statut RDV), `Input`, `Select`, `Modal`, `Avatar`, `Navbar`, `Footer`, `Tabs`.
5. Mettre en place le layout racine (`app/layout.tsx`) avec la navbar/footer du template, adaptés à 3 contextes de navigation (visiteur, patient connecté, praticien connecté).
6. Rendre le layout responsive desktop/tablette/mobile (breakpoints Tailwind), conformément à l'exigence non fonctionnelle 5.3 du cahier des charges (Chrome, Firefox, Safari, Edge — iOS Safari, Android Chrome).

**Contraintes**
- Ne pas garder de JS jQuery du template original — tout réécrire en React/hooks.
- Toute image/asset du template doit passer par `next/image`.
- Le design system doit être documenté dans un fichier `components/ui/README.md` (props, variantes) pour que l'équipe dev puisse le réutiliser sans revenir au HTML source.

**Livrable attendu :** projet Next.js qui build sans erreur, page d'accueil publique rendue avec le design Pluxes converti, Storybook ou page `/design-system` listant les composants `ui/`.

---

## BLOC 2 — Authentification & gestion des comptes (Module 1)

**Objectif :** implémenter inscription, connexion, réinitialisation de mot de passe et gestion des 3 rôles.

**Pages/écrans (transversaux)**
- `/connexion` — téléphone + mot de passe
- `/inscription` — choix du rôle à la création (Patient / Médecin — la Secrétaire est invitée, cf. ci-dessous)
- `/mot-de-passe-oublie` puis `/reinitialiser-mot-de-passe?token=...`

**Fonctionnalités**
1. Formulaire d'inscription patient : prénom, nom, date de naissance, téléphone, email.
2. Formulaire d'inscription médecin : spécialité, cabinet, adresse, photo, bio courte, langues parlées, tarif.
3. Formulaire de connexion téléphone + mot de passe → stockage du JWT (courte durée) en mémoire + refresh token en cookie `httpOnly` (le cookie est posé par le backend, le frontend ne le manipule pas directement).
4. Intercepteur HTTP (dans `lib/api/client.ts`) qui rafraîchit automatiquement le token expiré et redirige vers `/connexion` si le refresh échoue, sans perte du formulaire en cours si possible (sauvegarde de l'état dans le store Zustand avant redirection).
5. Association secrétaire/médecin : écran d'invitation côté médecin (génération d'un code), écran de saisie du code côté secrétaire à l'inscription.
6. Garde de route par rôle (`middleware.ts` Next.js ou wrapper `<RequireRole role="medecin">`) : un patient ne doit jamais accéder aux routes `(praticien)`, et inversement.
7. Réinitialisation de mot de passe : formulaire email → écran de confirmation "email envoyé" → page de saisie du nouveau mot de passe avec le token de l'URL (expiration 1h gérée côté backend, le frontend affiche juste l'erreur si le token est expiré).

**Validation**
- Politique de mot de passe (8 caractères min + complexité) appliquée en Zod côté client ET revalidée côté serveur.
- Messages d'erreur en français, explicites (ex. "Ce numéro est déjà associé à un compte").

**Livrable attendu :** parcours complet inscription → connexion → accès à l'espace du rôle correspondant, testé pour les 3 rôles.

---

## BLOC 3 — Espace Patient : recherche & réservation (Module 3)

**Objectif :** permettre à un patient de trouver un spécialiste et réserver un créneau.

**Écrans**
- `/recherche` — filtre par spécialité + ville/géolocalisation, liste de médecins avec prochains créneaux disponibles
- `/medecins/[id]` — profil public du médecin (photo, bio, adresse, tarif, disponibilités)
- `/medecins/[id]/reserver` — calendrier de sélection de créneau (présentiel/vidéo)
- `/reservation/confirmation` — récapitulatif avant validation finale
- `/mes-rendez-vous` — historique (à venir / passés), avec statuts (confirmé, annulé, effectué)

**Fonctionnalités**
1. Recherche avec filtres combinés spécialité + localisation (utiliser la géolocalisation navigateur si autorisée, sinon saisie manuelle de ville).
2. Affichage des créneaux disponibles en temps réel — les données de disponibilité ne doivent **jamais** être mises en cache localement plus de 30s (aligné sur le TTL Redis backend) pour éviter de proposer un créneau déjà pris.
3. Réservation : choix type de consultation (présentiel/vidéo), sélection créneau, motif (texte libre, optionnel), confirmation.
4. Gestion explicite de l'échec de réservation (créneau pris entre-temps par un autre patient) : message clair + rafraîchissement automatique des créneaux disponibles, sans faire planter le flux.
5. Annulation par le patient : bouton visible uniquement si le délai minimum (paramétré par le médecin, renvoyé par l'API) est respecté ; sinon bouton désactivé avec tooltip explicatif.
6. Report de RDV : réutilise le composant de sélection de créneau du Bloc 3 en mode "changement".
7. Historique : liste chronologique triée, filtrable par statut.

**Contraintes**
- Toute action de réservation/annulation doit invalider le cache React Query des créneaux du médecin concerné.
- Prévoir un état de chargement optimiste avec rollback en cas d'échec serveur (concurrence de créneau).

**Livrable attendu :** parcours patient complet, du filtre de recherche à la confirmation de RDV, avec gestion des cas d'échec.

---

## BLOC 4 — Espace Médecin & Secrétaire : agenda (Module 2 + Module 6)

**Objectif :** interface de pilotage de l'agenda pour les médecins et secrétaires.

**Écrans**
- `/praticien/tableau-de-bord` — KPIs semaine (taux de remplissage, RDV à venir, annulations, téléconsultations)
- `/praticien/agenda` — vue Jour/Semaine/Mois (FullCalendar), code couleur par type (présentiel/vidéo/bloqué)
- `/praticien/agenda/creneau/[id]` — création/modification d'un créneau récurrent ou d'un blocage
- `/praticien/patients/[id]` — fiche patient (coordonnées + historique RDV, **pas** de données médicales sensibles pour la secrétaire)
- `/praticien/parametres` — disponibilités récurrentes, types de consultation, durées, délai d'annulation patient

**Fonctionnalités**
1. Intégration FullCalendar.io avec les 3 vues, drag & drop pour déplacer un créneau libre (pas un RDV confirmé sans confirmation explicite).
2. Formulaire de créneaux récurrents hebdomadaires (ex. lundi 9h–12h / 14h–18h) avec durée par type de consultation.
3. Blocage manuel de plages (congés, formation) — visuellement distinct dans l'agenda.
4. Prise de RDV manuelle par la secrétaire : recherche patient existant (autocomplete) ou création à la volée, depuis l'agenda directement.
5. Annulation/modification par la secrétaire avec déclenchement automatique de la notification patient (géré côté backend, le frontend affiche juste une confirmation visuelle "notification envoyée").
6. Tableau de bord avec indicateurs (consommer l'endpoint dashboard du backend), graphiques simples (pas de librairie lourde — Recharts recommandé).
7. **Différenciation stricte des droits d'accès dans l'UI** : la secrétaire ne voit jamais de champ "motif de consultation détaillé" s'il est marqué sensible, conformément à son profil ("sans accès aux données médicales sensibles").
8. Export CSV des RDV sur une période (bouton dans le tableau de bord, appelle l'endpoint d'export backend et déclenche le téléchargement navigateur).

**Livrable attendu :** agenda fonctionnel avec les 3 vues, création/modification/blocage de créneaux, tableau de bord avec KPIs réels.

---

## BLOC 5 — Téléconsultation vidéo (Module 4)

**Objectif :** intégrer la session vidéo Daily.co dans le parcours patient et médecin.

**Écrans**
- `/teleconsultation/[appointmentId]` (patient) — salle d'attente virtuelle puis session
- `/praticien/teleconsultation/[appointmentId]` — interface médecin avec bouton "Démarrer la consultation"

**Fonctionnalités**
1. Salle d'attente virtuelle patient : affichage d'un message d'attente tant que le médecin n'a pas ouvert la session (poll ou websocket sur le statut de la room, à définir avec le backend).
2. Intégration du SDK Daily.co (iframe ou composants React officiels) avec contrôles micro ON/OFF et caméra ON/OFF pour les deux participants.
3. Chat textuel intégré à la session (fonctionnalité "Important" du cahier des charges).
4. Partage d'écran (fonctionnalité "Utile", à prévoir dans l'UI mais peut être livrée après le MVP strict si le planning est serré).
5. Fin de session : redirection propre + affichage du récapitulatif post-consultation côté patient (déclenché par l'email envoyé côté backend, mais l'UI doit aussi afficher un état "Consultation terminée").
6. Gestion des erreurs WebRTC (navigateur incompatible, permissions caméra/micro refusées) avec messages clairs — c'est le point de risque identifié dans le plan de projet (buffer prévu en Phase 3).

**Contraintes**
- Aucune installation logicielle requise côté utilisateur (100% navigateur, WebRTC).
- Vérifier la compatibilité sur Chrome, Firefox, Safari, Edge (desktop) + Safari iOS, Chrome Android.

**Livrable attendu :** session vidéo fonctionnelle de bout en bout entre un compte médecin et un compte patient de test.

---

## BLOC 6 — Notifications (UI) & centre de messages (Module 5)

**Objectif :** partie frontend des notifications (l'envoi SMS/email est backend, cf. prompt BACKEND).

**Fonctionnalités**
1. Centre de notifications in-app (icône cloche + panneau déroulant) listant les événements liés au compte (RDV confirmé, rappel, annulation).
2. Bannières de confirmation immédiates après chaque action (réservation, annulation, modification).
3. Préférences de notification côté médecin : activer/désactiver le rappel J-7 optionnel pour les consultations longues (paramètre `Module 5 — Important`).

**Livrable attendu :** centre de notifications fonctionnel connecté aux endpoints backend correspondants.

---

## BLOC 7 — Couche d'accès API & gestion d'état globale

**Objectif :** centraliser tous les appels au backend Flask de façon robuste et typée.

**Tâches**
1. Client HTTP unique (`lib/api/client.ts`) basé sur `fetch` ou `axios`, avec :
   - injection automatique du JWT dans les headers,
   - intercepteur de refresh token,
   - gestion centralisée des erreurs HTTP (401 → refresh puis retry ; 403 → redirection "accès refusé" ; 422 → remontée du message métier au formulaire).
2. Un hook React Query par domaine fonctionnel : `useAuth`, `useDoctors`, `useAvailabilitySlots`, `useAppointments`, `useTeleconsult`, `useNotifications`, `useDashboard`.
3. Types TypeScript miroir des DTO backend (dossier `types/`), à synchroniser avec le schéma OpenAPI/Swagger exposé par le backend Flask (voir Bloc correspondant du prompt BACKEND).
4. Store Zustand pour : session utilisateur courante (rôle, profil), état UI de l'agenda (vue sélectionnée, filtre), panier de réservation en cours.

**Livrable attendu :** couche API testée (mock des endpoints via MSW pour les tests) et documentée.

---

## BLOC 8 — Qualité, tests & mise en production frontend

**Objectif :** répondre aux exigences non fonctionnelles et à la Definition of Done du plan de projet.

**Tâches**
1. Tests E2E Playwright sur les 3 parcours critiques : réservation patient, gestion agenda médecin, téléconsultation (aligné sur le plan de projet, section 6.1).
2. Vérification du temps de chargement initial < 3s sur connexion 4G (Lighthouse / WebPageTest).
3. Vérification de la compatibilité navigateurs listée (Chrome, Firefox, Safari, Edge, iOS Safari, Android Chrome).
4. Revue accessibilité de base (contrastes, labels de formulaire, navigation clavier) — non listée explicitement dans le cahier des charges mais nécessaire pour un public large.
5. Build Docker du frontend (`apps/web/Dockerfile`), intégré au `docker-compose.yml` du monorepo décrit dans le plan de projet.
6. Variables d'environnement de production (`NEXT_PUBLIC_API_URL`, clés Daily.co publiques) documentées dans `.env.example`.

**Livrable attendu :** frontend prêt pour la Phase 4 (Tests & QA) et la Phase 5 (Déploiement) du planning global.

---

## Récapitulatif de l'ordre d'exécution

| Ordre | Bloc | Dépend de |
|---|---|---|
| 1 | Bloc 0 — Contexte & conventions | — |
| 2 | Bloc 1 — Setup & design system Pluxes | Bloc 0 |
| 3 | Bloc 2 — Authentification | Bloc 1 |
| 4 | Bloc 7 — Couche API (au moins le client + useAuth) | Bloc 2 |
| 5 | Bloc 3 — Espace Patient | Bloc 2, Bloc 7 |
| 6 | Bloc 4 — Espace Médecin/Secrétaire | Bloc 2, Bloc 7 |
| 7 | Bloc 5 — Téléconsultation | Bloc 3, Bloc 4 |
| 8 | Bloc 6 — Notifications UI | Bloc 3, Bloc 4 |
| 9 | Bloc 8 — Qualité & mise en production | Tous les précédents |

*Fin du prompt FRONTEND — voir le fichier `MediRDV_CI_Prompt_Implementation_BACKEND.md` pour la partie API/serveur.*
