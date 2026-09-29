import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Layers,
  KeyRound,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

export const MySqlConnectionPanel: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [initLoading, setInitLoading] = useState<boolean>(false);
  const [initResult, setInitResult] = useState<any>(null);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form state
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('pawfund_db');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getMySqlStatus();
      setStatus(res);
      if (res.config) {
        setHost(res.config.host || 'localhost');
        setPort(res.config.port || 3306);
        setUser(res.config.user || 'root');
        setDatabase(res.config.database || 'pawfund_db');
      }
    } catch (err: any) {
      console.error('Failed to fetch MySQL status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testMySqlConnection({
        host,
        port: Number(port),
        user,
        password,
        database,
      });
      setTestResult(res);
      await fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Không thể kết nối đến máy chủ MySQL',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInitSchema = async () => {
    setInitLoading(true);
    setInitResult(null);
    try {
      const res = await api.initMySqlSchema();
      setInitResult(res);
      await fetchStatus();
    } catch (err: any) {
      setInitResult({
        success: false,
        message: err.message || 'Lỗi khi khởi tạo schema MySQL',
      });
    } finally {
      setInitLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await api.seedMySqlData();
      setSeedResult(res);
      await fetchStatus();
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: err.message || 'Lỗi nạp dữ liệu mẫu vào MySQL',
      });
    } finally {
      setSeedLoading(false);
    }
  };

  const handleDownloadSchema = async () => {
    try {
      const sqlContent = await api.getMySqlSchemaSql();
      const blob = new Blob([sqlContent], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pawfund_schema.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể tải file schema.sql');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const dockerCommand = `docker run -d --name mysql-pawfund \\
  -p 3306:3306 \\
  -e MYSQL_ROOT_PASSWORD=rootpassword \\
  -e MYSQL_DATABASE=pawfund_db \\
  mysql:8.0`;

  const envConfigText = `# Cấu hình kết nối MySQL trong file .env
MYSQL_HOST="${host}"
MYSQL_PORT="${port}"
MYSQL_USER="${user}"
MYSQL_PASSWORD="${password ? '********' : ''}"
MYSQL_DATABASE="${database}"
# Hoặc URI:
# MYSQL_URL="mysql://${user}:${password ? '********' : ''}@${host}:${port}/${database}"`;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Mô-đun Kết Nối MySQL Riêng Biệt
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  src/db/mysql.ts
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                PawFund đã tách riêng toàn bộ logic kết nối CSDL sang file riêng biệt <code>src/db/mysql.ts</code>, sử dụng Driver chuẩn <code>mysql2/promise</code> với Connection Pooling và hỗ trợ biến môi trường <code>.env</code>.
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-3 shrink-0">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang kiểm tra...
              </div>
            ) : status?.isConnected ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-bold shadow-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Đã Kết Nối MySQL (Live)
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-bold shadow-sm">
                <span className="inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                Chưa Kết Nối MySQL (Chế độ In-Memory an toàn)
              </div>
            )}

            <button
              onClick={fetchStatus}
              title="Làm mới trạng thái"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Máy chủ (Host)</span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
              {status?.config?.host || 'localhost'}:{status?.config?.port || 3306}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono text-sky-600 dark:text-sky-400">
              {status?.config?.database || 'pawfund_db'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phiên bản MySQL</span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
              {status?.serverVersion || 'MySQL 8.0+'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Độ trễ Ping (Latency)</span>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : 'Chưa đo'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Connection Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Thông Số Kết Nối MySQL
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Tự động lưu vào cấu hình server
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Host / IP Server
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost hoặc 127.0.0.1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Cổng (Port)
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="3306"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tài Khoản (User)
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="root"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mật Khẩu (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu MySQL (nếu có)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5"
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tên Database
                </label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="pawfund_db"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-sm shadow-md shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Kiểm Tra Kết Nối MySQL
                  </>
                )}
              </button>

              <button
                onClick={handleInitSchema}
                disabled={initLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {initLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang tạo bảng...
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" /> Khởi Tạo Bảng DDL
                  </>
                )}
              </button>

              <button
                onClick={handleSeedData}
                disabled={seedLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {seedLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang nạp mẫu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Nạp Dữ Liệu Mẫu
                  </>
                )}
              </button>
            </div>

            {/* Test Result Alert */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.serverVersion && (
                    <p className="text-xs opacity-80 mt-1">
                      Server: {testResult.serverVersion} • Độ trễ: {testResult.latencyMs}ms • Số bảng: {testResult.tablesCount}
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-xs font-mono mt-1 opacity-90 break-all">
                      Chi tiết: {testResult.error}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Init Result Alert */}
            {initResult && (
              <div
                className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${
                  initResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {initResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{initResult.message}</p>
                  {initResult.tablesCreated && (
                    <p className="text-xs font-mono mt-1 opacity-90">
                      Các bảng: {initResult.tablesCreated.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Seed Result Alert */}
            {seedResult && (
              <div
                className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${
                  seedResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {seedResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{seedResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Schema file & Setup Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* File Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">
                  File Cấu Hình & Schema
                </h4>
              </div>
              <button
                onClick={handleDownloadSchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Tải schema.sql
              </button>
            </div>

            <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold">•</span>
                <span><strong>src/db/mysql.ts</strong>: Module kết nối MySQL độc lập, chứa Connection Pool, CRUD operations và tự động đồng bộ.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold">•</span>
                <span><strong>src/db/schema.sql</strong>: File DDL thuần chuẩn MySQL 8.0, định nghĩa toàn bộ 8 bảng 3NF, Khóa chính, Khóa ngoại, Chỉ mục và View.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold">•</span>
                <span><strong>.env.example</strong>: Đã cập nhật đầy đủ các biến môi trường <code>MYSQL_HOST</code>, <code>MYSQL_PORT</code>, <code>MYSQL_USER</code>, v.v.</span>
              </li>
            </ul>
          </div>

          {/* Quick Docker Command */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                <Terminal className="w-4 h-4" /> Lệnh Docker Chạy MySQL Nhanh
              </div>
              <button
                onClick={() => copyToClipboard(dockerCommand, 'docker')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {copiedCmd === 'docker' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Sao chép
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-slate-950 p-3.5 rounded-xl overflow-x-auto text-slate-300 leading-relaxed">
              {dockerCommand}
            </pre>
            <p className="text-xs text-slate-400">
              Chạy lệnh này trong Terminal nếu máy bạn có Docker để có ngay máy chủ MySQL với database <code>pawfund_db</code> sẵn sàng.
            </p>
          </div>

          {/* Environment Variables Snippet */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <KeyRound className="w-4 h-4" /> Biến Môi Trường (.env)
              </div>
              <button
                onClick={() => copyToClipboard(envConfigText, 'env')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {copiedCmd === 'env' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Sao chép
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-slate-950 p-3.5 rounded-xl overflow-x-auto text-amber-200/90 leading-relaxed">
              {envConfigText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySqlConnectionPanel;
