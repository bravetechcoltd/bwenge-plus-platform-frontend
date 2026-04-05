"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { deactivateInstitution } from "@/lib/features/institutions/institutionSlice";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PowerOff,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  BookOpen,
  FolderTree,
} from "lucide-react";
import toast from "react-hot-toast";

interface DeactivateInstitutionModalProps {
  institution: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeactivateInstitutionModal({
  institution,
  onClose,
  onSuccess,
}: DeactivateInstitutionModalProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requiredConfirmText = institution.name;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!reason.trim()) {
      newErrors.reason = "Deactivation reason is required";
    } else if (reason.trim().length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    }

    if (confirmText !== requiredConfirmText) {
      newErrors.confirmText = "Institution name does not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await dispatch(
        deactivateInstitution({
          id: institution.id,
          reason: reason.trim(),
        })
      ).unwrap();

      toast.success("Institution deactivated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error || "Failed to deactivate institution");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 border-b border-destructive">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-card/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <PowerOff className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Deactivate Institution</h2>
                  <p className="text-sm text-destructive">This action will suspend all activities</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-card/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Institution Info */}
            <div className="mb-6 bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {institution.logo_url ? (
                  <img
                    src={institution.logo_url}
                    alt={institution.name}
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{institution.name}</h3>
                  {institution.description && (
                    <p className="text-sm text-muted-foreground mb-3">{institution.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <span>{institution.memberCount || 0} Members</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <span>{institution.courseCount || 0} Courses</span>
                    </div>
                    <div className="flex items-center">
                      <FolderTree className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <span>{institution.categoryCount || 0} Categories</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Warning */}
            <div className="mb-6 bg-destructive/10 border-2 border-destructive/40 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-destructive mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-destructive mb-2">Critical Warning</h4>
                  <p className="text-sm text-destructive mb-3">
                    Deactivating this institution will have the following immediate effects:
                  </p>
                  <ul className="text-sm text-destructive space-y-1.5 ml-4">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>All users will lose access to the institution's resources</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>All active courses will be suspended</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Student enrollments will be paused</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>The institution will be hidden from public listings</span>
                    </li>
                  </ul>
                  <p className="text-sm text-destructive font-medium mt-3">
                    This action can be reversed by reactivating the institution.
                  </p>
                </div>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Reason for Deactivation <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) {
                    setErrors((prev) => ({ ...prev, reason: "" }));
                  }
                }}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-destructive resize-none transition-colors ${
                  errors.reason ? "border-destructive" : "border-border"
                }`}
                placeholder="Please provide a detailed reason for deactivating this institution..."
              />
              {errors.reason && (
                <p className="text-destructive text-xs mt-1">{errors.reason}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be recorded for audit purposes
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Type "{requiredConfirmText}" to confirm <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  if (errors.confirmText) {
                    setErrors((prev) => ({ ...prev, confirmText: "" }));
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-destructive transition-colors ${
                  errors.confirmText ? "border-destructive" : "border-border"
                }`}
                placeholder={requiredConfirmText}
              />
              {errors.confirmText && (
                <p className="text-destructive text-xs mt-1">{errors.confirmText}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Please type the exact institution name to proceed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || confirmText !== requiredConfirmText}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2.5 rounded-lg hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <PowerOff className="w-5 h-5" />
                    Deactivate Institution
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}