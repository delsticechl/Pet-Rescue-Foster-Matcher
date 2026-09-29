import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  Filter,
  Search,
  Layers,
  FileText,
  Building2,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  Info,
  Check
} from 'lucide-react';
import { Pet, AdoptionApplication, Shelter } from '../../types';
import {
  exportPetAndApplicationStatsCsv,
  exportApplicationsDetailCsv,
} from '../../utils/csvExporter';

interface AdminCsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pets: Pet[];
  applications: AdoptionApplication[];
  shelters: Shelter[];
  showToast?: (title: string, description: string) => void;
}

export const AdminCsvExportModal: React.FC<AdminCsvExportModalProps> = ({
  isOpen,
  onClose,
  pets,
  applications,
  shelters,
  showToast,
}) => {
  const [exportType, setExportType] = useState<'pets_summary' | 'applications_detail'>('pets_summary');
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterShelter, setFilterShelter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Filtered Pets dataset for preview and customized export
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      if (filterSpecies !== 'all') {
        const sp = pet.species.toLowerCase();
        const sel = filterSpecies.toLowerCase();
        if (sel === 'dog' && sp !== 'dog' && sp !== 'chó') return false;
        if (sel === 'cat' && sp !== 'cat' && sp !== 'mèo') return false;
        if (sel === 'other' && sp !== 'other' && sp !== 'khác') return false;
      }
      if (filterStatus !== 'all' && pet.adoptionStatus !== filterStatus) return false;
      if (filterShelter !== 'all' && pet.shelterId !== filterShelter) return false;
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchName = pet.name.toLowerCase().includes(query);
        const matchId = pet.petId.toLowerCase().includes(query);
        const matchBreed = pet.breed.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchBreed) return false;
      }
      return true;
    });
  }, [pets, filterSpecies, filterStatus, filterShelter, searchKeyword]);

  // Filtered Applications dataset
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (filterShelter !== 'all') {
        const pet = pets.find((p) => p.petId === app.petId);
        if (pet && pet.shelterId !== filterShelter) return false;
      }
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchName = app.applicantName?.toLowerCase().includes(query);
        const matchPet = app.petName?.toLowerCase().includes(query);
        const matchAppId = app.applicationId.toLowerCase().includes(query);
        if (!matchName && !matchPet && !matchAppId) return false;
      }
      return true;
    });
  }, [applications, pets, filterStatus, filterShelter, searchKeyword]);

  // Overall Statistics Metrics
  const stats = useMemo(() => {
    const totalPets = pets.length;
    const readyPets = pets.filter((p) => p.adoptionStatus === 'Ready').length;
    const adoptedPets = pets.filter((p) => p.adoptionStatus === 'Adopted').length;
    const fosteredPets = pets.filter((p) => p.adoptionStatus === 'Fostered').length;

    const totalApps = applications.length;
    const approvedApps = applications.filter((a) => a.status === 'Approved').length;
    const pendingApps = applications.filter((a) => a.status === 'Submitted').length;
    const interviewingApps = applications.filter((a) => a.status === 'Interviewing').length;
    const rejectedApps = applications.filter((a) => a.status === 'Rejected').length;

    const approvalRate = totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : 0;

    return {
      totalPets,
      readyPets,
      adoptedPets,
      fosteredPets,
      totalApps,
      approvedApps,
      pendingApps,
      interviewingApps,
      rejectedApps,
      approvalRate,
    };
  }, [pets, applications]);

  if (!isOpen) return null;

  const handleExportPetsSummary = (useFiltered: boolean = false) => {
    const targetPets = useFiltered ? filteredPets : pets;
    const targetApps = useFiltered ? applications.filter((a) => targetPets.some((p) => p.petId === a.petId)) : applications;

    const result = exportPetAndApplicationStatsCsv(targetPets, targetApps, shelters);
    if (showToast) {
      showToast(
        'CSV Export Downloaded Successfully!',
        `Exported ${result.rowCount} pet profiles and application stats to ${result.fileName}`
      );
    }
  };

  const handleExportApplicationsDetail = (useFiltered: boolean = false) => {
    const targetApps = useFiltered ? filteredApplications : applications;
    const result = exportApplicationsDetailCsv(targetApps, pets);
    if (showToast) {
      showToast(
        'Applications CSV Downloaded!',
        `Exported ${result.rowCount} adoption application records to ${result.fileName}`
      );
    }
  };

  return (
    <div
      id="admin-csv-export-modal-overlay"
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        id="admin-csv-export-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-sky-950/40 dark:to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Export Data Reports (CSV)
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Excel UTF-8 Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download comprehensive pet profile summaries and metrics across all adoption applications
              </p>
            </div>
          </div>
          <button
            id="close-csv-export-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-500" /> Total Pets
              </div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {stats.totalPets}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({stats.readyPets} ready)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" /> Total Applications
              </div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {stats.totalApps}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({stats.pendingApps} pending)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approved Applications
              </div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.approvedApps}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({stats.approvalRate}%)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-500" /> Rescue Shelters
              </div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                {shelters.length}{' '}
                <span className="text-xs font-normal text-slate-400">shelters</span>
              </div>
            </div>
          </div>

          {/* Export Report Mode Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select CSV Report Structure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Pet Summary & Application Stats */}
              <div
                onClick={() => setExportType('pets_summary')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  exportType === 'pets_summary'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                    exportType === 'pets_summary'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Pet Master Summary & Application Statistics
                    </h4>
                    {exportType === 'pets_summary' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Includes all pet attributes, shelter affiliations, total applications count, pending/interviewing/approved breakdowns, adopter details, and success rates.
                  </p>
                </div>
              </div>

              {/* Option 2: Applications Details */}
              <div
                onClick={() => setExportType('applications_detail')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  exportType === 'applications_detail'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                    exportType === 'applications_detail'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      All Adoption Application Submissions
                    </h4>
                    {exportType === 'applications_detail' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Export granular applicant records, housing conditions, yard status, monthly income, pet experience remarks, and scheduled interview dates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-500" /> Filter Options Before Exporting
              </span>
              <button
                onClick={() => {
                  setFilterSpecies('all');
                  setFilterStatus('all');
                  setFilterShelter('all');
                  setSearchKeyword('');
                }}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name/ID..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Species Filter */}
              {exportType === 'pets_summary' && (
                <select
                  value={filterSpecies}
                  onChange={(e) => setFilterSpecies(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Species (Dogs & Cats)</option>
                  <option value="Dog">Dogs</option>
                  <option value="Cat">Cats</option>
                  <option value="Other">Other</option>
                </select>
              )}

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {exportType === 'pets_summary' ? (
                  <>
                    <option value="all">All Pet Statuses</option>
                    <option value="Ready">Ready for Adoption (Ready)</option>
                    <option value="Adopted">Adopted (Adopted)</option>
                    <option value="Fostered">In Foster Care (Fostered)</option>
                    <option value="Pending">Pending Evaluation (Pending)</option>
                  </>
                ) : (
                  <>
                    <option value="all">All Application Statuses</option>
                    <option value="Submitted">Submitted (Pending Review)</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
              </select>

              {/* Shelter Filter */}
              <select
                value={filterShelter}
                onChange={(e) => setFilterShelter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Rescue Shelters</option>
                {shelters.map((s) => (
                  <option key={s.shelterId} value={s.shelterId}>
                    {s.shelterName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Data Preview Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-indigo-500" /> Preview Dataset (
                {exportType === 'pets_summary' ? filteredPets.length : filteredApplications.length} records)
              </span>
              <span className="text-[11px] text-slate-400">
                Displaying first 5 rows sample below
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto bg-white dark:bg-slate-800">
              <table className="w-full text-left text-xs">
                {exportType === 'pets_summary' ? (
                  <>
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Pet ID</th>
                        <th className="px-3 py-2 font-semibold">Pet Name</th>
                        <th className="px-3 py-2 font-semibold">Species/Breed</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold text-center">Total Apps</th>
                        <th className="px-3 py-2 font-semibold text-center">Pending</th>
                        <th className="px-3 py-2 font-semibold text-center">Approved</th>
                        <th className="px-3 py-2 font-semibold">Adopted By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {filteredPets.slice(0, 5).map((pet) => {
                        const petApps = applications.filter((a) => a.petId === pet.petId);
                        const approvedApp = petApps.find((a) => a.status === 'Approved');
                        return (
                          <tr key={pet.petId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-mono font-bold text-sky-600 dark:text-sky-400">
                              {pet.petId}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-white">
                              {pet.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {pet.species} • {pet.breed}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  pet.adoptionStatus === 'Ready'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : pet.adoptionStatus === 'Adopted'
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {pet.adoptionStatus}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{petApps.length}</td>
                            <td className="px-3 py-2 text-center text-amber-600 font-semibold">
                              {petApps.filter((a) => a.status === 'Submitted').length}
                            </td>
                            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">
                              {petApps.filter((a) => a.status === 'Approved').length}
                            </td>
                            <td className="px-3 py-2 text-slate-500 truncate max-w-[140px]">
                              {approvedApp?.applicantName || (pet.adoptionStatus === 'Adopted' ? 'Adopted' : '—')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">App ID</th>
                        <th className="px-3 py-2 font-semibold">Applicant</th>
                        <th className="px-3 py-2 font-semibold">Selected Pet</th>
                        <th className="px-3 py-2 font-semibold">Housing</th>
                        <th className="px-3 py-2 font-semibold">Income</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Applied At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {filteredApplications.slice(0, 5).map((app) => (
                        <tr key={app.applicationId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                          <td className="px-3 py-2 font-mono font-bold text-sky-600 dark:text-sky-400">
                            {app.applicationId}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800 dark:text-white">
                            {app.applicantName}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {app.petName} ({app.petId})
                          </td>
                          <td className="px-3 py-2 text-slate-500">{app.housingType}</td>
                          <td className="px-3 py-2 text-slate-500">{app.incomeMonthly}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700">
                              {app.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{app.appliedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>

          {/* UTF-8 Encoding Notice Banner */}
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-2.5 text-xs text-sky-800 dark:text-sky-300">
            <Info className="w-4 h-4 shrink-0 text-sky-500" />
            <span>
              Files are encoded with <strong>international UTF-8 BOM standard</strong>, providing seamless opening in Microsoft Excel, Google Sheets, and LibreOffice without formatting or character issues.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {exportType === 'pets_summary'
              ? `Exporting ${filteredPets.length} pet profiles & adoption application metrics`
              : `Exporting ${filteredApplications.length} adoption application submissions`}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-cancel-csv-modal"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>

            {/* Instant Export All Button */}
            <button
              id="btn-export-all-csv"
              onClick={() => {
                if (exportType === 'pets_summary') {
                  handleExportPetsSummary(false);
                } else {
                  handleExportApplicationsDetail(false);
                }
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export All ({exportType === 'pets_summary' ? pets.length : applications.length})
            </button>

            {/* Export Filtered Button */}
            <button
              id="btn-export-filtered-csv"
              onClick={() => {
                if (exportType === 'pets_summary') {
                  handleExportPetsSummary(true);
                } else {
                  handleExportApplicationsDetail(true);
                }
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" /> Download Filtered CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
