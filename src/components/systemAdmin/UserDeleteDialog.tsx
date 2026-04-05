"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Trash2, Archive, UserX, Loader2 } from "lucide-react";

interface UserDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  user: any;
  onConfirm: (options: any) => void;
  isDeleting: boolean;
}

export default function UserDeleteDialog({
  open,
  onClose,
  user,
  onConfirm,
  isDeleting,
}: UserDeleteDialogProps) {
  const [deletionType, setDeletionType] = useState<'soft' | 'hard'>('soft');
  const [forceDelete, setForceDelete] = useState(false);
  const [reassignInstructorId, setReassignInstructorId] = useState('');
  const [archiveCourses, setArchiveCourses] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  
  const hasDependencies = user.statistics?.courses_taught > 0 || 
                          user.institutions?.some((inst: any) => inst.role === 'ADMIN');
  
  const handleConfirm = () => {
    if (deletionType === 'hard' && confirmationText !== 'DELETE') {
      return;
    }
    
    const options: any = {
      permanent: deletionType === 'hard',
      force: forceDelete,
    };
    
    if (reassignInstructorId) {
      options.reassign_courses_to = reassignInstructorId;
    }
    
    onConfirm(options);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-destructive flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            You are about to delete {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Warning Section */}
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              This action cannot be undone. Please review the impact before proceeding.
            </AlertDescription>
          </Alert>
          
          {/* Impact Information */}
          <div className="space-y-3">
            <h4 className="font-medium">Impact Analysis</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive">
                  <UserX className="w-4 h-4" />
                  <span className="font-medium">User Account</span>
                </div>
                <p className="text-sm text-destructive mt-1">
                  {deletionType === 'soft' 
                    ? 'Will be deactivated but data preserved' 
                    : 'Will be permanently deleted'}
                </p>
              </div>
              
              {user.statistics?.courses_taught > 0 && (
                <div className="p-3 border rounded-lg bg-warning/10">
                  <div className="flex items-center gap-2 text-warning">
                    <Archive className="w-4 h-4" />
                    <span className="font-medium">Courses Taught</span>
                  </div>
                  <p className="text-sm text-warning mt-1">
                    {user.statistics.courses_taught} courses will be affected
                  </p>
                </div>
              )}
              
              {user.institutions?.some((inst: any) => inst.role === 'ADMIN') && (
                <div className="p-3 border rounded-lg bg-primary/10">
                  <div className="flex items-center gap-2 text-primary">
                    <UserX className="w-4 h-4" />
                    <span className="font-medium">Institution Admin</span>
                  </div>
                  <p className="text-sm text-primary mt-1">
                    Admin role in {user.institutions.filter((inst: any) => inst.role === 'ADMIN').length} institutions
                  </p>
                </div>
              )}
              
              <div className="p-3 border rounded-lg bg-primary/10">
                <div className="flex items-center gap-2 text-primary">
                  <Archive className="w-4 h-4" />
                  <span className="font-medium">Data Retention</span>
                </div>
                <p className="text-sm text-primary mt-1">
                  {deletionType === 'soft' 
                    ? 'All data will be preserved for recovery' 
                    : 'Most data will be permanently deleted'}
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Deletion Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Deletion Options</h4>
            
            <RadioGroup value={deletionType} onValueChange={(v: any) => setDeletionType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="soft" id="soft" />
                <Label htmlFor="soft" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Soft Delete (Recommended)</div>
                    <p className="text-sm text-muted-foreground">
                      Deactivate the user account but keep all data. Can be reactivated later.
                    </p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Permanent Delete</div>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete the user and most associated data. Cannot be recovered.
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            
            {/* Dependencies Handling */}
            {hasDependencies && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h5 className="font-medium">Handle Dependencies</h5>
                
                {/* Courses taught handling */}
                {user.statistics?.courses_taught > 0 && (
                  <div className="space-y-2">
                    <Label>Reassign Courses</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      User teaches {user.statistics.courses_taught} courses. Choose how to handle them:
                    </p>
                    <Select value={reassignInstructorId} onValueChange={setReassignInstructorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new instructor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instr-1">John Doe</SelectItem>
                        <SelectItem value="instr-2">Jane Smith</SelectItem>
                        <SelectItem value="instr-3">Robert Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        id="archive_courses"
                        checked={archiveCourses}
                        onCheckedChange={setArchiveCourses}
                      />
                      <Label htmlFor="archive_courses" className="text-sm">
                        Archive courses instead of reassigning
                      </Label>
                    </div>
                  </div>
                )}
                
                {/* Force delete option */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="force_delete">Force Delete</Label>
                    <p className="text-sm text-muted-foreground">
                      Delete even if there are unresolved dependencies
                    </p>
                  </div>
                  <Switch
                    id="force_delete"
                    checked={forceDelete}
                    onCheckedChange={setForceDelete}
                  />
                </div>
              </div>
            )}
            
            {/* Reason for deletion */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Deletion (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for deletion..."
                rows={2}
              />
            </div>
            
            {/* Confirmation for hard delete */}
            {deletionType === 'hard' && (
              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  Type <span className="font-mono text-destructive">DELETE</span> to confirm
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className={confirmationText === 'DELETE' ? 'border-success' : 'border-destructive'}
                />
                {confirmationText && confirmationText !== 'DELETE' && (
                  <p className="text-sm text-destructive">
                    Please type DELETE exactly as shown to confirm permanent deletion
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Final Checkbox */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="understand"
              className="mt-1 rounded border-border"
              required
            />
            <Label htmlFor="understand" className="text-sm">
              I understand that this action is irreversible and I have reviewed all dependencies.
              I have the necessary authorization to perform this deletion.
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={
              isDeleting || 
              (deletionType === 'hard' && confirmationText !== 'DELETE')
            }
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {deletionType === 'soft' ? 'Deactivate User' : 'Permanently Delete'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}