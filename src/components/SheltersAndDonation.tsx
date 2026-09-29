import React, { useState, useEffect } from 'react';
import {
  Building2,
  Heart,
  QrCode,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  CreditCard,
  Sparkles,
  Award,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Shelter, Donation, User } from '../types';
import { api } from '../services/api';

interface SheltersAndDonationProps {
  currentUser: User;
}

export const SheltersAndDonation: React.FC<SheltersAndDonationProps> = ({ currentUser }) => {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelterForDonation, setSelectedShelterForDonation] = useState<Shelter | null>(null);

  // Donation Form State
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>(currentUser?.fullName || 'Kind Supporter');
  const [message, setMessage] = useState<string>('Supporting emergency medical care and nutritious food for the rescued pets!');
  const [paymentMethod, setPaymentMethod] = useState<'VietQR' | 'MoMo' | 'Chuyển khoản' | any>('Online Transfer');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState<Donation | null>(null);

  useEffect(() => {
    if (currentUser?.fullName) {
      setDonorName(currentUser.fullName);
    }
  }, [currentUser?.fullName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shList, donList] = await Promise.all([api.getShelters(), api.getDonations()]);
      setShelters(shList);
      setDonations(donList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePresetAmount = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    if (val && !isNaN(Number(val))) {
      setAmount(Number(val));
    }
  };

  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShelterForDonation || amount <= 0) return;

    setSubmitting(true);
    try {
      const result = await api.createDonation({
        shelterId: selectedShelterForDonation.shelterId,
        userId: isAnonymous ? undefined : currentUser.userId,
        amount,
        paymentMethod: paymentMethod === 'Online Transfer' ? 'VietQR' : paymentMethod,
        donorName: isAnonymous ? 'Anonymous Benefactor' : donorName,
        message,
      });

      setDonationSuccess(result);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Donation submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (num: number) => {
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-teal-700 via-sky-800 to-indigo-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-300" /> Animal Rescue Relief Fund
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Support Network Shelters & Sanctuaries
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
            100% of community contributions are recorded transparently in the DONATIONS table and allocated to emergency veterinary surgeries, vaccines, and daily sustenance.
          </p>
        </div>
      </div>

      {/* Shelters Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-500" /> Affiliated Network Rescue Shelters
          </h2>
          <span className="text-xs text-slate-500">{shelters.length} verified sanctuaries</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shelters.map((sh) => (
            <div
              key={sh.shelterId}
              id={`shelter-card-${sh.shelterId}`}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <img src={sh.imageUrl} alt={sh.shelterName} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> {sh.rating} ★
                  </div>
                  <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-600 text-white shadow-xs">
                    Shelter ID: {sh.shelterId}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    {sh.shelterName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {sh.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{sh.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{sh.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{sh.email}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Shelter Capacity:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {sh.currentPetsCount} / {sh.capacity} animals
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, (sh.currentPetsCount / sh.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  id={`btn-donate-${sh.shelterId}`}
                  onClick={() => {
                    setSelectedShelterForDonation(sh);
                    setDonationSuccess(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-rose-200" /> Donate to Shelter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Donations Feed (DONATIONS Table) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Donor Recognition Feed (DONATIONS Table)
            </h3>
            <p className="text-xs text-slate-400">Live feed of verified community contributions recorded in the relational database</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
            {donations.length} contributions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {donations.slice(0, 6).map((d) => (
            <div
              key={d.donationId}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">{d.donorName}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(d.amount)}
                </span>
              </div>
              <p className="text-slate-500 italic line-clamp-1">"{d.message}"</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span>{d.shelterName}</span>
                <span>{d.paymentMethod} • {d.donatedAt.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donation Modal */}
      {selectedShelterForDonation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500 text-white">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Donate to {selectedShelterForDonation.shelterName}
                  </h3>
                  <p className="text-xs text-slate-400">Directly funds medicine and shelter upkeep</p>
                </div>
              </div>
              <button onClick={() => setSelectedShelterForDonation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {donationSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  Thank You for Your Generosity!
                </h4>
                <p className="text-slate-500">
                  Your contribution of <strong className="text-emerald-600 font-bold">{formatCurrency(donationSuccess.amount)}</strong> has been recorded.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-left space-y-1 text-[11px]">
                  <div><strong>Transaction Code:</strong> {donationSuccess.transactionCode}</div>
                  <div><strong>Beneficiary:</strong> {selectedShelterForDonation.shelterName}</div>
                </div>
                <button
                  onClick={() => setSelectedShelterForDonation(null)}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleDonateSubmit} className="space-y-4">
                {/* Preset Amount Grid */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Contribution Amount:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 25, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePresetAmount(val)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                          amount === val && !customAmount
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-600 ring-2 ring-sky-500/20'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Or enter custom amount in USD ($)..."
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Donor Display Name:
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    disabled={isAnonymous}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50"
                  />
                  <label className="flex items-center gap-2 mt-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    <span>Donate anonymously (hide my name on public feed)</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Encouraging Message:
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || amount <= 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Confirming Transaction...' : `Confirm Donation of ${formatCurrency(amount)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
