"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { 
  createInstitution, 
  updateInstitution, 
  fetchInstitutionById 
} from "@/lib/features/institutions/institutionSlice";
import {
  Building2,
  Upload,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  X,
  User,
  Users,
  UserCog,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CreateEditInstitutionPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const institutionId = searchParams.get("id");
  const isEditMode = !!institutionId;

  const { selectedInstitution, isCreating, isUpdating, error } = useAppSelector(
    (state) => state.institutions
  );

  const [formData, setFormData] = useState({
    name: "",
    type: "UNIVERSITY" as "UNIVERSITY" | "GOVERNMENT" | "PRIVATE_COMPANY" | "NGO",
    description: "",
    allow_public_courses: true,
    require_approval_for_spoc: false,
    max_instructors: 50,
    max_members: 500,
    // Admin details (only for creation)
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_phone: "",
    admin_username: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && institutionId) {
      dispatch(fetchInstitutionById(institutionId));
    }
  }, [isEditMode, institutionId, dispatch]);

  useEffect(() => {
    if (isEditMode && selectedInstitution) {
      setFormData({
        name: selectedInstitution.name,
        type: selectedInstitution.type,
        description: selectedInstitution.description || "",
        allow_public_courses: selectedInstitution.settings?.allow_public_courses ?? true,
        require_approval_for_spoc: selectedInstitution.settings?.require_approval_for_spoc ?? false,
        max_instructors: selectedInstitution.max_instructors ?? 50,
        max_members: selectedInstitution.max_members ?? 500,
        admin_email: "",
        admin_first_name: "",
        admin_last_name: "",
        admin_phone: "",
        admin_username: "",
      });
      if (selectedInstitution.logo_url) {
        setLogoPreview(selectedInstitution.logo_url);
      }
    }
  }, [isEditMode, selectedInstitution]);

  const institutionTypes = [
    {
      value: "UNIVERSITY",
      label: "University",
      description: "Educational institution for higher learning",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      value: "GOVERNMENT",
      label: "Government",
      description: "Government organization or agency",
      color: "bg-green-50 border-green-200 text-green-700",
    },
    {
      value: "PRIVATE_COMPANY",
      label: "Private Company",
      description: "Corporate training and development",
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
    {
      value: "NGO",
      label: "NGO",
      description: "Non-governmental organization",
      color: "bg-amber-50 border-amber-200 text-amber-700",
    },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Institution name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Institution name must be at least 3 characters";
    }

    if (!formData.type) {
      newErrors.type = "Institution type is required";
    }

    if (formData.max_instructors < 0) {
      newErrors.max_instructors = "Maximum instructors cannot be negative";
    }

    if (formData.max_members < 0) {
      newErrors.max_members = "Maximum members cannot be negative";
    }

    // Validate admin fields only for creation
    if (!isEditMode) {
      if (!formData.admin_email.trim()) {
        newErrors.admin_email = "Admin email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
        newErrors.admin_email = "Invalid email format";
      }

      if (!formData.admin_first_name.trim()) {
        newErrors.admin_first_name = "Admin first name is required";
      }

      if (!formData.admin_last_name.trim()) {
        newErrors.admin_last_name = "Admin last name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name.trim());
    formDataToSend.append("type", formData.type);
    formDataToSend.append("description", formData.description.trim());
    formDataToSend.append("max_instructors", formData.max_instructors.toString());
    formDataToSend.append("max_members", formData.max_members.toString());
    
    const settings = {
      allow_public_courses: formData.allow_public_courses,
      require_approval_for_spoc: formData.require_approval_for_spoc,
    };
    formDataToSend.append("settings", JSON.stringify(settings));

    // Add admin details only for creation
    if (!isEditMode) {
      formDataToSend.append("admin_email", formData.admin_email.trim());
      formDataToSend.append("admin_first_name", formData.admin_first_name.trim());
      formDataToSend.append("admin_last_name", formData.admin_last_name.trim());
      if (formData.admin_phone) {
        formDataToSend.append("admin_phone", formData.admin_phone.trim());
      }
      if (formData.admin_username) {
        formDataToSend.append("admin_username", formData.admin_username.trim());
      }
    }

    if (logoFile) {
      formDataToSend.append("logoFile", logoFile);
    }

    try {
      if (isEditMode && institutionId) {
        await dispatch(
          updateInstitution({ id: institutionId, formData: formDataToSend })
        ).unwrap();
        toast.success("Institution updated successfully!");
      } else {
        await dispatch(createInstitution(formDataToSend)).unwrap();
        toast.success("Institution and admin created successfully!");
      }
      router.push("/dashboard/system-admin/institutions");
    } catch (error: any) {
      console.error("❌ Submission error:", error);
      toast.error(error || "Operation failed");
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/system-admin/institutions"
            className="inline-flex items-center text-[#5B7FA2] hover:text-blue-800 mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Institutions
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "Edit Institution" : "Create New Institution"}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode
                  ? "Update institution details and limits"
                  : "Add a new institution to the platform"}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#5B7FA2] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution Logo
              </label>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG or WEBP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Institution Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Harvard University"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Institution Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Institution Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {institutionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange("type", type.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      formData.type === type.value
                        ? `${type.color} border-current`
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.type === type.value
                            ? "border-current"
                            : "border-gray-300"
                        }`}
                      >
                        {formData.type === type.value && (
                          <div className="w-2.5 h-2.5 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm opacity-75 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Describe your institution..."
              />
            </div>

            {/* Limits Section - NEW */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-3 border-b border-indigo-200">
                <h4 className="text-sm font-semibold text-indigo-800 flex items-center uppercase tracking-wide">
                  <Users className="w-4 h-4 mr-2 text-indigo-600" />
                  Institution Capacity Limits
                </h4>
                <p className="text-xs text-indigo-600 mt-1">
                  Set maximum number of instructors and members for this institution
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-indigo-600" />
                        Maximum Instructors
                      </div>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_instructors}
                      onChange={(e) =>
                        handleChange("max_instructors", parseInt(e.target.value) || 0)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.max_instructors ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set to 0 for unlimited instructors
                    </p>
                    {errors.max_instructors && (
                      <p className="text-red-500 text-sm mt-1">{errors.max_instructors}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Maximum Members
                      </div>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_members}
                      onChange={(e) =>
                        handleChange("max_members", parseInt(e.target.value) || 0)
                      }
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.max_members ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set to 0 for unlimited members
                    </p>
                    {errors.max_members && (
                      <p className="text-red-500 text-sm mt-1">{errors.max_members}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">
                Institution Settings
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Allow Public Courses
                    </p>
                    <p className="text-xs text-gray-500">
                      Enable courses to be publicly accessible
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allow_public_courses}
                    onChange={(e) =>
                      handleChange("allow_public_courses", e.target.checked)
                    }
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Require SPOC Approval
                    </p>
                    <p className="text-xs text-gray-500">
                      Require approval for SPOC course enrollments
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.require_approval_for_spoc}
                    onChange={(e) =>
                      handleChange("require_approval_for_spoc", e.target.checked)
                    }
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Admin Information - Only show for creation */}
            {!isEditMode && (
              <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 flex items-center uppercase tracking-wide">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Institution Administrator
                  </h4>
                  <p className="text-xs text-blue-600 mt-1">
                    Create the primary administrator account for this institution
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.admin_first_name}
                        onChange={(e) => handleChange("admin_first_name", e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.admin_first_name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="John"
                      />
                      {errors.admin_first_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.admin_first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.admin_last_name}
                        onChange={(e) => handleChange("admin_last_name", e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.admin_last_name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Doe"
                      />
                      {errors.admin_last_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.admin_last_name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => handleChange("admin_email", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.admin_email ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="admin@institution.edu"
                    />
                    {errors.admin_email && (
                      <p className="text-red-500 text-sm mt-1">{errors.admin_email}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Login credentials will be sent to this email
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.admin_phone}
                        onChange={(e) => handleChange("admin_phone", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.admin_username}
                        onChange={(e) => handleChange("admin_username", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="admin_username"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-generated if not provided
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> A temporary password will be generated and sent to the admin's email. 
                      They will be required to change it upon first login.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/dashboard/system-admin/institutions"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-[#5B7FA2] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {isEditMode ? "Update Institution" : "Create Institution"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}