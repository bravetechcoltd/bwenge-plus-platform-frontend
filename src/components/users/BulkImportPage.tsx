"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  UploadCloud, Building2, Loader2, FileText, Download,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2,
  Eye, Play, ArrowRight, Users, UserCheck, UserX,
  ChevronDown, Info, Table as TableIcon, FileSpreadsheet,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface CSVRow {
  [key: string]: string;
}

interface ParsedUser {
  rowIndex: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  country?: string;
  valid: boolean;
  errors: string[];
}

interface ImportJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: string[];
  created_at: string;
  completed_at?: string;
}

const VALID_ROLES = ["MEMBER", "INSTRUCTOR", "CONTENT_CREATOR", "ADMIN"];

const TEMPLATE_CSV = `email,first_name,last_name,role,phone,country
alice@example.com,Alice,Johnson,MEMBER,+250788000001,Rwanda
bob@example.com,Bob,Smith,INSTRUCTOR,+250788000002,Rwanda
carol@example.com,Carol,White,CONTENT_CREATOR,,Uganda
david@example.com,David,Brown,MEMBER,,Kenya`;

const parseCSV = (text: string): { headers: string[]; rows: CSVRow[] } => {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: CSVRow[] = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: CSVRow = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
};

const validateUser = (row: CSVRow, index: number): ParsedUser => {
  const errors: string[] = [];
  const email = (row.email || row.Email || "").trim();
  const first_name = (row.first_name || row.firstname || row["First Name"] || "").trim();
  const last_name = (row.last_name || row.lastname || row["Last Name"] || "").trim();
  const role = (row.role || row.Role || "MEMBER").trim().toUpperCase();

  if (!email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
  if (!first_name) errors.push("First name is required");
  if (!VALID_ROLES.includes(role)) errors.push(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`);

  return {
    rowIndex: index + 2, // +2 for header row and 1-based index
    email,
    first_name,
    last_name,
    role: VALID_ROLES.includes(role) ? role : "MEMBER",
    phone: row.phone || row.Phone || "",
    country: row.country || row.Country || "",
    valid: errors.length === 0,
    errors,
  };
};

export default function BulkImportPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState("MEMBER");
  const [previewTab, setPreviewTab] = useState<"valid" | "invalid">("valid");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ succeeded: number; failed: number; errors: string[] } | null>(null);
  const [pastJobs, setPastJobs] = useState<ImportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchPastJobs = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/bulk-import/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setPastJobs(data.data?.jobs || data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingJobs(false);
    }
  }, [institutionId, hasAccess, getToken]);

  useEffect(() => { fetchPastJobs(); }, [fetchPastJobs]);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      const users = rows.map((row, i) => validateUser(row, i));
      setParsedUsers(users);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const validUsers = parsedUsers.filter(u => u.valid);
    if (!validUsers.length || !institutionId) return;

    setConfirmImportOpen(false);
    setImporting(true);
    setImportProgress(0);

    try {
      // Try file upload first
      const formData = new FormData();
      if (selectedFile) formData.append("file", selectedFile);
      formData.append("default_role", defaultRole);

      const res = await fetch(`${API_URL}/institutions/${institutionId}/bulk-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();

      if (data.success || res.ok) {
        const jobId = data.data?.job_id || data.job_id;
        if (jobId) {
          setImportJobId(jobId);
          // Poll for progress
          const poll = setInterval(async () => {
            try {
              const pollRes = await fetch(`${API_URL}/institutions/${institutionId}/bulk-import/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              });
              const pollData = await pollRes.json();
              const job = pollData.data || pollData;
              const progress = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
              setImportProgress(progress);
              if (job.status === "COMPLETED" || job.status === "FAILED") {
                clearInterval(poll);
                setImporting(false);
                setImportResult({
                  succeeded: job.succeeded,
                  failed: job.failed,
                  errors: job.errors || [],
                });
                if (job.succeeded > 0) toast.success(`${job.succeeded} users imported successfully!`);
                if (job.failed > 0) toast.error(`${job.failed} rows failed. Check errors below.`);
                fetchPastJobs();
              }
            } catch {
              clearInterval(poll);
              setImporting(false);
            }
          }, 1500);
        } else {
          // Immediate result (no async job)
          setImporting(false);
          setImportResult({
            succeeded: data.data?.succeeded || validUsers.length,
            failed: data.data?.failed || 0,
            errors: data.data?.errors || [],
          });
          toast.success(`Import completed! ${data.data?.succeeded || validUsers.length} users added.`);
          fetchPastJobs();
        }
      } else {
        setImporting(false);
        toast.error(data.message || "Import failed");
      }
    } catch (err) {
      setImporting(false);
      toast.error("Import failed. Please try again.");
    }
  };

  const validUsers = parsedUsers.filter(u => u.valid);
  const invalidUsers = parsedUsers.filter(u => !u.valid);

  if (authLoading && !authUser) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!authLoading && !hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">You don't have admin access to this institution.</p>
          <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud className="w-7 h-7 text-primary" /> Bulk Import Users
            </h1>
            <p className="text-gray-500 mt-1">Upload a CSV file to add many users at once</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" /> Upload CSV File
                </CardTitle>
                <CardDescription>
                  Upload a .csv file with user data. Maximum 500 rows per import, 5MB file size.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                      dragOver ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <UploadCloud className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold text-lg">Drop your CSV here</p>
                    <p className="text-gray-400 mt-1 text-sm">or click to browse files</p>
                    <Button variant="outline" className="mt-4" size="sm">
                      Browse File
                    </Button>
                    <p className="text-xs text-gray-400 mt-3">Supported: .csv · Max 5MB · Max 500 rows</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB · {parsedUsers.length} rows detected
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => {
                          setSelectedFile(null);
                          setParsedUsers([]);
                          setImportResult(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-gray-50 text-center">
                        <p className="text-2xl font-bold">{parsedUsers.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total Rows</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 text-center">
                        <p className="text-2xl font-bold text-green-700">{validUsers.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Valid</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 text-center">
                        <p className="text-2xl font-bold text-red-700">{invalidUsers.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Invalid</p>
                      </div>
                    </div>

                    {/* Default Role Override */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        Default Role (for rows without a role column)
                        <Tooltip>
                          <TooltipTrigger><Info className="w-3 h-3 text-gray-400" /></TooltipTrigger>
                          <TooltipContent>If a row has a "role" column with a valid value, that takes priority.</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select value={defaultRole} onValueChange={setDefaultRole}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member / Student</SelectItem>
                          <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                          <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Import Progress */}
                    {importing && (
                      <div className="space-y-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 font-medium flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Importing users...
                          </span>
                          <span className="text-blue-600">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                      </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                      <Alert className={importResult.failed === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                        {importResult.failed === 0 ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                        <AlertTitle className={importResult.failed === 0 ? "text-green-800" : "text-amber-800"}>
                          Import {importResult.failed === 0 ? "Completed" : "Finished with Errors"}
                        </AlertTitle>
                        <AlertDescription className={importResult.failed === 0 ? "text-green-700" : "text-amber-700"}>
                          {importResult.succeeded} users added successfully.
                          {importResult.failed > 0 && ` ${importResult.failed} rows failed.`}
                          {importResult.errors?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs">
                              {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                              {importResult.errors.length > 5 && <li>+ {importResult.errors.length - 5} more errors</li>}
                            </ul>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Button */}
                    {!importing && !importResult && (
                      <Button
                        onClick={() => setConfirmImportOpen(true)}
                        disabled={validUsers.length === 0}
                        className="w-full"
                        size="lg"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Import {validUsers.length} Valid User{validUsers.length !== 1 ? "s" : ""}
                      </Button>
                    )}

                    {importResult && (
                      <Button variant="outline" className="w-full" onClick={() => {
                        setSelectedFile(null); setParsedUsers([]); setImportResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}>
                        Import Another File
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Table */}
            {parsedUsers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Data Preview</CardTitle>
                    <Tabs value={previewTab} onValueChange={v => setPreviewTab(v as any)}>
                      <TabsList>
                        <TabsTrigger value="valid" className="gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />Valid ({validUsers.length})
                        </TabsTrigger>
                        <TabsTrigger value="invalid" className="gap-1.5">
                          <XCircle className="w-3 h-3 text-red-500" />Issues ({invalidUsers.length})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-80">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="pl-6 w-12">#</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Country</TableHead>
                          {previewTab === "invalid" && <TableHead>Issues</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(previewTab === "valid" ? validUsers : invalidUsers).slice(0, 50).map(user => (
                          <TableRow key={user.rowIndex} className={!user.valid ? "bg-red-50" : ""}>
                            <TableCell className="pl-6 text-gray-400 text-xs">{user.rowIndex}</TableCell>
                            <TableCell className="text-sm">{user.email || <span className="text-red-400 italic">missing</span>}</TableCell>
                            <TableCell className="text-sm">
                              {user.first_name} {user.last_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{user.role}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{user.phone || "—"}</TableCell>
                            <TableCell className="text-sm text-gray-500">{user.country || "—"}</TableCell>
                            {previewTab === "invalid" && (
                              <TableCell>
                                <div className="space-y-0.5">
                                  {user.errors.map((e, i) => (
                                    <p key={i} className="text-xs text-red-600">• {e}</p>
                                  ))}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {(previewTab === "valid" ? validUsers : invalidUsers).length > 50 && (
                      <p className="text-center text-xs text-gray-400 py-3">
                        Showing 50 of {(previewTab === "valid" ? validUsers : invalidUsers).length} rows
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Guide + History */}
          <div className="space-y-5">
            {/* Format Guide */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" /> CSV Format Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700 mb-1.5">Required columns:</p>
                  <div className="space-y-1">
                    {[
                      ["email", "User's email address"],
                      ["first_name", "Given name"],
                    ].map(([col, desc]) => (
                      <div key={col} className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono text-xs px-1.5 flex-shrink-0 mt-0.5">{col}</Badge>
                        <span className="text-gray-500 text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold text-gray-700 mb-1.5">Optional columns:</p>
                  <div className="space-y-1">
                    {[
                      ["last_name", "Family name"],
                      ["role", "MEMBER, INSTRUCTOR, CONTENT_CREATOR, or ADMIN"],
                      ["phone", "Phone number"],
                      ["country", "Country name"],
                    ].map(([col, desc]) => (
                      <div key={col} className="flex items-start gap-2">
                        <Badge variant="secondary" className="font-mono text-xs px-1.5 flex-shrink-0 mt-0.5">{col}</Badge>
                        <span className="text-gray-500 text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Valid roles:</p>
                  <div className="flex flex-wrap gap-1">
                    {VALID_ROLES.map(r => (
                      <Badge key={r} variant="outline" className="font-mono text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" /> Download Template
                </Button>
              </CardContent>
            </Card>

            {/* Import History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Import History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : pastJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <TableIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No past imports</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pastJobs.slice(0, 10).map(job => (
                      <div key={job.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {job.status === "COMPLETED" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {job.status === "FAILED" && <XCircle className="w-4 h-4 text-red-500" />}
                            {job.status === "PROCESSING" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                            {job.status === "PENDING" && <Clock className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-medium">{job.total} users</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {job.status === "COMPLETED" && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-green-600">✓ {job.succeeded} ok</span>
                            {job.failed > 0 && <span className="text-red-500">✗ {job.failed} failed</span>}
                          </div>
                        )}
                        {job.status === "PROCESSING" && (
                          <Progress
                            value={job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0}
                            className="h-1.5 mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Confirm Import Dialog */}
        <Dialog open={confirmImportOpen} onOpenChange={setConfirmImportOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm Import</DialogTitle>
              <DialogDescription>
                You're about to import <strong>{validUsers.length}</strong> user{validUsers.length !== 1 ? "s" : ""} into this institution.
                {invalidUsers.length > 0 && (
                  <span className="block mt-1 text-amber-600">
                    ⚠ {invalidUsers.length} row{invalidUsers.length !== 1 ? "s" : ""} will be skipped due to validation errors.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xl font-bold">{validUsers.length}</p>
                  <p className="text-xs text-gray-500">Will import</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <p className="text-xl font-bold text-red-600">{invalidUsers.length}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-xl font-bold text-blue-600">{parsedUsers.length}</p>
                  <p className="text-xs text-gray-500">Total rows</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImport}>
                <Play className="w-4 h-4 mr-2" /> Start Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}