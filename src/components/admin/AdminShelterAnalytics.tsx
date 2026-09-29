import React from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Building2,
  CheckCircle2,
  Users,
  Layers,
  HeartHandshake
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Pet, AdoptionApplication, Shelter } from '../../types';
import { exportPetAndApplicationStatsCsv } from '../../utils/csvExporter';

interface AdminShelterAnalyticsProps {
  pets: Pet[];
  applications: AdoptionApplication[];
  shelters: Shelter[];
  onOpenCsvExport?: () => void;
}

export const AdminShelterAnalytics: React.FC<AdminShelterAnalyticsProps> = ({
  pets,
  applications,
  shelters,
  onOpenCsvExport,
}) => {
  const speciesData = [
    {
      name: 'Dogs',
      value: pets.filter((p) => p.species === 'Dog' || p.species === 'Chó').length,
      color: '#0ea5e9',
    },
    {
      name: 'Cats',
      value: pets.filter((p) => p.species === 'Cat' || p.species === 'Mèo').length,
      color: '#8b5cf6',
    },
    {
      name: 'Other',
      value: pets.filter(
        (p) =>
          p.species !== 'Dog' &&
          p.species !== 'Chó' &&
          p.species !== 'Cat' &&
          p.species !== 'Mèo'
      ).length,
      color: '#10b981',
    },
  ];

  const monthlyRescueStats = [
    { month: 'Oct', rescued: 12, adopted: 8 },
    { month: 'Nov', rescued: 18, adopted: 14 },
    { month: 'Dec', rescued: 22, adopted: 19 },
    { month: 'Jan', rescued: 25, adopted: 20 },
    { month: 'Feb', rescued: 31, adopted: 26 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* CSV Export Quick Action Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-500/30">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-emerald-100 border border-white/20">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Comprehensive Data Reporting
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">
            Export Pets & Adoption Application Analytics (CSV)
          </h3>
          <p className="text-xs text-emerald-100/80 max-w-xl">
            Download spreadsheet reports with international UTF-8 BOM encoding, fully compatible with Microsoft Excel, Google Sheets, and LibreOffice for leadership reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-analytics-quick-download-csv"
            onClick={() => exportPetAndApplicationStatsCsv(pets, applications, shelters)}
            className="px-4 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs flex items-center gap-2 shadow-md transition-transform hover:scale-105"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Quick CSV Download</span>
          </button>

          {onOpenCsvExport && (
            <button
              id="btn-analytics-custom-export-csv"
              onClick={onOpenCsvExport}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500/40 hover:bg-emerald-500/60 border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Customize Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" /> Rescue Intake vs. Adoption Rate Over Time
            </h3>
            <span className="text-xs text-slate-400">Aggregated shelter data</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRescueStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="rescued" name="Rescue Intake" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="adopted" name="Adopted to Families" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Species Distribution (PETS Table)
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={speciesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {speciesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 text-center">
            Normalized 3NF relational data model
          </div>
        </div>
      </div>

      {/* Shelter Summary Breakdown */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-500" /> Shelter Capacity & Application Statistics
          </h3>
          <span className="text-xs text-slate-400">{shelters.length} partner shelters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shelters.map((shelter) => {
            const shelterPets = pets.filter((p) => p.shelterId === shelter.shelterId);
            const shelterApps = applications.filter((a) => {
              const pet = pets.find((p) => p.petId === a.petId);
              return pet?.shelterId === shelter.shelterId;
            });
            const occupancy = shelter.capacity > 0 ? Math.round((shelterPets.length / shelter.capacity) * 100) : 0;

            return (
              <div
                key={shelter.shelterId}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">
                      {shelter.shelterName}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">
                      {shelter.address}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                    {occupancy}% capacity
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Active Pets</div>
                    <div className="font-extrabold text-slate-800 dark:text-white">{shelterPets.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Capacity</div>
                    <div className="font-extrabold text-slate-800 dark:text-white">{shelter.capacity}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Applications</div>
                    <div className="font-extrabold text-indigo-600 dark:text-indigo-400">{shelterApps.length}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
