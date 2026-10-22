import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_USERS,
  INITIAL_SHELTERS,
  INITIAL_PETS,
  INITIAL_APPLICATIONS,
  INITIAL_CARE_LOGS,
  INITIAL_DONATIONS,
} from './src/data/initialData';
import {
  Pet,
  AdoptionApplication,
  CareLog,
  Donation,
  User,
  Shelter,
  PetMedicalRecord,
  InAppNotification,
  AiMatchResult,
} from './src/types';
import {
  MySqlService,
  getMySqlStatus,
  testMySqlConnection,
  initMySqlSchema,
  MYSQL_SCHEMA_DDL,
} from './src/db/mysql';

dotenv.config();

// In-Memory Fallback State (Contains ONLY AdminStaff if MySQL is not yet configured)
let memoryUsers: User[] = [...INITIAL_USERS];
let memoryShelters: Shelter[] = [...INITIAL_SHELTERS];
let memoryPets: Pet[] = [...INITIAL_PETS];
let memoryApplications: AdoptionApplication[] = [...INITIAL_APPLICATIONS];
let memoryCareLogs: CareLog[] = [...INITIAL_CARE_LOGS];
let memoryDonations: Donation[] = [...INITIAL_DONATIONS];
let memoryNotifications: InAppNotification[] = [];

let isMySqlLive = false;

// Attempt MySQL connection on startup
async function checkMySqlOnStartup() {
  try {
    const res = await testMySqlConnection();
    if (res.success) {
      isMySqlLive = true;
      console.log('✅ Connected to MySQL successfully! Initializing schema...');
      await initMySqlSchema();
    } else {
      isMySqlLive = false;
      console.warn('⚠️ MySQL not connected yet:', res.message);
    }
  } catch (err: any) {
    isMySqlLive = false;
    console.warn('⚠️ MySQL connection check failed:', err.message);
  }
}

checkMySqlOnStartup();

// Real Email Delivery Service
async function sendRealEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; provider: string; error?: string }> {
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'PawFund <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      if (res.ok) return { sent: true, provider: 'Resend' };
      const err = await res.text();
      return { sent: false, provider: 'Resend', error: err };
    } catch (e: any) {
      return { sent: false, provider: 'Resend', error: e.message };
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'no-reply@pawfund.org', name: 'PawFund Shelter' },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });
      if (res.ok || res.status === 202) return { sent: true, provider: 'SendGrid' };
      const err = await res.text();
      return { sent: false, provider: 'SendGrid', error: err };
    } catch (e: any) {
      return { sent: false, provider: 'SendGrid', error: e.message };
    }
  }

  return {
    sent: false,
    provider: 'InAppOnly',
    error: 'Chưa cấu hình API Key Email trong .env (thông báo đã được gửi trực tiếp lên giao diện Web)',
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // ==========================================
  // WEBSOCKET REAL-TIME INFRASTRUCTURE
  // ==========================================
  interface WsClientInfo {
    ws: WebSocket;
    userId?: string;
    userEmail?: string;
    role?: string;
    isAlive: boolean;
    connectedAt: string;
  }

  const connectedWsClients = new Set<WsClientInfo>();
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname === '/ws' || url.pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const client: WsClientInfo = {
      ws,
      isAlive: true,
      connectedAt: new Date().toISOString(),
    };
    connectedWsClients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'auth') {
          client.userId = msg.userId;
          client.userEmail = msg.email ? String(msg.email).toLowerCase() : undefined;
          client.role = msg.role;
          ws.send(
            JSON.stringify({
              event: 'auth:ack',
              data: {
                status: 'authenticated',
                role: client.role,
                email: client.userEmail,
                totalOnline: connectedWsClients.size,
              },
            })
          );
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore malformed payloads
      }
    });

    ws.on('close', () => {
      connectedWsClients.delete(client);
    });

    ws.on('error', () => {
      connectedWsClients.delete(client);
    });

    // Send connection handshake
    ws.send(
      JSON.stringify({
        event: 'connected',
        data: {
          message: 'PawFund Real-Time WebSocket Channel Ready',
          timestamp: new Date().toISOString(),
          onlineUsers: connectedWsClients.size,
        },
      })
    );
  });

  // Keep-alive heartbeat ping every 25s
  setInterval(() => {
    for (const client of connectedWsClients) {
      if (!client.isAlive) {
        client.ws.terminate();
        connectedWsClients.delete(client);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        client.ws.terminate();
        connectedWsClients.delete(client);
      }
    }
  }, 25000);

  // Broadcast helper function to push updates to connected clients
  function broadcastWsEvent(event: string, data: any, filter?: { targetEmail?: string; adminOnly?: boolean }) {
    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const client of connectedWsClients) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;
      if (filter?.adminOnly && client.role !== 'Admin') continue;
      if (filter?.targetEmail) {
        const matchEmail = client.userEmail && client.userEmail.toLowerCase() === filter.targetEmail.toLowerCase();
        const isAdmin = client.role === 'Admin';
        if (!matchEmail && !isAdmin) continue;
      }
      try {
        client.ws.send(payload);
      } catch {
        // ignore
      }
    }
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // WebSocket Live Health Status API
  app.get('/api/ws/status', (_req, res) => {
    res.json({
      onlineClients: connectedWsClients.size,
      status: 'active',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // 1. MYSQL CONNECTION & STATUS APIS
  // ==========================================
  app.get('/api/mysql/status', async (_req, res) => {
    const status = getMySqlStatus();
    res.json(status);
  });

  app.post('/api/mysql/test', async (req, res) => {
    const result = await testMySqlConnection(req.body);
    isMySqlLive = result.success;
    if (result.success) {
      await initMySqlSchema();
    }
    res.json(result);
  });

  app.post('/api/mysql/init-schema', async (_req, res) => {
    const result = await initMySqlSchema();
    res.json(result);
  });

  app.get('/api/mysql/schema-sql', (_req, res) => {
    res.type('text/plain').send(MYSQL_SCHEMA_DDL);
  });

  // ==========================================
  // 2. AUTHENTICATION (Real Register & Login)
  // ==========================================
  app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, confirmPassword, phone, address } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Xác nhận mật khẩu không khớp' });
    }

    try {
      if (isMySqlLive) {
        const existing = await MySqlService.getUserByEmailOrUsername(email);
        if (existing) {
          return res.status(400).json({ error: 'Email này đã được đăng ký tài khoản' });
        }
        const user = await MySqlService.createUser({
          fullName,
          email,
          passwordHash: password,
          phone,
          address,
          role: 'Adopter',
        });
        return res.json({ success: true, user, token: `tok-${Date.now()}` });
      } else {
        const existing = memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          return res.status(400).json({ error: 'Email này đã được đăng ký tài khoản' });
        }
        const newUser: User = {
          userId: `USR-${Date.now()}`,
          username: email.split('@')[0],
          fullName,
          email,
          phone: phone || '',
          address: address || '',
          role: 'Adopter',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          createdAt: new Date().toISOString(),
        };
        memoryUsers.push(newUser);
        return res.json({ success: true, user: newUser, token: `tok-${Date.now()}` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lỗi khi đăng ký tài khoản' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier) {
      return res.status(400).json({ error: 'Vui lòng nhập email hoặc tên đăng nhập' });
    }

    try {
      if (isMySqlLive) {
        const userRow = await MySqlService.getUserByEmailOrUsername(identifier);
        if (!userRow) {
          return res.status(401).json({ error: 'Tài khoản không tồn tại trong hệ thống' });
        }
        // Verify password
        if (password && userRow.password_hash && password !== userRow.password_hash) {
          return res.status(401).json({ error: 'Mật khẩu không chính xác' });
        }
        const user: User = {
          userId: userRow.user_id,
          username: userRow.username,
          fullName: userRow.full_name,
          email: userRow.email,
          phone: userRow.phone,
          address: userRow.address,
          role: userRow.role,
          avatarUrl: userRow.avatar_url || '',
          createdAt: userRow.created_at,
        };
        return res.json({ success: true, user, token: `tok-${Date.now()}` });
      } else {
        const user = memoryUsers.find(
          (u) =>
            u.email.toLowerCase() === identifier.toLowerCase() ||
            (u.username && u.username.toLowerCase() === identifier.toLowerCase())
        );
        if (!user) {
          return res.status(401).json({ error: 'Tài khoản không tồn tại' });
        }
        return res.json({ success: true, user, token: `tok-${Date.now()}` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lỗi khi đăng nhập' });
    }
  });

  app.get('/api/users', async (_req, res) => {
    try {
      if (isMySqlLive) {
        const users = await MySqlService.getUsers();
        return res.json(users);
      }
      return res.json(memoryUsers);
    } catch (err: any) {
      return res.json(memoryUsers);
    }
  });

  app.put('/api/users/:userId/avatar', async (req, res) => {
    try {
      const { userId } = req.params;
      const { avatarUrl } = req.body;
      if (!avatarUrl) {
        return res.status(400).json({ error: 'Avatar image URL is required' });
      }

      // Update in memoryUsers
      const memUser = memoryUsers.find((u) => u.userId === userId);
      if (memUser) {
        memUser.avatarUrl = avatarUrl;
      }

      if (isMySqlLive) {
        await MySqlService.updateUserAvatar(userId, avatarUrl);
      }

      // Broadcast WebSocket event
      broadcastWsEvent('user:avatar_updated', {
        userId,
        avatarUrl,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        user: memUser || { userId, avatarUrl },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error updating avatar' });
    }
  });

  // ==========================================
  // 3. PETS & HEALTH HISTORY APIS
  // ==========================================
  app.get('/api/pets', async (req, res) => {
    try {
      let petList: Pet[] = [];
      if (isMySqlLive) {
        petList = await MySqlService.getPets();
      } else {
        petList = memoryPets;
      }

      const { species, status, search, goodWithKids, requiresYard } = req.query;
      let filtered = [...petList];

      if (species && species !== 'all') {
        const s = String(species).toLowerCase();
        filtered = filtered.filter((p) => {
          const sp = p.species.toLowerCase();
          return sp === s || (s === 'dog' && sp === 'chó') || (s === 'cat' && sp === 'mèo');
        });
      }

      if (status && status !== 'all') {
        filtered = filtered.filter((p) => p.adoptionStatus === status);
      }

      if (goodWithKids === 'true') {
        filtered = filtered.filter((p) => p.goodWithKids);
      }

      if (requiresYard === 'false') {
        filtered = filtered.filter((p) => !p.requiresYard);
      }

      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.breed.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
      }

      res.json(filtered);
    } catch (err: any) {
      res.json(memoryPets);
    }
  });

  app.get('/api/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (isMySqlLive) {
        const pet = await MySqlService.getPetById(id);
        if (pet) return res.json(pet);
      }
      const pet = memoryPets.find((p) => p.petId === id);
      if (!pet) return res.status(404).json({ error: 'Không tìm thấy thú cưng' });
      return res.json(pet);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // AdminStaff publishes a new pet with local photo upload and initial medical record
  app.post('/api/pets', async (req, res) => {
    const role = req.headers['x-user-role'];
    if (role !== 'Admin' && role !== 'RescueStaff') {
      return res.status(403).json({ error: 'Chỉ AdminStaff mới có quyền đăng tải thú cưng mới' });
    }

    const {
      name,
      species,
      breed,
      ageMonths,
      gender,
      healthStatus,
      vaccinated,
      sterilized,
      adoptionStatus,
      energyLevel,
      requiresYard,
      goodWithKids,
      goodWithPets,
      description,
      shelterId,
      imageUrl,
      fileName,
      fileSize,
      mimeType,
      initialDiagnosis,
      initialTreatment,
      vetName,
      medications,
      medicalDate,
    } = req.body;

    if (!name || !species) {
      return res.status(400).json({ error: 'Vui lòng nhập tên và loài của thú cưng' });
    }

    const newPetId = `PET-${Date.now().toString().slice(-6)}`;
    const petData: Pet = {
      petId: newPetId,
      name,
      species,
      breed: breed || 'Lai',
      ageMonths: Number(ageMonths) || 12,
      gender: gender || 'Đực',
      healthStatus: healthStatus || 'Healthy',
      vaccinated: Boolean(vaccinated),
      sterilized: Boolean(sterilized),
      adoptionStatus: adoptionStatus || 'Ready',
      energyLevel: energyLevel || 'Medium',
      requiresYard: Boolean(requiresYard),
      goodWithKids: goodWithKids !== false,
      goodWithPets: goodWithPets !== false,
      description: description || 'Thú cưng vừa được trạm cứu hộ tiếp nhận, đang tìm kiếm chủ mới yêu thương.',
      shelterId: shelterId || 'SHL-01',
      createdAt: new Date().toISOString(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      primaryImage: imageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      images: imageUrl
        ? [
            {
              imageId: `IMG-${Date.now()}`,
              petId: newPetId,
              imageUrl,
              isPrimary: true,
              fileName: fileName || 'pet_photo.jpg',
              fileSize: fileSize || 0,
              mimeType: mimeType || 'image/jpeg',
              uploadSource: 'LocalUpload',
            },
          ]
        : [],
      medicalRecords: initialDiagnosis
        ? [
            {
              recordId: `MED-${Date.now()}`,
              petId: newPetId,
              medicalDate: medicalDate || new Date().toISOString().split('T')[0],
              diagnosis: initialDiagnosis,
              treatment: initialTreatment || 'Khám tổng quát & theo dõi thể trạng',
              vetName: vetName || 'Bác sĩ thú y PawFund',
              medications: medications || '',
            },
          ]
        : [],
      medicalHistory: initialDiagnosis
        ? [
            {
              recordId: `MED-${Date.now()}`,
              petId: newPetId,
              medicalDate: medicalDate || new Date().toISOString().split('T')[0],
              diagnosis: initialDiagnosis,
              treatment: initialTreatment || 'Khám tổng quát & theo dõi thể trạng',
              vetName: vetName || 'Bác sĩ thú y PawFund',
              medications: medications || '',
            },
          ]
        : [],
    };

    try {
      if (isMySqlLive) {
        const created = await MySqlService.createPetWithDetails(
          petData,
          imageUrl ? { imageUrl, fileName, fileSize, mimeType } : undefined,
          initialDiagnosis
            ? {
                medicalDate,
                diagnosis: initialDiagnosis,
                treatment: initialTreatment,
                vetName,
                medications,
              }
            : undefined
        );
        broadcastWsEvent('pet:created', created);
        return res.status(201).json(created);
      } else {
        memoryPets.unshift(petData);
        broadcastWsEvent('pet:created', petData);
        return res.status(201).json(petData);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lỗi khi lưu thú cưng mới' });
    }
  });

  app.put('/api/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (isMySqlLive) {
        await MySqlService.updatePet(id, req.body);
        const updated = await MySqlService.getPetById(id);
        if (updated) broadcastWsEvent('pet:updated', updated);
        return res.json(updated);
      } else {
        const idx = memoryPets.findIndex((p) => p.petId === id);
        if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy thú cưng' });
        memoryPets[idx] = { ...memoryPets[idx], ...req.body };
        broadcastWsEvent('pet:updated', memoryPets[idx]);
        return res.json(memoryPets[idx]);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (isMySqlLive) {
        await MySqlService.deletePet(id);
      } else {
        memoryPets = memoryPets.filter((p) => p.petId !== id);
      }
      broadcastWsEvent('pet:deleted', { petId: id });
      return res.json({ success: true, message: 'Đã xóa thú cưng thành công', deletedPetId: id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Add Medical Record to a pet - STOP updates when pet is already Adopted!
  app.post('/api/pets/:id/medical', async (req, res) => {
    const { id } = req.params;
    const { medicalDate, diagnosis, treatment, vetName, medications } = req.body;

    try {
      let pet: Pet | null = null;
      if (isMySqlLive) {
        pet = await MySqlService.getPetById(id);
      } else {
        pet = memoryPets.find((p) => p.petId === id) || null;
      }

      if (!pet) return res.status(404).json({ error: 'Không tìm thấy thú cưng' });

      // RULE: Once pet is Adopted, shelter medical updates are frozen!
      if (pet.adoptionStatus === 'Adopted') {
        return res.status(400).json({
          error: 'Thú cưng này đã được nhận nuôi thành công! Dữ liệu y tế tại trạm đã được đóng băng. Người nhận nuôi hãy chia sẻ tình trạng bé qua Care Log.',
        });
      }

      const newRecord: PetMedicalRecord = {
        recordId: `MED-${Date.now()}`,
        petId: id,
        medicalDate: medicalDate || new Date().toISOString().split('T')[0],
        diagnosis: diagnosis || 'Khám định kỳ',
        treatment: treatment || 'Theo dõi sức khỏe',
        vetName: vetName || 'Bác sĩ thú y PawFund',
        medications: medications || '',
      };

      if (isMySqlLive) {
        const saved = await MySqlService.addMedicalRecord(id, newRecord);
        broadcastWsEvent('pet:updated', { petId: id, medicalRecord: newRecord });
        return res.json(saved);
      } else {
        if (!pet.medicalRecords) pet.medicalRecords = [];
        pet.medicalRecords.unshift(newRecord);
        pet.medicalHistory = pet.medicalRecords;
        broadcastWsEvent('pet:updated', { petId: id, medicalRecord: newRecord });
        return res.json(newRecord);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 4. INTELLIGENT AI PET MATCHMAKER (Gemini)
  // ==========================================
  app.post('/api/match-pet', async (req, res) => {
    const { lifestyleDescription, speciesPreference, livingSpace, familyWithKids, hasOtherPets } = req.body;

    try {
      // Retrieve available pets from database
      let allPets: Pet[] = [];
      if (isMySqlLive) {
        allPets = await MySqlService.getPets();
      } else {
        allPets = memoryPets;
      }

      // Filter only Ready or Fostered pets looking for homes
      const availablePets = allPets.filter((p) => p.adoptionStatus === 'Ready' || p.adoptionStatus === 'Pending');

      if (availablePets.length === 0) {
        return res.json({
          matches: [],
          message: 'Hiện trạm chưa có thú cưng nào sẵn sàng nhận nuôi. Hãy quay lại sau nhé!',
        });
      }

      // Check Gemini API Key
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && lifestyleDescription) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const petSummaries = availablePets.map((p) => ({
            id: p.petId,
            name: p.name,
            species: p.species,
            breed: p.breed,
            ageMonths: p.ageMonths,
            energyLevel: p.energyLevel,
            requiresYard: p.requiresYard,
            goodWithKids: p.goodWithKids,
            goodWithPets: p.goodWithPets,
            description: p.description,
            healthStatus: p.healthStatus,
          }));

          const prompt = `Bạn là chuyên gia kết nối thú cưng của trạm cứu hộ PawFund. 
Dưới đây là thông tin về người muốn nhận nuôi:
- Mô tả lối sống & mong muốn: "${lifestyleDescription}"
- Ưu tiên loài: ${speciesPreference || 'Tất cả'}
- Không gian sống: ${livingSpace || 'Không xác định'}
- Có trẻ nhỏ trong nhà: ${familyWithKids ? 'Có' : 'Không'}
- Đã có thú cưng khác: ${hasOtherPets ? 'Có' : 'Không'}

Danh sách các bé đang có tại trạm:
${JSON.stringify(petSummaries, null, 2)}

Hãy phân tích và chọn ra tối đa 5 bé phù hợp nhất theo độ tương thích từ cao xuống thấp.
Trả về định dạng JSON thuần túy (không dùng markdown khác ngoài mảng JSON hoặc object JSON) theo mẫu sau:
{
  "matches": [
    {
      "petId": "PET-xxx",
      "score": 95,
      "reason": "Giải thích ngắn gọn 1-2 câu tiếng Việt ấm áp vì sao bé này rất hợp với hoàn cảnh của họ"
    }
  ]
}`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const responseText = response.text || '{}';
          const parsed = JSON.parse(responseText);

          if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
            const enrichedMatches = parsed.matches
              .map((m: any) => {
                const foundPet = availablePets.find((p) => p.petId === m.petId);
                return foundPet
                  ? {
                      petId: m.petId,
                      score: Number(m.score) || 85,
                      reason: m.reason || 'Bé rất phù hợp với nhịp sống và gia đình của bạn.',
                      pet: foundPet,
                    }
                  : null;
              })
              .filter(Boolean);

            return res.json({ matches: enrichedMatches, poweredBy: 'Gemini 2.5 Flash' });
          }
        } catch (aiErr: any) {
          console.warn('Gemini Matching Error, using heuristic fallback:', aiErr.message);
        }
      }

      // Algorithmic fallback if Gemini not available or failed
      const scored = availablePets.map((pet) => {
        let score = 70;
        const reasons: string[] = [];

        if (speciesPreference && speciesPreference !== 'All') {
          const pref = speciesPreference.toLowerCase();
          const sp = pet.species.toLowerCase();
          if (pref === sp || (pref === 'dog' && sp === 'chó') || (pref === 'cat' && sp === 'mèo')) {
            score += 15;
            reasons.push(`Đúng loài bạn yêu thích (${pet.species})`);
          } else {
            score -= 20;
          }
        }

        if (familyWithKids) {
          if (pet.goodWithKids) {
            score += 10;
            reasons.push('Rất hiền lành, an toàn với trẻ nhỏ');
          } else {
            score -= 15;
          }
        }

        if (livingSpace === 'Apartment') {
          if (!pet.requiresYard) {
            score += 10;
            reasons.push('Rất thích hợp sống trong căn hộ chung cư');
          } else {
            score -= 15;
          }
        }

        if (hasOtherPets && pet.goodWithPets) {
          score += 10;
          reasons.push('Hòa đồng với các bạn thú cưng khác');
        }

        const finalScore = Math.min(99, Math.max(50, score));
        return {
          petId: pet.petId,
          score: finalScore,
          reason: reasons.length > 0 ? reasons.join('. ') : 'Tính cách thân thiện, rất ngoan và quấn người.',
          pet,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      res.json({ matches: scored.slice(0, 6), poweredBy: 'Rule Engine' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. ADOPTION APPLICATIONS & MULTI-CHANNEL NOTIFICATIONS
  // ==========================================
  app.get('/api/applications', async (req, res) => {
    try {
      if (isMySqlLive) {
        const apps = await MySqlService.getApplications();
        return res.json(apps);
      }
      return res.json(memoryApplications);
    } catch (err: any) {
      return res.json(memoryApplications);
    }
  });

  app.post('/api/applications', async (req, res) => {
    const { petId, applicantName, applicantEmail, applicantPhone, applicantAddress, housingType, hasYard, petExperience } = req.body;

    if (!petId || !applicantName || !applicantEmail) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đơn nhận nuôi' });
    }

    try {
      // Check pet status
      let pet: Pet | null = null;
      if (isMySqlLive) {
        pet = await MySqlService.getPetById(petId);
      } else {
        pet = memoryPets.find((p) => p.petId === petId) || null;
      }

      if (pet && pet.adoptionStatus === 'Adopted') {
        return res.status(400).json({ error: 'Bé thú cưng này đã được nhận nuôi rồi. Hãy chọn một bé khác nhé!' });
      }

      const appData: Partial<AdoptionApplication> = {
        petId,
        applicantName,
        applicantEmail,
        applicantPhone,
        applicantAddress,
        housingType: housingType || 'Apartment / Condo',
        hasYard: Boolean(hasYard),
        petExperience,
      };

      let savedApp: AdoptionApplication;
      if (isMySqlLive) {
        savedApp = await MySqlService.createApplication(appData);
        // Add In-App notification
        await MySqlService.createNotification({
          recipientEmail: applicantEmail,
          title: 'Đơn nhận nuôi đã được gửi thành công',
          message: `Chúng tôi đã tiếp nhận hồ sơ xin nhận nuôi bé ${pet?.name || 'thú cưng'} của bạn. Ban quản trị sẽ sớm duyệt và liên hệ!`,
          type: 'adoption',
        });
      } else {
        savedApp = {
          applicationId: `APP-${Date.now()}`,
          petId,
          userId: 'USR-001',
          applicantName,
          applicantEmail,
          applicantPhone,
          applicantAddress,
          housingType: housingType || 'Apartment / Condo',
          hasYard: Boolean(hasYard),
          status: 'Pending',
          submittedAt: new Date().toISOString(),
          petName: pet?.name,
        };
        memoryApplications.unshift(savedApp);
        memoryNotifications.unshift({
          notificationId: `NOTIF-${Date.now()}`,
          recipientEmail: applicantEmail,
          title: 'Đơn nhận nuôi đã được gửi thành công',
          message: `Chúng tôi đã tiếp nhận hồ sơ xin nhận nuôi bé ${pet?.name || 'thú cưng'} của bạn.`,
          type: 'adoption',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Real-Time WebSocket broadcast
      broadcastWsEvent('application:created', savedApp);
      broadcastWsEvent('notification:new', {
        recipientEmail: applicantEmail,
        title: 'Đơn nhận nuôi đã được gửi thành công',
        message: `Chúng tôi đã tiếp nhận hồ sơ xin nhận nuôi bé ${pet?.name || 'thú cưng'} của bạn. Ban quản trị sẽ sớm duyệt và liên hệ!`,
        type: 'adoption',
        createdAt: new Date().toISOString(),
      });

      res.status(201).json(savedApp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin approves or rejects adoption application -> triggers in-app notification + real email
  app.put('/api/applications/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    try {
      let appRecord: AdoptionApplication | undefined;
      let petRecord: Pet | null = null;

      if (isMySqlLive) {
        const allApps = await MySqlService.getApplications();
        appRecord = allApps.find((a) => a.applicationId === id);
        if (appRecord) {
          petRecord = await MySqlService.getPetById(appRecord.petId);
        }
        await MySqlService.updateApplicationStatus(id, status, adminNotes);
      } else {
        appRecord = memoryApplications.find((a) => a.applicationId === id);
        if (appRecord) {
          appRecord.status = status;
          appRecord.adminNotes = adminNotes;
          appRecord.reviewedAt = new Date().toISOString();
          petRecord = memoryPets.find((p) => p.petId === appRecord!.petId) || null;
          if (status === 'Approved' && petRecord) {
            petRecord.adoptionStatus = 'Adopted';
          }
        }
      }

      if (!appRecord) {
        return res.status(404).json({ error: 'Không tìm thấy đơn nhận nuôi' });
      }

      const petName = petRecord?.name || appRecord.petName || 'bé cưng';
      const isApproved = status === 'Approved';

      // 1. In-App Notification (Always stored and delivered on Web)
      const notifTitle = isApproved
        ? `🎉 Chúc mừng! Đơn nhận nuôi bé ${petName} đã được DUYỆT!`
        : `Thông báo về đơn xin nhận nuôi bé ${petName}`;

      const notifMessage = isApproved
        ? `Ban quản trị PawFund đã phê duyệt đơn xin nhận nuôi bé ${petName} của bạn. Lời nhắn từ trạm: "${adminNotes || 'Vui lòng đến trạm để hoàn tất thủ tục đón bé về nhà mới!'}"`
        : `Đơn xin nhận nuôi bé ${petName} chưa thể phê duyệt vào thời điểm này. Lời nhắn: "${adminNotes || 'Rất cảm ơn bạn đã quan tâm!'}"`;

      if (isMySqlLive) {
        await MySqlService.createNotification({
          recipientEmail: appRecord.applicantEmail,
          title: notifTitle,
          message: notifMessage,
          type: 'adoption',
        });
      } else {
        memoryNotifications.unshift({
          notificationId: `NOTIF-${Date.now()}`,
          recipientEmail: appRecord.applicantEmail,
          title: notifTitle,
          message: notifMessage,
          type: 'adoption',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Real Email Notification (via Resend / SendGrid / SMTP if configured in .env)
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: ${isApproved ? '#0284c7' : '#475569'}; margin-bottom: 16px;">${notifTitle}</h2>
          <p>Xin chào <strong>${appRecord.applicantName}</strong>,</p>
          <p>${notifMessage}</p>
          ${
            isApproved
              ? `<div style="background-color: #f0f9ff; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #bae6fd;">
                  <h4 style="margin: 0 0 8px 0; color: #0369a1;">Các bước tiếp theo:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
                    <li>Mang theo CCCD/CMND đến trạm để ký hợp đồng nhận nuôi.</li>
                    <li>Chuẩn bị chuồng vận chuyển hoặc dây dắt an toàn.</li>
                    <li>Đăng tải hình ảnh đầu tiên của bé lên chuyên mục Care Log trên website PawFund!</li>
                  </ul>
                </div>`
              : ''
          }
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Hệ Thống Cứu Hộ & Nhận Nuôi Thú Cưng PawFund • Hotline: 0903112233</p>
        </div>
      `;

      const emailResult = await sendRealEmail({
        to: appRecord.applicantEmail,
        subject: `[PawFund] Cập nhật kết quả đơn nhận nuôi #${id}`,
        html: emailHtml,
      });

      // Real-Time WebSocket broadcast to notify adopter instantly
      broadcastWsEvent('application:status_updated', {
        applicationId: id,
        status,
        adminNotes,
        petId: appRecord.petId,
        petName,
        applicantEmail: appRecord.applicantEmail,
        reviewedAt: new Date().toISOString(),
      });

      broadcastWsEvent('notification:new', {
        recipientEmail: appRecord.applicantEmail,
        title: notifTitle,
        message: notifMessage,
        type: 'adoption',
        createdAt: new Date().toISOString(),
      });

      if (isApproved) {
        broadcastWsEvent('pet:updated', {
          petId: appRecord.petId,
          adoptionStatus: 'Adopted',
        });
      }

      res.json({
        success: true,
        applicationId: id,
        status,
        inAppNotificationCreated: true,
        emailDelivery: emailResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. CARE LOGS (For Adopted Pets)
  // ==========================================
  app.get('/api/care-logs', async (req, res) => {
    const { petId } = req.query;
    try {
      if (isMySqlLive) {
        const logs = await MySqlService.getCareLogs(petId ? String(petId) : undefined);
        return res.json(logs);
      }
      let logs = memoryCareLogs;
      if (petId) {
        logs = logs.filter((l) => l.petId === petId);
      }
      return res.json(logs);
    } catch (err: any) {
      return res.json(memoryCareLogs);
    }
  });

  app.post('/api/care-logs', async (req, res) => {
    const { petId, userId, authorName, logDate, notes, note, imageUrl, healthUpdate, mood, weightKg } = req.body;

    if (!petId || (!notes && !note)) {
      return res.status(400).json({ error: 'Vui lòng chọn thú cưng và nhập nội dung nhật ký chăm sóc' });
    }

    const logData: Partial<CareLog> = {
      petId,
      authorName: authorName || 'Chủ nuôi yêu thương',
      logDate: logDate || new Date().toISOString().split('T')[0],
      note: note || notes || '',
      notes: notes || note || '',
      imageUrl: imageUrl || '',
      healthUpdate: healthUpdate || 'Khỏe mạnh, thích nghi tốt',
      mood: mood || 'Vui vẻ & Tăng động',
      userId: userId || undefined,
      weightKg: weightKg != null ? Number(weightKg) : undefined,
    };

    try {
      if (isMySqlLive) {
        const saved = await MySqlService.createCareLog(logData);
        broadcastWsEvent('care_log:created', saved);
        return res.status(201).json(saved);
      } else {
        const pet = memoryPets.find((p) => p.petId === petId);
        const newLog: CareLog = {
          logId: `LOG-${Date.now()}`,
          petId,
          userId: 'USR-001',
          authorName: logData.authorName!,
          logDate: logData.logDate!,
          note: logData.note!,
          notes: logData.note!,
          imageUrl: logData.imageUrl || '',
          healthUpdate: logData.healthUpdate,
          mood: logData.mood,
          petName: pet?.name,
        };
        memoryCareLogs.unshift(newLog);
        broadcastWsEvent('care_log:created', newLog);
        return res.status(201).json(newLog);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. DONATIONS & REAL CONFIRMATION NOTIFICATION
  // ==========================================
  app.get('/api/donations', async (_req, res) => {
    try {
      if (isMySqlLive) {
        const dons = await MySqlService.getDonations();
        return res.json(dons);
      }
      return res.json(memoryDonations);
    } catch (err: any) {
      return res.json(memoryDonations);
    }
  });

  app.post('/api/donations', async (req, res) => {
    const { donorName, donorEmail, amount, target, message, paymentMethod } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Vui long nhap so tien quyen gop' });
    }

    const donData: Partial<Donation> = {
      donorName: donorName || 'Nha hao tam',
      donorEmail: donorEmail || '',
      amount: Number(amount) || 100000,
      target: target || 'Quỹ y tế & thức ăn cho thú cưng',
      message: message || '',
      paymentMethod: paymentMethod || 'VietQR',
      date: new Date().toISOString().split('T')[0],
    };

    try {
      let savedDon: Donation;
      if (isMySqlLive) {
        savedDon = await MySqlService.createDonation(donData);
        // Create in-app notification
        await MySqlService.createNotification({
          recipientEmail: donorEmail,
          title: '❤️ Quyên góp thành công! Cảm ơn tấm lòng của bạn',
          message: `PawFund đã nhận được số tiền ${Number(amount).toLocaleString('vi-VN')} VNĐ từ bạn. Tấm lòng của bạn tiếp thêm sức sống cho các bé thú cưng!`,
          type: 'donation',
        });
      } else {
        savedDon = {
          donationId: `DON-${Date.now()}`,
          donorName: donData.donorName!,
          donorEmail: donData.donorEmail,
          amount: donData.amount!,
          target: donData.target,
          message: donData.message,
          paymentMethod: donData.paymentMethod || 'VietQR',
          date: donData.date!,
        };
        memoryDonations.unshift(savedDon);
        memoryNotifications.unshift({
          notificationId: `NOTIF-${Date.now()}`,
          recipientEmail: donorEmail,
          title: '❤️ Quyên góp thành công! Cảm ơn tấm lòng của bạn',
          message: `PawFund đã nhận được ${Number(amount).toLocaleString('vi-VN')} VNĐ từ bạn.`,
          type: 'donation',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Send real email receipt if donor email was provided
      let emailResult = { sent: false, provider: 'None' };
      if (donorEmail) {
        emailResult = await sendRealEmail({
          to: donorEmail,
          subject: '❤️ Thư cảm ơn quyên góp từ Trạm cứu hộ PawFund',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #e11d48;">Cảm Ơn Tấm Lòng Vàng Của Bạn! ❤️</h2>
              <p>Xin chào <strong>${donorName}</strong>,</p>
              <p>Trạm cứu hộ PawFund xin trân trọng ghi nhận khoản đóng góp trị giá <strong>${Number(amount).toLocaleString('vi-VN')} VNĐ</strong> từ bạn.</p>
              <p>Mục đích quyên góp: <em>${donData.target}</em></p>
              <p>Mọi đóng góp của bạn đều được chuyển thẳng vào quỹ mua thức ăn, thuốc men và viện phí cứu hộ cho các bé chó mèo bị bỏ rơi.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">PawFund Animal Rescue & Foster Network</p>
            </div>
          `,
        });
      }

      // WebSocket broadcast donation & notification
      broadcastWsEvent('donation:created', savedDon);
      if (donorEmail) {
        broadcastWsEvent('notification:new', {
          recipientEmail: donorEmail,
          title: '❤️ Quyên góp thành công! Cảm ơn tấm lòng của bạn',
          message: `PawFund đã nhận được ${Number(amount).toLocaleString('vi-VN')} VNĐ từ bạn.`,
          type: 'donation',
          createdAt: new Date().toISOString(),
        });
      }

      res.status(201).json({ donation: savedDon, emailResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 8. IN-APP WEB NOTIFICATIONS
  // ==========================================
  app.get('/api/notifications', async (req, res) => {
    const { email } = req.query;
    try {
      if (isMySqlLive) {
        const notifs = await MySqlService.getNotifications(email ? String(email) : undefined);
        return res.json(notifs);
      }
      let list = memoryNotifications;
      if (email) {
        list = list.filter((n) => !n.recipientEmail || n.recipientEmail.toLowerCase() === String(email).toLowerCase());
      }
      return res.json(list);
    } catch (err: any) {
      return res.json(memoryNotifications);
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
      if (isMySqlLive) {
        await MySqlService.markNotificationRead(id);
      } else {
        const notif = memoryNotifications.find((n) => n.notificationId === id);
        if (notif) notif.isRead = true;
      }
      broadcastWsEvent('notification:read', { notificationId: id });
      res.json({ success: true, notificationId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 9. SHELTERS & UTILS
  // ==========================================
  app.get('/api/shelters', async (_req, res) => {
    try {
      if (isMySqlLive) {
        const sh = await MySqlService.getShelters();
        return res.json(sh);
      }
      return res.json(memoryShelters);
    } catch (err: any) {
      return res.json(memoryShelters);
    }
  });

  app.post('/api/upload', (req, res) => {
    const { dataUrl, fileName, fileSize, mimeType } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'Không nhận được dữ liệu hình ảnh' });
    }
    res.json({
      imageId: `IMG-${Date.now()}`,
      imageUrl: dataUrl,
      fileName: fileName || 'uploaded_image.jpg',
      fileSize: fileSize || 0,
      mimeType: mimeType || 'image/jpeg',
      uploadSource: 'LocalUpload',
      uploadedAt: new Date().toISOString(),
    });
  });

  // ==========================================
  // 10. VITE SPA MIDDLEWARE / PRODUCTION STATIC
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PawFund Server running with WebSocket on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
