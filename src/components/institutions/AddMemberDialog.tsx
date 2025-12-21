"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { addMemberToInstitution, fetchInstitutionById } from "@/lib/features/institutions/institutionSlice";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Mail, User, Phone as PhoneIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api";

enum InstitutionMemberRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

interface UserCheckResult {
  exists: boolean;
  isMember: boolean;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    profile_picture_url?: string;
  };
}

export default function AddMemberDialog({
  open,
  onOpenChange,
  institutionId,
}: AddMemberDialogProps) {
  const dispatch = useAppDispatch();

  // State for email validation
  const [email, setEmail] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<UserCheckResult | null>(null);

  // State for new user form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");

  // State for member settings
  const [role, setRole] = useState<InstitutionMemberRole>(InstitutionMemberRole.MEMBER);
  const [sendInvitation, setSendInvitation] = useState(true);

  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Auto-generate username when first name or last name changes
  useEffect(() => {
    if (firstName && lastName && !emailCheckResult?.exists) {
      const generatedUsername = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.random().toString(36).substring(2, 8)}`;
      setUsername(generatedUsername);
    }
  }, [firstName, lastName, emailCheckResult?.exists]);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setUsername("");
    setRole(InstitutionMemberRole.MEMBER);
    setSendInvitation(true);
    setEmailCheckResult(null);
    setIsCheckingEmail(false);
    setIsSubmitting(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Auto-check email with debounce
  const checkEmail = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !isValidEmail(emailToCheck)) {
      setEmailCheckResult(null);
      return;
    }

    setIsCheckingEmail(true);
    setEmailCheckResult(null);

    try {
      // Check if user exists in the system
      const userCheckResponse = await api.post("/auth/check-user-exists", { email: emailToCheck });
      const userExists = userCheckResponse.data.exists;
      const userData = userCheckResponse.data.user;

      // If user exists, check if they're already a member of this institution
      if (userExists && userData) {
        const memberCheckResponse = await api.get(
          `/institutions/${institutionId}/members/check/${userData.id}`
        );
        const isMember = memberCheckResponse.data.isMember;

        setEmailCheckResult({
          exists: true,
          isMember,
          user: userData,
        });

        if (isMember) {
          toast.error("User is already a member");
        }
      } else {
        // User doesn't exist - need to create new user
        setEmailCheckResult({
          exists: false,
          isMember: false,
        });
      }
    } catch (error: any) {
      console.error("Error checking email:", error);
      
      // If the error is 404, user doesn't exist
      if (error.response?.status === 404) {
        setEmailCheckResult({
          exists: false,
          isMember: false,
        });
      } else {
        toast.error("Failed to verify email");
      }
    } finally {
      setIsCheckingEmail(false);
    }
  }, [institutionId]);

  // Handle email input with debounce
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailCheckResult(null);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for auto-check (500ms delay)
    if (isValidEmail(newEmail)) {
      debounceTimer.current = setTimeout(() => {
        checkEmail(newEmail);
      }, 500);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!emailCheckResult) {
      toast.error("Please wait for email verification");
      return;
    }

    if (emailCheckResult.isMember) {
      toast.error("User is already a member");
      return;
    }

    // If creating new user, validate required fields
    if (!emailCheckResult.exists) {
      if (!firstName.trim()) {
        toast.error("First name is required");
        return;
      }
      if (!lastName.trim()) {
        toast.error("Last name is required");
        return;
      }
      if (!username.trim()) {
        toast.error("Username is required");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the member data
      const memberData: any = {
        email,
        role,
        send_invitation: sendInvitation,
      };

      // If creating a new user, include additional user data
      if (!emailCheckResult.exists) {
        memberData.new_user_data = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          phone_number: phone.trim() || undefined,
        };
      }

      // Add member to institution
      await dispatch(
        addMemberToInstitution({
          id: institutionId,
          memberData,
        })
      ).unwrap();

      toast.success(
        emailCheckResult.exists
          ? "Member added successfully!"
          : "New user created and added!"
      );

      // Refresh institution data
      await dispatch(fetchInstitutionById(institutionId));

      // Close dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: InstitutionMemberRole) => {
    switch (role) {
      case InstitutionMemberRole.ADMIN:
        return "Administrator";
      case InstitutionMemberRole.CONTENT_CREATOR:
        return "Content Creator";
      case InstitutionMemberRole.INSTRUCTOR:
        return "Instructor";
      case InstitutionMemberRole.MEMBER:
        return "Member";
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Member</DialogTitle>
          <DialogDescription>
            Add a new member to your institution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Section */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-base font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter member's email"
                disabled={isSubmitting}
                className="pl-10 pr-10 h-11"
              />
              {isCheckingEmail && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isCheckingEmail && email && isValidEmail(email) && emailCheckResult && (
                emailCheckResult.isMember ? (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                ) : emailCheckResult.exists ? (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                )
              )}
            </div>
          </div>

          {/* Email Check Result */}
          {emailCheckResult && (
            <Alert
              variant={
                emailCheckResult.isMember
                  ? "destructive"
                  : "default"
              }
              className={
                emailCheckResult.isMember
                  ? "border-destructive/50 bg-destructive/10"
                  : emailCheckResult.exists
                  ? "border-green-500/50 bg-green-50"
                  : "border-blue-500/50 bg-blue-50"
              }
            >
              {emailCheckResult.isMember ? (
                <XCircle className="h-4 w-4" />
              ) : emailCheckResult.exists ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription className="ml-2">
                {emailCheckResult.isMember
                  ? "This user is already a member of the institution"
                  : emailCheckResult.exists
                  ? `User found: ${emailCheckResult.user?.first_name} ${emailCheckResult.user?.last_name}`
                  : "New user will be created with this email"}
              </AlertDescription>
            </Alert>
          )}

          {/* New User Form */}
          {emailCheckResult && !emailCheckResult.exists && !emailCheckResult.isMember && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                New User Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Auto-generated, editable"
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 XXX XXX XXX"
                    disabled={isSubmitting}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Existing User Info */}
          {emailCheckResult && emailCheckResult.exists && !emailCheckResult.isMember && (
            <div className="space-y-3 rounded-lg border bg-green-50 p-5">
              <h3 className="font-semibold text-base flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                Existing User
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium text-sm mt-1">
                    {emailCheckResult.user?.first_name} {emailCheckResult.user?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Username</Label>
                  <p className="font-medium text-sm mt-1">{emailCheckResult.user?.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          {emailCheckResult && !emailCheckResult.isMember && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-base font-semibold">
                  Institution Role
                </Label>
                <Select
                  value={role}
                  onValueChange={(value: InstitutionMemberRole) => setRole(value)}
                  disabled={isSubmitting}
                  
                >
                  <SelectTrigger className="h-11 p-5 py-5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white p-5">
                    <SelectItem value={InstitutionMemberRole.MEMBER}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Member</span>
                        <span className="text-xs text-muted-foreground">Basic access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={InstitutionMemberRole.INSTRUCTOR}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Instructor</span>
                        <span className="text-xs text-muted-foreground">Can teach courses</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={InstitutionMemberRole.CONTENT_CREATOR}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Content Creator</span>
                        <span className="text-xs text-muted-foreground">Can create content</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={InstitutionMemberRole.ADMIN}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Administrator</span>
                        <span className="text-xs text-muted-foreground">Full access</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="send-invitation" className="text-sm font-medium cursor-pointer">
                    Send Email Invitation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Member will receive login credentials via email
                  </p>
                </div>
                <Switch
                  id="send-invitation"
                  checked={sendInvitation}
                  onCheckedChange={setSendInvitation}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !emailCheckResult ||
              emailCheckResult.isMember ||
              isSubmitting ||
              isCheckingEmail ||
              (!emailCheckResult.exists &&
                (!firstName.trim() || !lastName.trim() || !username.trim()))
            }
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Add Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}