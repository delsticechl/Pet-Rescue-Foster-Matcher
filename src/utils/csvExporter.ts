import { Pet, AdoptionApplication, Shelter } from '../types';

/**
 * Escapes a cell value for standard CSV format.
 * Encapsulates in double quotes if it contains commas, double quotes, or newlines.
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Converts array of headers and row objects to CSV string with UTF-8 BOM.
 */
function convertToCsv(headers: { key: string; label: string }[], rows: Record<string, any>[]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const rowLines = rows.map((row) => {
    return headers.map((h) => escapeCsvCell(row[h.key])).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 Vietnamese diacritics natively
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a client-side file download for the CSV content.
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface PetAdoptionSummaryRow {
  petId: string;
  name: string;
  species: string;
  breed: string;
  ageMonths: number;
  gender: string;
  healthStatus: string;
  vaccinated: string;
  sterilized: string;
  energyLevel: string;
  goodWithKids: string;
  goodWithPets: string;
  requiresYard: string;
  adoptionStatus: string;
  shelterName: string;
  createdAt: string;
  medicalRecordsCount: number;
  totalApplications: number;
  pendingApplications: number;
  interviewingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  adopterName: string;
  adopterEmail: string;
  adopterPhone: string;
  successRate: string;
  description: string;
}

/**
 * Builds the dataset and exports a comprehensive summary of all pets and their adoption application stats.
 */
export function exportPetAndApplicationStatsCsv(
  pets: Pet[],
  applications: AdoptionApplication[],
  shelters: Shelter[]
): { rowCount: number; fileName: string; csvContent: string } {
  const shelterMap = new Map<string, string>();
  shelters.forEach((s) => shelterMap.set(s.shelterId, s.shelterName));

  const headers = [
    { key: 'petId', label: 'Mã Thú Cưng (Pet ID)' },
    { key: 'name', label: 'Tên Thú Cưng' },
    { key: 'species', label: 'Loài' },
    { key: 'breed', label: 'Giống Loài' },
    { key: 'ageMonths', label: 'Tuổi (Tháng)' },
    { key: 'gender', label: 'Giới Tính' },
    { key: 'healthStatus', label: 'Tình Trạng Sức Khỏe' },
    { key: 'vaccinated', label: 'Đã Tiêm Vaccine' },
    { key: 'sterilized', label: 'Đã Triệt Sản' },
    { key: 'energyLevel', label: 'Mức Năng Lượng' },
    { key: 'goodWithKids', label: 'Thân Thiện Trẻ Nhỏ' },
    { key: 'goodWithPets', label: 'Hòa Đồng Với Pet Khác' },
    { key: 'requiresYard', label: 'Yêu Cầu Sân Vườn' },
    { key: 'adoptionStatus', label: 'Trạng Thái Nhận Nuôi' },
    { key: 'shelterName', label: 'Trạm Cứu Hộ Tiếp Nhận' },
    { key: 'createdAt', label: 'Ngày Tiếp Nhận' },
    { key: 'medicalRecordsCount', label: 'Số Lượt Sổ Y Tế / Khám' },
    { key: 'totalApplications', label: 'Tổng Số Đơn Nhận Nuôi' },
    { key: 'pendingApplications', label: 'Số Đơn Chờ Duyệt (Submitted)' },
    { key: 'interviewingApplications', label: 'Số Đơn Đang Phỏng Vấn (Interviewing)' },
    { key: 'approvedApplications', label: 'Số Đơn Đã Chấp Thuận (Approved)' },
    { key: 'rejectedApplications', label: 'Số Đơn Từ Chối (Rejected)' },
    { key: 'adopterName', label: 'Người Nhận Nuôi Thành Công' },
    { key: 'adopterEmail', label: 'Email Người Nhận Nuôi' },
    { key: 'adopterPhone', label: 'SĐT Người Nhận Nuôi' },
    { key: 'successRate', label: 'Tỷ Lệ Duyệt Thành Công' },
    { key: 'description', label: 'Mô Tả Đặc Điểm' },
  ];

  const rows: PetAdoptionSummaryRow[] = pets.map((pet) => {
    // Filter all applications for this specific pet
    const petApps = applications.filter((app) => app.petId === pet.petId);
    const totalApps = petApps.length;
    const pendingApps = petApps.filter((a) => a.status === 'Submitted').length;
    const interviewingApps = petApps.filter((a) => a.status === 'Interviewing').length;
    const approvedApps = petApps.filter((a) => a.status === 'Approved').length;
    const rejectedApps = petApps.filter((a) => a.status === 'Rejected').length;

    // Find the approved application for adopter info if available
    const approvedApp = petApps.find((a) => a.status === 'Approved');

    const successRate = totalApps > 0 ? `${Math.round((approvedApps / totalApps) * 100)}%` : '0%';

    const shelterName =
      pet.shelterName ||
      (pet.shelterId ? shelterMap.get(pet.shelterId) : '') ||
      'Trạm Cứu Hộ PawFund';

    return {
      petId: pet.petId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageMonths: pet.ageMonths,
      gender: pet.gender,
      healthStatus: pet.healthStatus,
      vaccinated: pet.vaccinated ? 'Có' : 'Chưa',
      sterilized: pet.sterilized ? 'Có' : 'Chưa',
      energyLevel: pet.energyLevel,
      goodWithKids: pet.goodWithKids ? 'Có' : 'Không',
      goodWithPets: pet.goodWithPets ? 'Có' : 'Không',
      requiresYard: pet.requiresYard ? 'Bắt buộc' : 'Không',
      adoptionStatus:
        pet.adoptionStatus === 'Ready'
          ? 'Sẵn sàng nhận nuôi (Ready)'
          : pet.adoptionStatus === 'Adopted'
          ? 'Đã được nhận nuôi (Adopted)'
          : pet.adoptionStatus === 'Fostered'
          ? 'Đang nuôi tạm (Fostered)'
          : 'Đang chờ xử lý (Pending)',
      shelterName,
      createdAt: pet.createdAt || new Date().toISOString().split('T')[0],
      medicalRecordsCount: pet.medicalRecords?.length || 0,
      totalApplications: totalApps,
      pendingApplications: pendingApps,
      interviewingApplications: interviewingApps,
      approvedApplications: approvedApps,
      rejectedApplications: rejectedApps,
      adopterName: approvedApp?.applicantName || (pet.adoptionStatus === 'Adopted' ? 'Đã có chủ' : 'Chưa có'),
      adopterEmail: approvedApp?.applicantEmail || 'N/A',
      adopterPhone: approvedApp?.applicantPhone || 'N/A',
      successRate,
      description: pet.description || '',
    };
  });

  const csvContent = convertToCsv(headers, rows);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `PawFund_BaoCao_TongHop_ThuCung_Va_ThongKeDon_${dateStr}.csv`;

  downloadCsvFile(csvContent, fileName);

  return {
    rowCount: rows.length,
    fileName,
    csvContent,
  };
}

/**
 * Exports all detailed adoption applications.
 */
export function exportApplicationsDetailCsv(
  applications: AdoptionApplication[],
  pets: Pet[]
): { rowCount: number; fileName: string; csvContent: string } {
  const petMap = new Map<string, Pet>();
  pets.forEach((p) => petMap.set(p.petId, p));

  const headers = [
    { key: 'applicationId', label: 'Mã Hồ Sơ Đăng Ký' },
    { key: 'appliedAt', label: 'Ngày Nộp Đơn' },
    { key: 'status', label: 'Trạng Thái Duyệt' },
    { key: 'type', label: 'Loại Đơn (Adopt/Foster)' },
    { key: 'petId', label: 'Mã Pet' },
    { key: 'petName', label: 'Tên Pet' },
    { key: 'petSpecies', label: 'Loài' },
    { key: 'petBreed', label: 'Giống' },
    { key: 'applicantName', label: 'Họ Tên Người Nộp' },
    { key: 'applicantEmail', label: 'Email' },
    { key: 'applicantPhone', label: 'Số Điện Thoại' },
    { key: 'applicantAddress', label: 'Địa Chỉ' },
    { key: 'housingType', label: 'Loại Hình Nhà Ở' },
    { key: 'hasYard', label: 'Có Sân Vườn' },
    { key: 'incomeMonthly', label: 'Thu Nhập Hàng Tháng' },
    { key: 'otherPets', label: 'Thú Cưng Hiện Có' },
    { key: 'experienceDescription', label: 'Kinh Nghiệm Nuôi Dưỡng' },
    { key: 'interviewTime', label: 'Lịch Hẹn Phỏng Vấn' },
    { key: 'staffNotes', label: 'Ghi Chú Của Nhân Viên' },
    { key: 'shelterName', label: 'Trạm Tiếp Nhận' },
  ];

  const rows = applications.map((app) => {
    const pet = petMap.get(app.petId);
    return {
      applicationId: app.applicationId,
      appliedAt: app.appliedAt,
      status: app.status,
      type: app.type === 'Adopt' ? 'Nhận nuôi (Adopt)' : 'Nuôi tạm (Foster)',
      petId: app.petId,
      petName: app.petName || pet?.name || 'N/A',
      petSpecies: app.petSpecies || pet?.species || 'N/A',
      petBreed: app.petBreed || pet?.breed || 'N/A',
      applicantName: app.applicantName || 'N/A',
      applicantEmail: app.applicantEmail || 'N/A',
      applicantPhone: app.applicantPhone || 'N/A',
      applicantAddress: app.applicantAddress || 'N/A',
      housingType: app.housingType || 'N/A',
      hasYard: app.hasYard ? 'Có sân' : 'Không có sân',
      incomeMonthly: app.incomeMonthly || 'N/A',
      otherPets: app.otherPets || 'Không',
      experienceDescription: app.experienceDescription || '',
      interviewTime: app.interviewTime || 'Chưa xếp lịch',
      staffNotes: app.staffNotes || '',
      shelterName: app.shelterName || pet?.shelterName || 'Trạm Cứu Hộ PawFund',
    };
  });

  const csvContent = convertToCsv(headers, rows);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `PawFund_ChiTiet_HoSo_DonNhanNuoi_${dateStr}.csv`;

  downloadCsvFile(csvContent, fileName);

  return {
    rowCount: rows.length,
    fileName,
    csvContent,
  };
}
