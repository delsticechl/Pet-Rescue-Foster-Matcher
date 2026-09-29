import React, { useState } from 'react';
import {
  Code2,
  Play,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Layers,
  Search,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Terminal,
  FileJson,
  BookOpen,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { openApiSpec } from '../data/openApiSpec';

interface ApiEndpointDef {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tag: string;
  defaultPathParams?: Record<string, string>;
  defaultQueryParams?: Record<string, string>;
  defaultBody?: any;
}

const ENDPOINTS: ApiEndpointDef[] = [
  // Service Root
  {
    id: 'get-hateoas-root',
    method: 'GET',
    path: '/api/v1',
    summary: 'Root Service Discovery (HATEOAS Index)',
    description: 'Level 3 Richardson Maturity discovery linking to all collection resources.',
    tag: 'Service Root',
  },
  {
    id: 'get-health',
    method: 'GET',
    path: '/api/v1/health',
    summary: 'Health Check Probe',
    description: 'Service uptime, server timestamp, and 3NF database entity counts.',
    tag: 'Service Root',
  },
  {
    id: 'get-openapi-spec',
    method: 'GET',
    path: '/api/v1/openapi.json',
    summary: 'OpenAPI 3.0.0 Specification',
    description: 'Returns machine-readable JSON schema defining all endpoints, parameters, and models.',
    tag: 'Service Root',
  },

  // Pets
  {
    id: 'get-pets-list',
    method: 'GET',
    path: '/api/v1/pets',
    summary: 'List & Filter Pets (Paginated)',
    description: 'Retrieve pet profiles with multi-criteria filtering and pagination headers (X-Total-Count).',
    tag: 'Pets',
    defaultQueryParams: { species: 'Dog', status: 'Ready', limit: '10' },
  },
  {
    id: 'get-pet-by-id',
    method: 'GET',
    path: '/api/v1/pets/{id}',
    summary: 'Get Pet Profile by ID',
    description: 'Retrieve full pet details with populated shelter, images, and medical history.',
    tag: 'Pets',
    defaultPathParams: { id: 'PET-001' },
  },
  {
    id: 'create-pet',
    method: 'POST',
    path: '/api/v1/pets',
    summary: 'Create New Pet Profile',
    description: 'Insert new rescued animal profile into PETS table. Returns 201 Created with Location header.',
    tag: 'Pets',
    defaultBody: {
      name: 'Bella',
      species: 'Dog',
      breed: 'Labrador Retriever',
      ageMonths: 10,
      gender: 'Cái',
      healthStatus: 'Healthy',
      vaccinated: true,
      sterilized: true,
      adoptionStatus: 'Ready',
      energyLevel: 'Medium',
      goodWithKids: true,
      goodWithPets: true,
      requiresYard: true,
      description: 'Gentle, friendly, and eager to join a caring family.',
      shelterId: 'SHELTER-001',
    },
  },
  {
    id: 'patch-pet',
    method: 'PATCH',
    path: '/api/v1/pets/{id}',
    summary: 'Partial Update Pet Profile',
    description: 'Modifies specific attributes of a pet without replacing the whole entity.',
    tag: 'Pets',
    defaultPathParams: { id: 'PET-001' },
    defaultBody: {
      healthStatus: 'Healthy & Fully Vaccinated',
      energyLevel: 'High',
    },
  },
  {
    id: 'delete-pet',
    method: 'DELETE',
    path: '/api/v1/pets/{id}',
    summary: 'Delete Pet Record',
    description: 'Remove pet profile and associated media records from database.',
    tag: 'Pets',
    defaultPathParams: { id: 'PET-001' },
  },
  {
    id: 'get-pet-medical',
    method: 'GET',
    path: '/api/v1/pets/{id}/medical-records',
    summary: 'Get Pet Medical & Clinical History',
    description: 'Sub-resource query returning clinical examination timeline and booster shots.',
    tag: 'Pets',
    defaultPathParams: { id: 'PET-001' },
  },
  {
    id: 'post-pet-medical',
    method: 'POST',
    path: '/api/v1/pets/{id}/medical-records',
    summary: 'Append Clinical Record to Pet',
    description: 'Records a new veterinary examination, surgery, or vaccination with next follow-up date.',
    tag: 'Pets',
    defaultPathParams: { id: 'PET-001' },
    defaultBody: {
      diagnosis: 'Annual core booster vaccination & wellness check',
      treatment: 'DHPP booster + broad-spectrum dewormer',
      vetName: 'Dr. PawFund Veterinarian',
      nextFollowUp: '2026-10-15',
      medications: 'Drontal Plus',
    },
  },

  // Shelters
  {
    id: 'get-shelters',
    method: 'GET',
    path: '/api/v1/shelters',
    summary: 'List Rescue Shelters',
    description: 'Returns all shelters with live animal counts and capacity metrics.',
    tag: 'Shelters',
  },
  {
    id: 'get-shelter-by-id',
    method: 'GET',
    path: '/api/v1/shelters/{id}',
    summary: 'Get Shelter by ID',
    description: 'Retrieve shelter facility profile, capacity, and manager info.',
    tag: 'Shelters',
    defaultPathParams: { id: 'SHELTER-001' },
  },
  {
    id: 'get-shelter-pets',
    method: 'GET',
    path: '/api/v1/shelters/{id}/pets',
    summary: 'List Pets at Shelter (Sub-resource)',
    description: 'Returns all animals currently sheltered at this facility.',
    tag: 'Shelters',
    defaultPathParams: { id: 'SHELTER-001' },
  },

  // Applications
  {
    id: 'get-applications',
    method: 'GET',
    path: '/api/v1/applications',
    summary: 'List Adoption Applications',
    description: 'Filter adoption applications by status, applicant user ID, or rescue shelter.',
    tag: 'Applications',
    defaultQueryParams: { status: 'Submitted' },
  },
  {
    id: 'post-application',
    method: 'POST',
    path: '/api/v1/applications',
    summary: 'Submit Adoption Application',
    description: 'Submits adoption application with SQL trigger validation (trg_CheckPetNotAdoptedBeforeApply).',
    tag: 'Applications',
    defaultBody: {
      petId: 'PET-001',
      userId: 'USR-002',
      type: 'Adopt',
      housingType: 'Single Family House',
      hasYard: true,
      experienceDescription: 'Experienced pet owner with large fenced yard.',
      incomeMonthly: '$4,000 - $6,000',
      otherPets: 'None',
    },
  },
  {
    id: 'patch-application-status',
    method: 'PATCH',
    path: '/api/v1/applications/{id}',
    summary: 'Update Status & ACID Approval Transaction',
    description: 'Updates status. When set to Approved, triggers ACID transactional lock and email dispatch.',
    tag: 'Applications',
    defaultPathParams: { id: 'APP-001' },
    defaultBody: {
      status: 'Interviewing',
      interviewTime: '2026-08-25T14:30',
      staffNotes: 'Applicant meets housing requirements for this high-energy dog.',
    },
  },

  // Clinical & Health Reminders
  {
    id: 'get-health-reminders',
    method: 'GET',
    path: '/api/v1/health-reminders',
    summary: 'Audited Vaccine & Health Reminders',
    description: 'Computes urgency windows (Overdue, Today, Urgent in 7 days, Upcoming in 30 days) from PET_MEDICAL_RECORDS.',
    tag: 'Clinical & Health Reminders',
    defaultQueryParams: { urgency: 'Overdue' },
  },
  {
    id: 'post-health-reminder-complete',
    method: 'POST',
    path: '/api/v1/health-reminders/complete',
    summary: 'Mark Scheduled Checkup Complete',
    description: 'Updates reminderStatus to Completed and optionally schedules next booster date.',
    tag: 'Clinical & Health Reminders',
    defaultBody: {
      petId: 'PET-001',
      recordId: 'MED-001',
      nextFollowUp: '2026-11-20',
      newDiagnosis: 'Annual vaccination completed on schedule',
      newTreatment: 'Rabies vaccine booster administered',
      vetName: 'Dr. PawFund Veterinarian',
    },
  },

  // Care Logs
  {
    id: 'get-care-logs',
    method: 'GET',
    path: '/api/v1/care-logs',
    summary: 'List Post-Adoption Care Logs',
    description: 'Returns adopter wellness check-ins, recovery notes, and weight tracking.',
    tag: 'Care Logs',
    defaultQueryParams: { petId: 'PET-003' },
  },
  {
    id: 'post-care-log',
    method: 'POST',
    path: '/api/v1/care-logs',
    summary: 'Publish Care Log Entry',
    description: 'Adopter submits wellness update with mood, weight, and photo.',
    tag: 'Care Logs',
    defaultBody: {
      petId: 'PET-003',
      userId: 'USR-003',
      note: 'Settled into new home wonderfully! Eating healthy and playful.',
      healthUpdate: 'Coat is shiny, eyes clear, very active.',
      weightKg: 4.8,
      mood: 'Happy & Playful',
    },
  },

  // Donations
  {
    id: 'get-donations',
    method: 'GET',
    path: '/api/v1/donations',
    summary: 'List Transparent Donations',
    description: 'Returns donor contributions and transparent shelter funding allocations.',
    tag: 'Donations',
  },
  {
    id: 'post-donation',
    method: 'POST',
    path: '/api/v1/donations',
    summary: 'Record Donation',
    description: 'Submits a financial donation for medical care and shelter food supplies.',
    tag: 'Donations',
    defaultBody: {
      shelterId: 'SHELTER-001',
      amount: 50,
      paymentMethod: 'CreditCard',
      donorName: 'Anonymous Supporter',
      message: 'Keep up the inspiring rescue work!',
    },
  },

  // Media Uploads
  {
    id: 'post-upload',
    method: 'POST',
    path: '/api/v1/uploads',
    summary: 'Upload Device Photo with Metadata',
    description: 'Stores local computer photo (Base64 LONGTEXT) with original fileName, fileSize, and mimeType.',
    tag: 'Media Uploads',
    defaultBody: {
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      fileName: 'puppy_hero.png',
      fileSize: 1024,
      mimeType: 'image/png',
    },
  },

  // Stored Procedure & Views
  {
    id: 'post-stored-proc-match',
    method: 'POST',
    path: '/api/v1/sql/stored-procedure/match-pets',
    summary: 'Execute sp_MatchPetsForAdopter Stored Procedure',
    description: 'Invokes MySQL Stored Procedure calculating compatibility score (15%-99%) for lifestyle criteria.',
    tag: 'SQL & Stored Procedures',
    defaultBody: {
      housingType: 'Single Family House',
      hasYard: true,
      hasChildren: true,
      hasOtherPets: true,
      species: 'Dog',
      activityPreference: 'High',
    },
  },
  {
    id: 'get-sql-view-shelter-stats',
    method: 'GET',
    path: '/api/v1/sql/views/shelter-stats',
    summary: 'Query vw_ShelterStatistics SQL View',
    description: 'Executes relational view aggregating intake, adoptions, capacities, and donation revenues.',
    tag: 'SQL & Stored Procedures',
  },
];

export const RestApiExplorer: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointDef>(ENDPOINTS[3]); // Default: GET /api/v1/pets
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Request Runner State
  const [pathParams, setPathParams] = useState<Record<string, string>>(selectedEndpoint.defaultPathParams || {});
  const [queryParams, setQueryParams] = useState<Record<string, string>>(selectedEndpoint.defaultQueryParams || {});
  const [requestBodyText, setRequestBodyText] = useState<string>(
    selectedEndpoint.defaultBody ? JSON.stringify(selectedEndpoint.defaultBody, null, 2) : ''
  );

  // Execution result
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [responseResult, setResponseResult] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    data: any;
    url: string;
  } | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // Synchronize inputs when selecting a new endpoint
  const handleSelectEndpoint = (ep: ApiEndpointDef) => {
    setSelectedEndpoint(ep);
    setPathParams(ep.defaultPathParams || {});
    setQueryParams(ep.defaultQueryParams || {});
    setRequestBodyText(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '');
    setResponseResult(null);
  };

  // Build final URL from path & params
  const buildResolvedUrl = () => {
    let resolved = selectedEndpoint.path;
    Object.entries(pathParams).forEach(([k, v]) => {
      resolved = resolved.replace(`{${k}}`, encodeURIComponent(String(v ?? '')));
    });

    const q = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      const valStr = String(v ?? '').trim();
      if (valStr) q.append(k, valStr);
    });

    const queryString = q.toString();
    return queryString ? `${resolved}?${queryString}` : resolved;
  };

  // Generate curl command
  const resolvedUrl = buildResolvedUrl();
  const curlCommand = (() => {
    let cmd = `curl -X ${selectedEndpoint.method} "${window.location.origin}${resolvedUrl}" \\\n  -H "Accept: application/json"`;
    if (selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE' && requestBodyText.trim()) {
      cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBodyText.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
    }
    return cmd;
  })();

  const handleExecuteRequest = async () => {
    setIsExecuting(true);
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-User-Role': 'Admin',
        },
      };

      if (selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE' && requestBodyText.trim()) {
        options.body = requestBodyText;
      }

      const res = await fetch(resolvedUrl, options);
      const end = performance.now();

      const headerObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headerObj[key] = val;
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch (e) {
        json = { message: await res.text() };
      }

      setResponseResult({
        status: res.status,
        statusText: res.statusText,
        durationMs: Math.round(end - start),
        headers: headerObj,
        data: json,
        url: resolvedUrl,
      });
    } catch (err: any) {
      const end = performance.now();
      setResponseResult({
        status: 0,
        statusText: 'Network Error',
        durationMs: Math.round(end - start),
        headers: {},
        data: { error: err.message || 'Failed to fetch' },
        url: resolvedUrl,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    if (!responseResult) return;
    navigator.clipboard.writeText(JSON.stringify(responseResult.data, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleDownloadOpenApi = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(openApiSpec, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'pawfund-openapi-v1.json');
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const tags = ['All', ...Array.from(new Set(ENDPOINTS.map((e) => e.tag)))];

  const filteredEndpoints = ENDPOINTS.filter((ep) => {
    if (selectedTag !== 'All' && ep.tag !== selectedTag) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPath = ep.path.toLowerCase().includes(q);
      const matchSummary = ep.summary.toLowerCase().includes(q);
      const matchDesc = ep.description.toLowerCase().includes(q);
      return matchPath || matchSummary || matchDesc;
    }
    return true;
  });

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'POST':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* RESTful Architecture Principles Overview Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-sky-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              <Code2 className="w-3.5 h-3.5 text-sky-400" /> Standard RESTful Architecture & Level 3 Richardson Maturity
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              OpenAPI 3.0 REST API Explorer & Live Tester
            </h2>
            <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed">
              Fully compliant with standard REST conventions: resource-oriented plural URIs (<code className="text-amber-300 font-mono">/api/v1/pets</code>),
              standard HTTP verbs (<code className="text-sky-300 font-mono">GET, POST, PUT, PATCH, DELETE</code>),
              idempotency, standard status codes (<code className="text-emerald-300 font-mono">200, 201, 204, 400, 404</code>), pagination headers, and HATEOAS index.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadOpenApi}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-2 transition-colors shadow-md"
            >
              <FileJson className="w-4 h-4 text-amber-300" />
              <span>Download openapi.json</span>
            </button>
            <a
              href="/api/v1"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all hover:scale-105"
            >
              <span>View /api/v1 Raw</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* REST Standards Quick Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10 text-xs">
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-sky-300">Level 1: Resources</div>
            <div className="text-slate-200 font-mono text-[11px]">/api/v1/pets, /shelters</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-emerald-300">Level 2: HTTP Verbs</div>
            <div className="text-slate-200 font-mono text-[11px]">GET, POST, PUT, PATCH, DEL</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-purple-300">Level 3: HATEOAS</div>
            <div className="text-slate-200 font-mono text-[11px]">_links collection index</div>
          </div>
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-amber-300">ACID Transactions</div>
            <div className="text-slate-200 font-mono text-[11px]">Repeatable Read Isolation</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Endpoints Directory */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-500" /> Endpoints Directory ({filteredEndpoints.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">OpenAPI 3.0</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by path or summary (e.g. /pets, medical)..."
                className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Tag Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t)}
                  className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition-all ${
                    selectedTag === t
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* List of Endpoints */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredEndpoints.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border ${getMethodBadge(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">
                      {ep.path}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {ep.tag}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 truncate">
                    {ep.summary}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                    {ep.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Request Tester & Live Response */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-5">
          {/* Header of Selected Endpoint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-extrabold border ${getMethodBadge(
                    selectedEndpoint.method
                  )}`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-slate-800 dark:text-white">
                  {selectedEndpoint.path}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedEndpoint.description}
              </p>
            </div>

            <button
              id="btn-execute-rest-request"
              onClick={handleExecuteRequest}
              disabled={isExecuting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all hover:scale-105 disabled:opacity-50 shrink-0"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>

          {/* Path Parameters Section (if any) */}
          {selectedEndpoint.defaultPathParams && Object.keys(selectedEndpoint.defaultPathParams).length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-500" /> Path Parameters
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.keys(selectedEndpoint.defaultPathParams).map((pKey) => (
                  <div key={pKey} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-semibold w-16">
                      {`{${pKey}}`}:
                    </span>
                    <input
                      type="text"
                      value={pathParams[pKey] || ''}
                      onChange={(e) => setPathParams({ ...pathParams, [pKey]: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters Section (if any) */}
          {selectedEndpoint.defaultQueryParams && Object.keys(selectedEndpoint.defaultQueryParams).length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-teal-500" /> Query Parameters
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.keys(selectedEndpoint.defaultQueryParams).map((qKey) => (
                  <div key={qKey} className="space-y-1">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{qKey}</span>
                    <input
                      type="text"
                      value={queryParams[qKey] || ''}
                      onChange={(e) => setQueryParams({ ...queryParams, [qKey]: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body Editor (for POST / PUT / PATCH) */}
          {selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-amber-500" /> Request Payload (JSON Body)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">application/json</span>
              </div>
              <textarea
                rows={5}
                value={requestBodyText}
                onChange={(e) => setRequestBodyText(e.target.value)}
                className="w-full p-3 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}

          {/* cURL Command Preview & Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Generated cURL Command
              </span>
              <button
                onClick={handleCopyCurl}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy cURL
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono rounded-2xl bg-slate-900 text-slate-300 overflow-x-auto border border-slate-800 select-all">
              {curlCommand}
            </pre>
          </div>

          {/* Response Inspector */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Live Response
                </span>
                {responseResult && (
                  <>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold ${
                        responseResult.status >= 200 && responseResult.status < 300
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {responseResult.status} {responseResult.statusText}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {responseResult.durationMs}ms
                    </span>
                  </>
                )}
              </div>

              {responseResult && (
                <button
                  onClick={handleCopyResponse}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  {copiedResponse ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedResponse ? 'Copied' : 'Copy Response'}</span>
                </button>
              )}
            </div>

            {responseResult ? (
              <div className="space-y-2">
                {/* Headers Pill Bar */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                  {responseResult.headers['content-type'] && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700">
                      Content-Type: {responseResult.headers['content-type']}
                    </span>
                  )}
                  {responseResult.headers['x-total-count'] && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-sky-600 dark:text-sky-400">
                      X-Total-Count: {responseResult.headers['x-total-count']}
                    </span>
                  )}
                  {responseResult.headers['location'] && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700">
                      Location: {responseResult.headers['location']}
                    </span>
                  )}
                  {responseResult.headers['x-api-version'] && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700">
                      Version: {responseResult.headers['x-api-version']}
                    </span>
                  )}
                </div>

                {/* Formatted JSON Body */}
                <pre className="p-4 text-xs font-mono rounded-2xl bg-slate-900 text-emerald-400 overflow-x-auto max-h-96 border border-slate-800 select-all leading-relaxed">
                  {JSON.stringify(responseResult.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-400 space-y-1">
                <Play className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                <div className="font-semibold">Ready to test endpoint</div>
                <p className="text-[11px]">Click "Send Request" above to dispatch a real HTTP call to the server.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
