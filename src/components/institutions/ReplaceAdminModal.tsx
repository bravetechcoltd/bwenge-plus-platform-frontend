// @ts-nocheck
"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { replaceInstitutionAdmin, fetchInstitutions } from "@/lib/features/institutions/institutionSlice";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserCog,
  Mail,
  User,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface ReplaceAdminModalProps {
  institution: any;
  currentAdmin: any;
  onClose: () => void;
}

export default function ReplaceAdminModal({
  institution,
  currentAdmin,
  onClose,
}: ReplaceAdminModalProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    new_admin_email: "",
    new_admin_first_name: "",
    new_admin_last_name: "",
    new_admin_phone: "",
    new_admin_username: "",
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.new_admin_email.trim()) {
      newErrors.new_admin_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.new_admin_email)) {
      newErrors.new_admin_email = "Invalid email format";
    }

    if (!formData.new_admin_first_name.trim()) {
      newErrors.new_admin_first_name = "First name is required";
    }

    if (!formData.new_admin_last_name.trim()) {
      newErrors.new_admin_last_name = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await dispatch(
        replaceInstitutionAdmin({
          id: institution.id,
          adminData: {
            new_admin_email: formData.new_admin_email.trim(),
            new_admin_first_name: formData.new_admin_first_name.trim(),
            new_admin_last_name: formData.new_admin_last_name.trim(),
            new_admin_phone: formData.new_admin_phone.trim() || undefined,
            new_admin_username: formData.new_admin_username.trim() || undefined,
          },
        })
      ).unwrap();

      toast.success("Admin replaced successfully!");
      dispatch(fetchInstitutions());
      onClose();
    } catch (error: any) {
      toast.error(error || "Failed to replace admin");
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
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-primary px-6 py-4 border-b border-primary/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Replace Administrator</h2>
                  <p className="text-sm text-purple-100">{institution.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Current Admin Info */}
            {currentAdmin && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wide">
                  Current Administrator
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-blue-900 font-medium">
                      {currentAdmin.first_name} {currentAdmin.last_name}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-blue-700">{currentAdmin.email}</span>
                  </div>
                  {currentAdmin.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-blue-700">{currentAdmin.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important Notice</p>
                <p>
                  Replacing the administrator will revoke the current admin's access and create a
                  new admin account. The new admin will receive login credentials via email.
                </p>
              </div>
            </div>

            {/* Arrow Indicator */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 text-purple-600">
                <div className="h-px w-16 bg-purple-300" />
                <ArrowRight className="w-5 h-5" />
                <div className="h-px w-16 bg-purple-300" />
              </div>
            </div>

            {/* New Admin Form */}
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-purple-800 mb-4 uppercase tracking-wide flex items-center">
                  <UserCog className="w-4 h-4 mr-2" />
                  New Administrator Details
                </h4>

                <div className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.new_admin_first_name}
                        onChange={(e) => handleChange("new_admin_first_name", e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                          errors.new_admin_first_name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter first name"
                      />
                      {errors.new_admin_first_name && (
                        <p className="text-red-500 text-xs mt-1">{errors.new_admin_first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.new_admin_last_name}
                        onChange={(e) => handleChange("new_admin_last_name", e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                          errors.new_admin_last_name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter last name"
                      />
                      {errors.new_admin_last_name && (
                        <p className="text-red-500 text-xs mt-1">{errors.new_admin_last_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={formData.new_admin_email}
                        onChange={(e) => handleChange("new_admin_email", e.target.value)}
                        className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                          errors.new_admin_email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="newadmin@institution.edu"
                      />
                    </div>
                    {errors.new_admin_email && (
                      <p className="text-red-500 text-xs mt-1">{errors.new_admin_email}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Login credentials will be sent to this email
                    </p>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.new_admin_phone}
                          onChange={(e) => handleChange("new_admin_phone", e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username (Optional)
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={formData.new_admin_username}
                          onChange={(e) => handleChange("new_admin_username", e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          placeholder="admin_username"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Auto-generated if not provided</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white px-4 py-2.5 rounded-lg hover:from-primary hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Replace Administrator
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}