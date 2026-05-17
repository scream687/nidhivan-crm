'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsersStore } from '@/stores/usersStore';
import { useLeadsStore } from '@/stores/leadsStore';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  currentAssigneeId?: string;
  onSuccess?: () => void;
}

export function ReassignDialog({ leadId, currentAssigneeId, onSuccess }: Props) {
  const { users, fetchUsers } = useUsersStore();
  const { assignLead } = useLeadsStore();
  const [selectedUserId, setSelectedUserId] = useState(currentAssigneeId || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  async function handleAssign() {
    if (!selectedUserId) return;
    try {
      await assignLead(leadId, selectedUserId);
      toast.success('Lead reassigned successfully');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to reassign lead');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Reassign">
          <UserPlus size={14} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Employee</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role.toLowerCase().replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedUserId}>Confirm Transfer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
