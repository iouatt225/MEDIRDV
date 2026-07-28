'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Copy, Check, UserPlus } from 'lucide-react';

export default function InviteSecretaryCard() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);
    setCode(null);
    setCopied(false);

    try {
      interface InviteResponse {
        invitation_code: string;
      }
      const res = await apiClient.post<InviteResponse>('/api/v1/secretary/invite');
      setCode(res.invitation_code);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Impossible de générer le code d\'invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card hoverable={false} className="max-w-md p-6 border border-divider">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-primary text-lg">Inviter une secrétaire</h3>
          <p className="text-text text-sm">Rattachez une secrétaire médicale à votre compte</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {code ? (
        <div className="space-y-4">
          <div className="p-4 rounded-pluxes-sm bg-secondary border border-divider flex items-center justify-between">
            <span className="font-mono font-bold text-lg text-primary tracking-wider">{code}</span>
            <button
              onClick={handleCopyCode}
              className="p-2 text-text hover:text-accent transition-colors cursor-pointer"
              title="Copier le code"
            >
              {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-text leading-relaxed">
            Transmettez ce code à votre secrétaire. Elle devra le saisir lors de son inscription ou sur son profil pour lier vos comptes.
          </p>
          <Button variant="ghost" className="w-full text-center" onClick={handleGenerateCode}>
            Générer un nouveau code
          </Button>
        </div>
      ) : (
        <div className="pt-2">
          <Button fullWidth loading={loading} onClick={handleGenerateCode}>
            Générer le code d&apos;association
          </Button>
        </div>
      )}
    </Card>
  );
}
