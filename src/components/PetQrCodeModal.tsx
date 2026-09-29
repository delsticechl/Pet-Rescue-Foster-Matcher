import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Share2,
  X,
  Printer,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Heart,
  MapPin,
  FileDown
} from 'lucide-react';
import { Pet } from '../types';

interface PetQrCodeModalProps {
  pet: Pet | null;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (title: string, description: string) => void;
}

export const PetQrCodeModal: React.FC<PetQrCodeModalProps> = ({
  pet,
  isOpen,
  onClose,
  showToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrSize, setQrSize] = useState<number>(300);

  const getPublicUrl = (petId: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('petId', petId);
      return url.toString();
    }
    return `https://pawfund.org/pets?petId=${petId}`;
  };

  const publicUrl = pet ? getPublicUrl(pet.petId) : '';

  // Generate QR Code data URL when pet changes or modal opens
  useEffect(() => {
    if (!pet || !isOpen) return;

    const generateQR = async () => {
      try {
        const url = getPublicUrl(pet.petId);
        const dataUrl = await QRCode.toDataURL(url, {
          width: qrSize,
          margin: 2,
          color: {
            dark: '#0f172a', // slate-900
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [pet, isOpen, qrSize]);

  if (!isOpen || !pet) return null;

  const primaryImg = pet.images?.find((img) => img.isPrimary) || pet.images?.[0] || {
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  };

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = publicUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (showToast) {
        showToast('Link Copied!', `Adoption link for ${pet.name} copied to clipboard.`);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode-PawFund-${pet.petId}-${pet.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (showToast) {
      showToast('QR Code Downloaded!', `QR Code image for ${pet.name} saved to device.`);
    }
  };

  const handleDownloadPoster = async () => {
    // Generate an adoption flyer canvas with pet photo, details, and QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1100;

    const drawRoundedRect = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    // 1. Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0284c7');
    gradient.addColorStop(0.3, '#0f172a');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. White Card Container
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 40, 40, 720, 1020, 24);
    ctx.fill();

    // 3. Header Banner inside Card
    ctx.fillStyle = '#0284c7';
    drawRoundedRect(ctx, 40, 40, 720, 100, 24);
    ctx.fill();
    ctx.fillRect(40, 80, 720, 60);

    // Brand Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 PAWFUND - ADOPT A RESCUE PET', 400, 95);

    // 4. Load Pet Image & Draw
    const petImg = new Image();
    petImg.crossOrigin = 'anonymous';
    petImg.onload = () => {
      // Draw Pet Image
      ctx.save();
      drawRoundedRect(ctx, 80, 170, 640, 360, 16);
      ctx.clip();
      ctx.drawImage(petImg, 80, 170, 640, 360);
      ctx.restore();

      // Pet Info
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px sans-serif';
      const genderDisplay = pet.gender === 'Đực' || pet.gender === 'Male' ? '♂ Male' : '♀ Female';
      ctx.fillText(`${pet.name} (${genderDisplay})`, 80, 580);

      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`${pet.species} • ${pet.breed} • ${pet.ageMonths} mos old`, 80, 615);

      ctx.fillStyle = '#475569';
      ctx.font = '18px sans-serif';
      ctx.fillText(`📍 Shelter: ${pet.shelterName || 'PawFund Rescue Center'}`, 80, 650);
      ctx.fillText(`🩺 Health: ${pet.healthStatus} ${pet.vaccinated ? '• Vaccinated' : ''} ${pet.sterilized ? '• Neutered/Spayed' : ''}`, 80, 680);

      // Description snippet
      ctx.fillStyle = '#334155';
      ctx.font = 'italic 17px sans-serif';
      const descWords = (pet.description || '').slice(0, 120) + '...';
      ctx.fillText(`"${descWords}"`, 80, 720);

      // QR Code Block
      const qrImg = new Image();
      qrImg.onload = () => {
        // QR Box
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 80, 760, 640, 240, 16);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.drawImage(qrImg, 100, 780, 200, 200);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('SCAN TO ADOPT ME', 330, 840);

        ctx.fillStyle = '#64748b';
        ctx.font = '16px sans-serif';
        ctx.fillText('1. Open camera on your smartphone', 330, 880);
        ctx.fillText('2. Point camera at QR code for pet medical bio', 330, 910);
        ctx.fillText('3. Submit online adoption application in seconds', 330, 940);

        // Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PawFund Rescue Network • www.pawfund.org • ID: ' + pet.petId, 400, 1035);

        // Download
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `Adoption-Standee-${pet.petId}-${pet.name}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (showToast) {
          showToast('Adoption Poster Generated!', `Standee poster for ${pet.name} exported successfully.`);
        }
      };
      qrImg.src = qrDataUrl;
    };
    petImg.src = primaryImg.imageUrl;
  };

  const handleShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Adopt ${pet.name} - PawFund`,
          text: `Help us find a loving forever home for ${pet.name} (${pet.species} - ${pet.breed})!`,
          url: publicUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      id="pet-qr-modal-overlay"
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
    >
      <div
        id="pet-qr-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 dark:from-sky-950/40 dark:via-indigo-950/40 dark:to-teal-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Adoption QR Code Stand
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {pet.petId}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan code to view live profile and submit an adoption application
              </p>
            </div>
          </div>
          <button
            id="close-pet-qr-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Pet Brief Info Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <img
              src={primaryImg.imageUrl}
              alt={pet.name}
              className="w-13 h-13 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {pet.name}
                </h3>
                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  {pet.adoptionStatus === 'Ready' ? 'Ready' : pet.adoptionStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {pet.species} • {pet.breed} • {pet.gender === 'Đực' || pet.gender === 'Male' ? '♂ Male' : '♀ Female'}
              </p>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                {pet.shelterName || 'PawFund Rescue Center'}
              </p>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900/60 dark:to-slate-900/90 border border-slate-200 dark:border-slate-700 relative group">
            {qrDataUrl ? (
              <div className="relative p-4 bg-white rounded-2xl shadow-md ring-4 ring-sky-500/10 dark:ring-sky-500/20">
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${pet.name}`}
                  className="w-52 h-52 object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-sky-500 text-sky-600">
                    <Heart className="w-5 h-5 fill-current text-rose-500" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3.5 text-center flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-sky-500" /> Point your phone camera to scan
            </p>
          </div>

          {/* URL Box & One-Click Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Direct Pet Profile URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 select-all focus:outline-none"
              />
              <button
                id="copy-pet-qr-url-btn"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              id="download-qr-png-btn"
              onClick={handleDownloadQr}
              className="py-2.5 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download QR (PNG)
            </button>

            <button
              id="download-poster-btn"
              onClick={handleDownloadPoster}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md"
            >
              <FileDown className="w-3.5 h-3.5" /> Export Standee / Flyer
            </button>

            <button
              id="share-pet-qr-btn"
              onClick={handleShare}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
