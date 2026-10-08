// @ts-nocheck
"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  fetchAllHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  toggleHeroSlideStatus,
  clearHeroError,
} from "@/lib/features/auth/heroSlideSlice"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner";
import {
  ImageIcon, Plus, Edit, Trash2, Eye, EyeOff, Save, X,
  RefreshCw, Loader2, AlertTriangle, CheckCircle, Sparkles,
  Upload, Users, Calendar, TrendingUp, BookOpen, MessageSquare,
  Award, Globe, Zap, Star, Send, Shield, Building2, FileText,
  ArrowRight, Image as ImageLucide, Layers, Link as LinkIcon,
} from "lucide-react"

// ✅ Available icon names that match the home page hero section
const ICON_OPTIONS = [
  { name: "Sparkles", Icon: Sparkles },
  { name: "Upload", Icon: Upload },
  { name: "Users", Icon: Users },
  { name: "Calendar", Icon: Calendar },
  { name: "TrendingUp", Icon: TrendingUp },
  { name: "BookOpen", Icon: BookOpen },
  { name: "MessageSquare", Icon: MessageSquare },
  { name: "Award", Icon: Award },
  { name: "Globe", Icon: Globe },
  { name: "Zap", Icon: Zap },
  { name: "Star", Icon: Star },
  { name: "Send", Icon: Send },
  { name: "Shield", Icon: Shield },
  { name: "Building2", Icon: Building2 },
  { name: "FileText", Icon: FileText },
  { name: "ArrowRight", Icon: ArrowRight },
]

const ICON_BY_NAME: Record<string, any> = ICON_OPTIONS.reduce((acc, x) => {
  acc[x.name] = x.Icon
  return acc
}, {} as Record<string, any>)

interface HeroFormState {
  title: string
  eyebrow: string
  headline: string
  description: string
  cta_text: string
  cta_href: string
  icon_name: string
  display_order: number
  is_active: boolean
  imageFile: File | null
}

const emptyForm: HeroFormState = {
  title: "",
  eyebrow: "",
  headline: "",
  description: "",
  cta_text: "Learn More",
  cta_href: "/register",
  icon_name: "Sparkles",
  display_order: 0,
  is_active: true,
  imageFile: null,
}

// ============= Confirmation Modal =============
function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isProcessing = false, danger = false,
}: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        <div className={`px-5 py-4 flex items-center gap-3 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
          <div className={`p-2 rounded-lg ${danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        <div className="px-5 py-4 text-sm text-gray-600">{message}</div>
        <div className="px-5 py-3 bg-gray-50 flex items-center justify-end gap-2 border-t border-gray-200">
          <button
            disabled={isProcessing}
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isProcessing}
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-bold text-white rounded inline-flex items-center gap-1.5 transition-colors ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#0158B7] hover:bg-blue-700"
            } disabled:opacity-60`}
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============= Slide Form Modal (Create / Edit) =============
function HeroSlideFormModal({
  isOpen, onClose, initialData, onSubmit, isSubmitting,
}: any) {
  const [form, setForm] = useState<HeroFormState>(emptyForm)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || "",
        eyebrow: initialData.eyebrow || "",
        headline: initialData.headline || "",
        description: initialData.description || "",
        cta_text: initialData.cta_text || "Learn More",
        cta_href: initialData.cta_href || "/register",
        icon_name: initialData.icon_name || "Sparkles",
        display_order: initialData.display_order ?? 0,
        is_active: !!initialData.is_active,
        imageFile: null,
      })
      setPreviewUrl(initialData.image_url || null)
    } else {
      setForm(emptyForm)
      setPreviewUrl(null)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file")
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB")
      return
    }
    setForm((prev) => ({ ...prev, imageFile: f }))
    setPreviewUrl(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error("Section name (title) is required")
    if (!form.headline.trim()) return toast.error("Headline is required")

    const fd = new FormData()
    fd.append("title", form.title)
    fd.append("eyebrow", form.eyebrow)
    fd.append("headline", form.headline)
    fd.append("description", form.description)
    fd.append("cta_text", form.cta_text)
    fd.append("cta_href", form.cta_href)
    fd.append("icon_name", form.icon_name)
    fd.append("display_order", String(form.display_order))
    fd.append("is_active", String(form.is_active))
    if (form.imageFile) fd.append("image", form.imageFile)

    await onSubmit(fd)
  }

  const SelectedIcon = ICON_BY_NAME[form.icon_name] || Sparkles

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0158B7] to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialData ? "Edit Hero Slide" : "Create Hero Slide"}
              </h3>
              <p className="text-xs text-blue-100">
                These slides power the home page hero — right side dynamic content.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Name (Title) *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Share Research"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Internal name + the small top-left label shown on the slide.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Eyebrow (Pill Badge Text)
                </label>
                <input
                  type="text"
                  value={form.eyebrow}
                  onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                  placeholder="e.g. SHARE RESEARCH"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Headline *
                </label>
                <textarea
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  rows={3}
                  placeholder={`Your Work Deserves\nan Audience`}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Use line breaks (Enter) to control headline wrapping.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description (optional, internal only)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Internal description for admins"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    placeholder="Publish Now"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CTA Link (Href)
                  </label>
                  <input
                    type="text"
                    value={form.cta_href}
                    onChange={(e) => setForm({ ...form, cta_href: e.target.value })}
                    placeholder="/register"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Icon
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={form.icon_name}
                      onChange={(e) => setForm({ ...form, icon_name: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.name} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <SelectedIcon className="w-4 h-4 text-[#0158B7]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({ ...form, display_order: Number(e.target.value || 0) })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0158B7] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0158B7] rounded"
                />
                <label htmlFor="is_active" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Active (visible on the home page)
                </label>
              </div>
            </div>

            {/* RIGHT: Image Upload + Preview */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Slide Image {initialData ? "(leave empty to keep current)" : "*"}
                </label>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-[#0158B7] rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-7 h-7 text-gray-400" />
                  <p className="text-xs text-gray-600 font-medium">
                    Click to upload from your computer
                  </p>
                  <p className="text-[10px] text-gray-400">PNG, JPG, WEBP — max 10MB</p>
                  {form.imageFile && (
                    <p className="text-[11px] text-[#0158B7] font-semibold">
                      📎 {form.imageFile.name}
                    </p>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              {/* Live Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Live Preview</p>
                <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200" style={{ height: 240 }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center">
                      <ImageLucide className="w-10 h-10 text-blue-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000d20]/90 via-[#001740]/55 to-transparent" />

                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[#C9932A] text-[0.58rem] uppercase tracking-[0.18em] font-bold">
                      {form.title || "Section Name"}
                    </span>
                    <div className="w-7 h-[1.5px] bg-[#C9932A] mt-1" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
                    <div className="inline-flex items-center gap-1.5 bg-white/12 backdrop-blur-sm border border-white/20 rounded-full px-3 py-[5px] mb-2">
                      <SelectedIcon className="w-3 h-3 text-white" />
                      <span className="text-[9px] font-bold text-white tracking-[0.15em] uppercase">
                        {form.eyebrow || "EYEBROW"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-[1.18] mb-2 whitespace-pre-line">
                      {form.headline || "Your headline appears here"}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 bg-[#C9932A] text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                      {form.cta_text || "CTA"}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#0158B7] to-blue-600 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {initialData ? "Update Slide" : "Create Slide"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============= Main Page =============
export default function AdminHeroSlidesPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { slides, isLoading, isSubmitting, error } =
    useSelector((state: RootState) => state.heroSlides)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [confirm, setConfirm] = useState<{ open: boolean; type: "delete" | "toggle"; slide: any }>({
    open: false,
    type: "delete",
    slide: null,
  })
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [confirmProcessing, setConfirmProcessing] = useState(false)

  useEffect(() => {
    dispatch(fetchAllHeroSlides())
  }, [dispatch])

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearHeroError())
    }
  }, [error, dispatch])

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = (slide: any) => {
    setEditing(slide)
    setShowForm(true)
  }

  const handleSubmit = async (formData: FormData) => {
    try {
      if (editing) {
        await dispatch(updateHeroSlide({ id: editing.id, formData })).unwrap()
        toast.success("✅ Hero slide updated successfully")
      } else {
        await dispatch(createHeroSlide(formData)).unwrap()
        toast.success("🎉 Hero slide created successfully")
      }
      setShowForm(false)
      setEditing(null)
      dispatch(fetchAllHeroSlides())
    } catch (err: any) {
      toast.error(err || "Failed to save hero slide")
    }
  }

  const handleConfirm = async () => {
    if (!confirm.slide) return
    setConfirmProcessing(true)
    setProcessingId(confirm.slide.id)
    try {
      if (confirm.type === "delete") {
        await dispatch(deleteHeroSlide(confirm.slide.id)).unwrap()
        toast.success("🗑️ Hero slide deleted")
      } else {
        await dispatch(toggleHeroSlideStatus(confirm.slide.id)).unwrap()
        toast.success("✅ Hero slide status updated")
      }
      setConfirm({ open: false, type: "delete", slide: null })
    } catch (err: any) {
      toast.error(err || "Action failed")
    } finally {
      setConfirmProcessing(false)
      setProcessingId(null)
    }
  }

  const stats = {
    total: slides.length,
    active: slides.filter((s: any) => s.is_active).length,
    inactive: slides.filter((s: any) => !s.is_active).length,
    withImage: slides.filter((s: any) => !!s.image_url).length,
  }

  const statCards = [
    { label: "Total Slides", value: stats.total, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", iconColor: "text-blue-500", Icon: Layers },
    { label: "Active", value: stats.active, bg: "bg-green-50", text: "text-green-700", border: "border-green-100", iconColor: "text-green-500", Icon: CheckCircle },
    { label: "Inactive", value: stats.inactive, bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-100", iconColor: "text-gray-500", Icon: EyeOff },
    { label: "With Image", value: stats.withImage, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", iconColor: "text-purple-500", Icon: ImageLucide },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#0158B7] to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Hero Slides Management
                </h1>
                <p className="text-xs text-gray-500">
                  Power the home page hero — right side dynamic content
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(fetchAllHeroSlides())}
                disabled={isLoading}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={openCreate}
                className="flex items-center px-3 py-1.5 bg-gradient-to-r from-[#0158B7] to-blue-600 text-white rounded-lg hover:shadow-md transition-all text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Hero Slide
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s, i) => (
              <div
                key={i}
                className={`${s.bg} border ${s.border} rounded-lg p-3 flex items-center justify-between`}
              >
                <div>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className={`text-xs font-medium ${s.text}`}>{s.label}</p>
                </div>
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
        >
          {isLoading && slides.length === 0 ? (
            <div className="p-12 flex items-center justify-center text-gray-500 text-sm">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-[#0158B7]" />
              Loading hero slides...
            </div>
          ) : slides.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <ImageIcon className="w-6 h-6 text-[#0158B7]" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                No hero slides yet
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                The home page is currently showing fallback splash content.
                <br /> Create your first slide to make it dynamic.
              </p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0158B7] text-white text-xs font-bold rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Slide
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              <AnimatePresence>
                {slides.map((slide: any) => {
                  const Icon = ICON_BY_NAME[slide.icon_name] || Sparkles
                  const isProcessing = processingId === slide.id
                  return (
                    <motion.div
                      key={slide.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="relative h-40 bg-gradient-to-br from-blue-100 to-blue-300">
                        {slide.image_url ? (
                          <img
                            src={slide.image_url}
                            alt={slide.title}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageLucide className="w-8 h-8 text-blue-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#000d20]/80 via-transparent to-transparent" />
                        <div className="absolute top-2 left-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              slide.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {slide.is_active ? <CheckCircle className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                            {slide.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white font-semibold">
                          #{slide.display_order ?? 0}
                        </div>
                        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-2 py-1">
                          <Icon className="w-3 h-3 text-white" />
                          <span className="text-[9px] font-bold text-white tracking-wider uppercase">
                            {slide.eyebrow || slide.title}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-[#0158B7] uppercase tracking-wider">
                            {slide.title}
                          </p>
                          <h3 className="text-sm font-bold text-gray-900 leading-snug whitespace-pre-line line-clamp-2">
                            {slide.headline}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-gray-600">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0158B7] px-1.5 py-0.5 rounded">
                            <ArrowRight className="w-2.5 h-2.5" />
                            {slide.cta_text}
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-500 truncate">
                            <LinkIcon className="w-2.5 h-2.5" />
                            {slide.cta_href}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(slide)}
                              disabled={isProcessing}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-60"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, type: "toggle", slide })}
                              disabled={isProcessing}
                              className={`p-1.5 rounded transition-colors disabled:opacity-60 ${
                                slide.is_active
                                  ? "text-orange-600 bg-orange-50 hover:bg-orange-100"
                                  : "text-green-600 bg-green-50 hover:bg-green-100"
                              }`}
                              title={slide.is_active ? "Deactivate" : "Activate"}
                            >
                              {slide.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, type: "delete", slide })}
                              disabled={isProcessing}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-60"
                              title="Delete"
                            >
                              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="text-[9px] text-gray-400">
                            {new Date(slide.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Form Modal */}
      <HeroSlideFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        initialData={editing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, type: "delete", slide: null })}
        onConfirm={handleConfirm}
        title={
          confirm.type === "delete"
            ? "Delete Hero Slide"
            : confirm.slide?.is_active
              ? "Deactivate Hero Slide"
              : "Activate Hero Slide"
        }
        message={
          confirm.type === "delete"
            ? `Permanently delete "${confirm.slide?.title || "this slide"}"? This will also remove its image from cloud storage.`
            : confirm.slide?.is_active
              ? `Hide "${confirm.slide?.title || "this slide"}" from the home page hero?`
              : `Make "${confirm.slide?.title || "this slide"}" visible on the home page hero?`
        }
        confirmText={
          confirm.type === "delete"
            ? "Delete Permanently"
            : confirm.slide?.is_active
              ? "Deactivate"
              : "Activate"
        }
        isProcessing={confirmProcessing}
        danger={confirm.type === "delete"}
      />
    </div>
  )
}
