'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { UserCheck } from 'lucide-react';

export default function JoinDoctorForm() {
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!invitationCode.trim()) {
      setError('Veuillez saisir un code d\'invitation.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/v1/secretary/join', { invitation_code: invitationCode });
      setSuccess(true);
      setInvitationCode('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Le code saisi est invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card hoverable={false} className="max-w-md p-6 border border-divider">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <UserCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-primary text-lg">Rejoindre un médecin</h3>
          <p className="text-text text-sm">Associez votre compte à l&apos;agenda d&apos;un médecin</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded bg-success/10 border border-success/20 text-success text-sm font-medium">
          Rattachement effectué avec succès ! Vous pouvez maintenant gérer l&apos;agenda.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Code d'invitation"
          placeholder="Ex: SEC-123456"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value)}
        />
        <Button type="submit" fullWidth loading={loading}>
          Rattacher le compte
        </Button>
      </form>
    </Card>
  );
}
