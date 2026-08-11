import { z } from 'zod';

// Shared Password Validation
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule.')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule.');

// Phone validation (between 8 and 20 digits, optionally starting with +)
export const phoneSchema = z
  .string()
  .min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres.')
  .max(20, 'Le numéro de téléphone ne doit pas dépasser 20 chiffres.')
  .regex(/^\+?[0-9]+$/, 'Le numéro de téléphone est invalide.');

// Base User Schema (common fields)
const baseRegisterSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est obligatoire.').max(100),
  last_name: z.string().min(1, 'Le nom est obligatoire.').max(100),
  phone: phoneSchema,
  email: z.string().email('L\'adresse email est invalide.').optional().or(z.literal('')),
  password: passwordSchema,
});

// Login Schema
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Le téléphone ou l\'email est obligatoire.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

// Patient Register Schema
export const registerPatientSchema = baseRegisterSchema.extend({
  date_of_birth: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'La date de naissance est invalide.')
    .optional()
    .or(z.literal('')),
  phone_secondary: z
    .string()
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gdpr_consent: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement RGPD est obligatoire.' }),
  }),
});

// Doctor Register Schema
export const registerDoctorSchema = baseRegisterSchema.extend({
  specialty: z.string().min(1, 'La spécialité est obligatoire.'),
  cabinet_name: z.string().min(1, 'Le nom du cabinet est obligatoire.'),
  address: z.string().min(1, 'L\'adresse du cabinet est obligatoire.'),
  bio: z.string().max(500, 'La biographie ne doit pas dépasser 500 caractères.').optional().or(z.literal('')),
  languages: z.array(z.string()).min(1, 'Veuillez sélectionner au moins une langue.'),
  fee: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Le tarif doit être un nombre positif.'),
  cancellation_delay_hours: z
    .number()
    .min(0, 'Le délai doit être positif.')
    .default(24),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Secretary Register Schema
export const registerSecretarySchema = baseRegisterSchema.extend({
  invitation_code: z.string().optional().or(z.literal('')),
});

// Reset Password Request Schema
export const resetPasswordRequestSchema = z.object({
  email: z.string().email('L\'adresse email est invalide.'),
});

// Reset Password Confirm Schema
export const resetPasswordConfirmSchema = z.object({
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['confirm_password'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
export type RegisterSecretaryInput = z.infer<typeof registerSecretarySchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>;
export const joinSecretarySchema = z.object({
  invitation_code: z.string().min(1, 'Le code est obligatoire.'),
});
export type JoinSecretaryInput = z.infer<typeof joinSecretarySchema>;
