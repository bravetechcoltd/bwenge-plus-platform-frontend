"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getDatabaseBackups,
  getDatabaseHealth,
  getDatabaseStatus,
  getActiveQueries,
  createDatabaseBackup,
  restoreDatabaseBackup,
  deleteDatabaseBackup,
  runVacuum,
  runAnalyze,
  terminateQuery,
  DatabaseBackup,
} from "@/lib/features/system-settings/systemSettingsSlice";
import {
  Database,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Play,
  AlertCircle,
  Check,
  X,
  Clock,
  HardDrive,
  Activity,
  Cpu,
  Zap,
  BarChart,
  Server,
  Save,
  PlayCircle,
  StopCircle,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

export default function DatabasePage() {
  const dispatch = useAppDispatch();
  const {
    databaseBackups,
    databaseHealth,
    databaseStatus,
    activeQueries,
    isLoading,
    pagination,
  } = useAppSelector((state) => state.systemSettings);

  const [activeTab, setActiveTab] = useState<"backups" | "health" | "queries" | "maintenance">("backups");
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null);
  const [backupType, setBackupType] = useState<"FULL" | "INCREMENTAL">("FULL");
  const [backupNotes, setBackupNotes] = useState("");
  const [showQueryDetails, setShowQueryDetails] = useState<Record<string, boolean>>({});
  const [maintenanceTable, setMaintenanceTable] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [dispatch, activeTab, page]);

  const loadData = () => {
    if (activeTab === "backups") {
      dispatch(getDatabaseBackups({ page, limit: 10 }));
    } else if (activeTab === "health") {
      dispatch(getDatabaseHealth());
      dispatch(getDatabaseStatus());
    } else if (activeTab === "queries") {
      dispatch(getActiveQueries());
    }
  };

  const handleCreateBackup = async () => {
    try {
      await dispatch(createDatabaseBackup({
        type: backupType,
        notes: backupNotes,
      })).unwrap();
      toast.success("Backup started successfully");
      setShowBackupModal(false);
      setBackupNotes("");
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to start backup");
    }
  };

  const handleRestoreBackup = async (id: string) => {
    try {
      await dispatch(restoreDatabaseBackup(id)).unwrap();
      toast.success("Restore started successfully");
      setShowRestoreModal(null);
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to start restore");
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) return;

    try {
      await dispatch(deleteDatabaseBackup(id)).unwrap();
      toast.success("Backup deleted successfully");
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to delete backup");
    }
  };

  const handleTerminateQuery = async (pid: number) => {
    if (!confirm(`Are you sure you want to terminate query ${pid}?`)) return;

    try {
      await dispatch(terminateQuery(pid)).unwrap();
      toast.success("Query terminated successfully");
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to terminate query");
    }
  };

  const handleRunVacuum = async () => {
    try {
      await dispatch(runVacuum({
        table: maintenanceTable || undefined,
        full: false,
      })).unwrap();
      toast.success("Vacuum completed successfully");
    } catch (error: any) {
      toast.error(error || "Failed to run vacuum");
    }
  };

  const handleRunAnalyze = async () => {
    try {
      await dispatch(runAnalyze({
        table: maintenanceTable || undefined,
      })).unwrap();
      toast.success("Analyze completed successfully");
    } catch (error: any) {
      toast.error(error || "Failed to run analyze");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-success bg-success/10";
      case "FAILED":
        return "text-destructive bg-destructive/10";
      case "IN_PROGRESS":
      case "RESTORING":
        return "text-primary bg-primary/10";
      case "PENDING":
        return "text-warning bg-warning/10";
      default:
        return "text-muted-foreground bg-muted/50";
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Database Management</h1>
              <p className="text-sm text-muted-foreground">Backup, monitor, and maintain your database</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-2 border border-border rounded-lg hover:bg-muted/50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Quick Stats */}
        {databaseStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Database Size</p>
                <HardDrive className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatBytes(databaseStatus.size_bytes || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{databaseStatus.table_count || 0} tables</p>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Cache Hit Ratio</p>
                <Zap className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-bold text-warning">
                {databaseHealth?.current?.cache_hit_ratio?.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Index: {databaseHealth?.current?.index_hit_ratio?.toFixed(1)}%</p>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">
                {databaseHealth?.current?.active_connections || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Max: {databaseHealth?.current?.max_connections || 100}</p>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Query Latency</p>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">
                {databaseHealth?.current?.query_latency_ms?.toFixed(1)}ms
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg response time</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("backups")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "backups"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Backups
              </div>
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "health"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" />
                Health & Status
              </div>
            </button>
            <button
              onClick={() => setActiveTab("queries")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "queries"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart className="w-4 h-4" />
                Active Queries ({activeQueries.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "maintenance"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Cpu className="w-4 h-4" />
                Maintenance
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Backups Tab */}
            {activeTab === "backups" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Database Backups</h3>
                  <button
                    onClick={() => setShowBackupModal(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary"
                  >
                    <Play className="w-4 h-4" />
                    New Backup
                  </button>
                </div>

                <div className="space-y-3">
                  {databaseBackups.length === 0 ? (
                    <div className="text-center py-12 bg-muted/50 rounded-lg">
                      <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No backups found</p>
                    </div>
                  ) : (
                    databaseBackups.map((backup) => (
                      <motion.div
                        key={backup.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-muted/50 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-foreground">{backup.filename}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                                {backup.status}
                              </span>
                              <span className="text-xs text-muted-foreground">{backup.type}</span>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Size:</span>
                                <span className="ml-1 font-medium">{formatBytes(backup.size_bytes)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created:</span>
                                <span className="ml-1 font-medium">
                                  {formatDistanceToNow(new Date(backup.created_at))} ago
                                </span>
                              </div>
                              {backup.completed_at && (
                                <div>
                                  <span className="text-muted-foreground">Completed:</span>
                                  <span className="ml-1 font-medium">
                                    {formatDistanceToNow(new Date(backup.completed_at))} ago
                                  </span>
                                </div>
                              )}
                              {backup.is_automated && (
                                <div>
                                  <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded">
                                    Automated
                                  </span>
                                </div>
                              )}
                            </div>

                            {backup.error_message && (
                              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-destructive">{backup.error_message}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {backup.status === "COMPLETED" && (
                              <>
                                {backup.public_url && (
                                  <a
                                    href={backup.public_url}
                                    download
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setShowRestoreModal(backup.id)}
                                  className="p-2 text-warning hover:bg-warning/10 rounded-lg"
                                  title="Restore"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteBackup(backup.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-border rounded hover:bg-muted/50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        className="px-3 py-1 border border-border rounded hover:bg-muted/50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Health Tab */}
            {activeTab === "health" && databaseHealth && (
              <div className="space-y-6">
                {/* Current Health */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Current Health Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        {databaseHealth.current?.status === "healthy" ? (
                          <>
                            <Check className="w-5 h-5 text-success" />
                            <span className="font-semibold text-success">Healthy</span>
                          </>
                        ) : databaseHealth.current?.status === "degraded" ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-warning" />
                            <span className="font-semibold text-warning">Degraded</span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-destructive" />
                            <span className="font-semibold text-destructive">Down</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Cache Hit Ratio</p>
                      <p className="text-2xl font-bold text-foreground">
                        {databaseHealth.current?.cache_hit_ratio?.toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Index Hit Ratio</p>
                      <p className="text-2xl font-bold text-foreground">
                        {databaseHealth.current?.index_hit_ratio?.toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Last Checked</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDistanceToNow(new Date(databaseHealth.current?.checked_at))} ago
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table Statistics */}
                {databaseHealth.current?.table_stats && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Top Tables by Size</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Table</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Rows</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Size</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Index Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {databaseHealth.current.table_stats.map((stat: any) => (
                            <tr key={stat.table_name}>
                              <td className="px-4 py-2 text-sm font-mono">{stat.table_name}</td>
                              <td className="px-4 py-2 text-sm text-right">{stat.row_count.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatBytes(stat.size_mb * 1024 * 1024)}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatBytes(stat.index_size_mb)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Slow Queries */}
                {databaseHealth.current?.slow_queries && databaseHealth.current.slow_queries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Slow Queries</h3>
                    <div className="space-y-3">
                      {databaseHealth.current.slow_queries.map((query: any, index: number) => (
                        <div key={index} className="bg-muted/50 p-4 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-warning" />
                              <span className="font-medium text-warning">{query.mean_time_ms.toFixed(1)}ms avg</span>
                              <span className="text-sm text-muted-foreground">({query.calls} calls)</span>
                            </div>
                            <button
                              onClick={() => setShowQueryDetails(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              className="p-1 hover:bg-secondary rounded"
                            >
                              {showQueryDetails[index] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-sm font-mono bg-card p-2 rounded border border-border">
                            {query.query.length > 200 && !showQueryDetails[index]
                              ? query.query.substring(0, 200) + '...'
                              : query.query}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Queries Tab */}
            {activeTab === "queries" && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Active Queries</h3>
                {activeQueries.length === 0 ? (
                  <div className="text-center py-12 bg-muted/50 rounded-lg">
                    <BarChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No active queries</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeQueries.map((query: any) => (
                      <div key={query.pid} className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-primary" />
                              <span className="font-medium">PID: {query.pid}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>User: {query.user}</span>
                              <span>•</span>
                              <span>App: {query.application || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Started: {formatDistanceToNow(new Date(query.started))} ago</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTerminateQuery(query.pid)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                            title="Terminate"
                          >
                            <StopCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-mono bg-card p-2 rounded border border-border">
                          {query.query}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === "maintenance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Database Maintenance</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Run maintenance operations to optimize database performance.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vacuum */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-primary" />
                        <h4 className="font-medium text-foreground">VACUUM</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Reclaims storage occupied by dead tuples. Use FULL for aggressive reclaiming.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={maintenanceTable}
                          onChange={(e) => setMaintenanceTable(e.target.value)}
                          placeholder="Table name (optional)"
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleRunVacuum}
                            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary"
                          >
                            Run VACUUM
                          </button>
                          <button
                            onClick={() => handleRunVacuum()}
                            className="flex-1 bg-warning text-white px-4 py-2 rounded-lg hover:bg-warning"
                          >
                            Run VACUUM FULL
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Analyze */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart className="w-5 h-5 text-primary" />
                        <h4 className="font-medium text-foreground">ANALYZE</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Update statistics for the query planner to optimize query performance.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={maintenanceTable}
                          onChange={(e) => setMaintenanceTable(e.target.value)}
                          placeholder="Table name (optional)"
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={handleRunAnalyze}
                          className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary"
                        >
                          Run ANALYZE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Database Settings */}
                {databaseStatus?.version && (
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <h4 className="font-medium text-foreground mb-4">Database Information</h4>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-muted-foreground">Version</dt>
                        <dd className="text-sm font-medium text-foreground">{databaseStatus.version}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Total Size</dt>
                        <dd className="text-sm font-medium text-foreground">{formatBytes(databaseStatus.size_bytes)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Tables</dt>
                        <dd className="text-sm font-medium text-foreground">{databaseStatus.table_count}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Total Rows</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {databaseStatus.row_counts?.reduce((sum: number, r: any) => sum + r.rows, 0).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Backup Modal */}
        <AnimatePresence>
          {showBackupModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowBackupModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/15 rounded-lg">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Create Database Backup</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Backup Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={backupType === "FULL"}
                            onChange={() => setBackupType("FULL")}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-muted-foreground">Full Backup</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={backupType === "INCREMENTAL"}
                            onChange={() => setBackupType("INCREMENTAL")}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm text-muted-foreground">Incremental</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={backupNotes}
                        onChange={(e) => setBackupNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Add notes about this backup..."
                      />
                    </div>

                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-warning">
                        The backup process will run in the background. You'll be notified when it completes.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateBackup}
                        className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary"
                      >
                        Start Backup
                      </button>
                      <button
                        onClick={() => setShowBackupModal(false)}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Restore Confirmation Modal */}
        <AnimatePresence>
          {showRestoreModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowRestoreModal(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-warning/15 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Restore Database</h2>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    Are you sure you want to restore this backup? This will overwrite your current database. 
                    This action cannot be undone.
                  </p>

                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-4">
                    <p className="text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Warning:</strong> The database will be unavailable during the restore process.
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRestoreBackup(showRestoreModal)}
                      className="flex-1 bg-warning text-white px-4 py-2 rounded-lg hover:bg-warning"
                    >
                      Confirm Restore
                    </button>
                    <button
                      onClick={() => setShowRestoreModal(null)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}