# Composants UI — MediRDV Design System

Composants React dérivés du template **Pluxes** (Medical & Healthcare HTML Template par Arisetheme), convertis en React/TypeScript avec Tailwind CSS v4.

> **Visualisation live** : lancer `npm run dev` et naviguer vers `/design-system`.

---

## Tokens du design system

| Token | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#08363B` | Titres, header, footer |
| `--color-secondary` | `#EDF9FC` | Fonds doux |
| `--color-accent` | `#00A8BC` | Boutons, accents |
| `--color-text` | `#67787A` | Texte courant |
| `--color-error` | `rgb(230,87,87)` | Erreurs |
| `--color-success` | `#22C55E` | Confirmé |
| `--color-warning` | `#F59E0B` | En attente |
| `--font-sans` | `Rethink Sans` | Police principale |
| `--radius-pluxes` | `30px` | Cards, sections |
| `--radius-pluxes-sm` | `14px` | Dropdowns |
| `--radius-pluxes-xs` | `10px` | Inputs |
| `--radius-pluxes-btn` | `5px` | Boutons |

---

## Composants

### `Button`

Bouton principal avec animation fill-from-right au hover.

```tsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="md" loading={false}>
  Prendre rendez-vous
</Button>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Style visuel |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Taille |
| `loading` | `boolean` | `false` | Affiche un spinner |
| `fullWidth` | `boolean` | `false` | Prend toute la largeur |
| `disabled` | `boolean` | `false` | Désactivé |

---

### `Card`

Conteneur avec ombre et effet hover lift.

```tsx
import Card from '@/components/ui/Card';

<Card variant="default" hoverable padding="md">
  Contenu de la carte
</Card>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'default' \| 'secondary' \| 'dark'` | `'default'` | Couleur de fond |
| `hoverable` | `boolean` | `true` | Effet hover translateY |
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding interne |

---

### `Badge`

Étiquette de statut avec point indicateur.

```tsx
import Badge from '@/components/ui/Badge';

<Badge variant="confirmed" dot>Confirmé</Badge>
<Badge variant="pending">En attente</Badge>
<Badge variant="cancelled">Annulé</Badge>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'default' \| 'confirmed' \| 'pending' \| 'cancelled' \| 'info'` | `'default'` | Couleur sémantique |
| `dot` | `boolean` | `true` | Point coloré à gauche |

---

### `Input`

Champ de saisie avec label et gestion d'erreur Zod.

```tsx
import Input from '@/components/ui/Input';

<Input
  label="Email"
  placeholder="votre@email.com"
  error="Email invalide"
  variant="light"
/>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | — | Label au-dessus du champ |
| `error` | `string` | — | Message d'erreur (rouge) |
| `variant` | `'light' \| 'dark'` | `'light'` | Fond clair ou glassmorphism |
| `fullWidth` | `boolean` | `true` | Largeur 100% |

---

### `Select`

Menu déroulant stylisé.

```tsx
import Select from '@/components/ui/Select';

<Select
  label="Spécialité"
  placeholder="Choisir..."
  options={[
    { value: 'cardio', label: 'Cardiologie' },
    { value: 'pediatrie', label: 'Pédiatrie' },
  ]}
/>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `label` | `string` | — | Label au-dessus |
| `error` | `string` | — | Message d'erreur |
| `variant` | `'light' \| 'dark'` | `'light'` | Thème visuel |
| `options` | `{ value: string; label: string }[]` | **requis** | Options du select |
| `placeholder` | `string` | — | Option désactivée initiale |

---

### `Modal`

Modale centrée avec overlay, animation scale-in, et fermeture Escape.

```tsx
import Modal from '@/components/ui/Modal';

const [open, setOpen] = useState(false);

<Modal open={open} onClose={() => setOpen(false)} title="Titre" size="md">
  Contenu de la modale
</Modal>
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `boolean` | **requis** | Visible ou non |
| `onClose` | `() => void` | **requis** | Callback de fermeture |
| `title` | `string` | — | Titre dans le header |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Largeur max |

---

### `Avatar`

Cercle avec image ou initiales en fallback.

```tsx
import Avatar from '@/components/ui/Avatar';

<Avatar src="/photo.jpg" alt="Dr. Aya" size="lg" />
<Avatar alt="Dr. Kouamé Aya" /> {/* → "DK" */}
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `src` | `string \| null` | — | URL de l'image |
| `alt` | `string` | `''` | Texte alternatif (et source des initiales) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 32px / 48px / 80px |
| `initials` | `string` | — | Override des initiales auto |

---

### `Tabs`

Composant compound pour les onglets (agenda, profil...).

```tsx
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';

<Tabs defaultTab="jour">
  <TabList>
    <Tab id="jour">Jour</Tab>
    <Tab id="semaine">Semaine</Tab>
  </TabList>
  <TabPanel id="jour">Contenu jour</TabPanel>
  <TabPanel id="semaine">Contenu semaine</TabPanel>
</Tabs>
```

---

### `Navbar`

Barre de navigation sticky avec 3 contextes.

```tsx
import Navbar from '@/components/ui/Navbar';

<Navbar role="visitor" />
<Navbar role="patient" userName="Aya K." />
<Navbar role="praticien" userName="Dr. Kouamé" />
```

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `role` | `'visitor' \| 'patient' \| 'praticien'` | `'visitor'` | Contexte de navigation |
| `userName` | `string` | — | Nom affiché si connecté |

---

### `Footer`

Pied de page avec liens, réseaux sociaux, et copyright.

```tsx
import Footer from '@/components/ui/Footer';

<Footer />
```

Aucune prop — le contenu est statique pour le MVP.

---

*Dernière mise à jour : 28 juillet 2026*
