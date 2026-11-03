'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { CreateIncidentDialog } from '@/features/incidents/create-incident-dialog';
import { canSee } from './nav';

// Analysts and admins can open an incident from anywhere. Everyone else sees it disabled with the reason
// (the API refuses viewers anyway: this is a courtesy, not the protection).
export function NewIncidentButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const allowed = canSee(user?.role, 'ANALYST');
  return (
    <>
      <Button
        variant="primary"
        disabled={!allowed}
        title={allowed ? undefined : 'Requires the analyst role'}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden /> New Incident
      </Button>
      <CreateIncidentDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
