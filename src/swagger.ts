/**
 * OpenAPI 3.0 specification for PawFund Pet Rescue & Foster Matcher API
 * Served at GET /api/docs via swagger-ui-express
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PawFund Pet Rescue & Foster Matcher API',
    version: '1.0.0',
    description:
      'RESTful API for the PawFund web application. Supports pet listings, adoption applications, care logs, donations, AI-powered pet matching (Gemini), and real-time WebSocket notifications.',
    contact: {
      name: 'PawFund Team',
      email: 'contact@pawfund.org',
    },
  },
  servers: [
    {
      url: process.env.APP_URL ? `${process.env.APP_URL}/api` : 'http://localhost:3000/api',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Local development server',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'User registration and login' },
    { name: 'Users', description: 'User profile management' },
    { name: 'Pets', description: 'Pet listings and medical records' },
    { name: 'Applications', description: 'Adoption & foster applications' },
    { name: 'Care Logs', description: 'Post-adoption pet care updates' },
    { name: 'Donations', description: 'Shelter donation processing' },
    { name: 'Shelters', description: 'Rescue shelter information' },
    { name: 'Notifications', description: 'In-app notification system' },
    { name: 'AI Matchmaker', description: 'Gemini AI-powered pet matching' },
    { name: 'Upload', description: 'Image file upload' },
    { name: 'Database', description: 'MySQL connection management' },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: 'USR-1234567890' },
          username: { type: 'string', example: 'janedoe' },
          fullName: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          phone: { type: 'string', example: '0909123456' },
          address: { type: 'string', example: '123 Main St, Hanoi' },
          role: { type: 'string', enum: ['Adopter', 'RescueStaff', 'Admin'] },
          avatarUrl: { type: 'string', example: 'https://...' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pet: {
        type: 'object',
        properties: {
          petId: { type: 'string', example: 'PET-001' },
          name: { type: 'string', example: 'Buddy' },
          species: { type: 'string', enum: ['Dog', 'Cat', 'Other'] },
          breed: { type: 'string', example: 'Golden Retriever' },
          ageMonths: { type: 'integer', example: 18 },
          gender: { type: 'string', enum: ['Male', 'Female'] },
          healthStatus: { type: 'string', example: 'Healthy' },
          vaccinated: { type: 'boolean' },
          sterilized: { type: 'boolean' },
          adoptionStatus: { type: 'string', enum: ['Pending', 'Ready', 'Adopted', 'Fostered'] },
          energyLevel: { type: 'string', enum: ['Low', 'Medium', 'High'] },
          requiresYard: { type: 'boolean' },
          goodWithKids: { type: 'boolean' },
          goodWithPets: { type: 'boolean' },
          description: { type: 'string' },
          shelterId: { type: 'string', example: 'SHL-01' },
          imageUrl: { type: 'string' },
          images: { type: 'array', items: { $ref: '#/components/schemas/PetImage' } },
          medicalRecords: { type: 'array', items: { $ref: '#/components/schemas/PetMedicalRecord' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PetImage: {
        type: 'object',
        properties: {
          imageId: { type: 'string' },
          petId: { type: 'string' },
          imageUrl: { type: 'string' },
          isPrimary: { type: 'boolean' },
          fileName: { type: 'string' },
          fileSize: { type: 'integer' },
          mimeType: { type: 'string' },
          uploadSource: { type: 'string', enum: ['LocalUpload', 'ExternalURL'] },
        },
      },
      PetMedicalRecord: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          petId: { type: 'string' },
          medicalDate: { type: 'string', format: 'date', example: '2026-11-01' },
          diagnosis: { type: 'string', example: 'Skin infection' },
          treatment: { type: 'string', example: 'Antibiotics prescribed' },
          vetName: { type: 'string', example: 'Dr. Minh' },
          medications: { type: 'string', example: 'Amoxicillin 250mg' },
          nextFollowUp: { type: 'string', format: 'date' },
        },
      },
      Shelter: {
        type: 'object',
        properties: {
          shelterId: { type: 'string', example: 'SHL-01' },
          shelterName: { type: 'string', example: 'PawFund Animal Rescue Shelter' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          capacity: { type: 'integer' },
          currentPetsCount: { type: 'integer' },
          bankAccount: { type: 'string' },
          bankName: { type: 'string' },
          imageUrl: { type: 'string' },
        },
      },
      AdoptionApplication: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', example: 'APP-1234567890' },
          petId: { type: 'string', example: 'PET-001' },
          userId: { type: 'string' },
          applicantName: { type: 'string', example: 'Jane Doe' },
          applicantEmail: { type: 'string', format: 'email' },
          applicantPhone: { type: 'string' },
          applicantAddress: { type: 'string' },
          housingType: { type: 'string', example: 'Apartment / Condo' },
          hasYard: { type: 'boolean' },
          hasChildren: { type: 'boolean' },
          otherPets: { type: 'string' },
          petExperience: { type: 'string' },
          status: { type: 'string', enum: ['Pending', 'Approved', 'Rejected'] },
          adminNotes: { type: 'string' },
          submittedAt: { type: 'string', format: 'date-time' },
          reviewedAt: { type: 'string', format: 'date-time' },
          petName: { type: 'string' },
          petSpecies: { type: 'string' },
        },
      },
      CareLog: {
        type: 'object',
        properties: {
          logId: { type: 'string' },
          petId: { type: 'string' },
          userId: { type: 'string' },
          authorName: { type: 'string' },
          logDate: { type: 'string', format: 'date' },
          notes: { type: 'string' },
          imageUrl: { type: 'string' },
          healthUpdate: { type: 'string' },
          mood: { type: 'string', example: 'Playful & Energetic' },
          weightKg: { type: 'number', format: 'float', example: 12.5 },
          petName: { type: 'string' },
        },
      },
      Donation: {
        type: 'object',
        properties: {
          donationId: { type: 'string' },
          userId: { type: 'string' },
          donorName: { type: 'string', example: 'John Smith' },
          donorEmail: { type: 'string', format: 'email' },
          amount: { type: 'number', example: 500000 },
          paymentMethod: { type: 'string', example: 'VietQR' },
          target: { type: 'string', example: 'Medical & food rescue fund' },
          message: { type: 'string' },
          date: { type: 'string', format: 'date' },
        },
      },
      InAppNotification: {
        type: 'object',
        properties: {
          notificationId: { type: 'string' },
          userId: { type: 'string' },
          recipientEmail: { type: 'string', format: 'email' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['adoption', 'donation', 'pet', 'system'] },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AiMatchResult: {
        type: 'object',
        properties: {
          petId: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          reason: { type: 'string' },
          pet: { $ref: '#/components/schemas/Pet' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Descriptive error message' },
        },
      },
    },
  },
  paths: {
    // ─── AUTH ─────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new adopter account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string', example: 'Jane Doe' },
                  username: { type: 'string', pattern: '^[A-Za-z0-9_.]{3,30}$', example: 'janedoe', description: 'Unique username (3-30 chars: letters, numbers, _ or .). Defaults to the email prefix if omitted.' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  confirmPassword: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error or duplicate email', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/username and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
              examples: {
                adminLogin: { summary: 'Admin login', value: { email: 'adminstaff@pawfund.org', password: 'adminstaff123@' } },
                adopterLogin: { summary: 'Adopter login', value: { email: 'jane@example.com', password: 'secret123' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing credentials' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    // ─── USERS ────────────────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get all users',
        responses: {
          200: { description: 'List of users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
        },
      },
    },
    '/users/{userId}/avatar': {
      put: {
        tags: ['Users'],
        summary: 'Update user profile avatar',
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['avatarUrl'], properties: { avatarUrl: { type: 'string', description: 'Base64 data URL or external image URL' } } },
            },
          },
        },
        responses: {
          200: { description: 'Avatar updated' },
          400: { description: 'Missing avatarUrl' },
          404: { description: 'User not found' },
        },
      },
    },
    // ─── PETS ─────────────────────────────────────────────────────────
    '/pets': {
      get: {
        tags: ['Pets'],
        summary: 'List all pets with optional filters',
        parameters: [
          { in: 'query', name: 'species', schema: { type: 'string', enum: ['Dog', 'Cat', 'Other', 'all'] } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['Ready', 'Pending', 'Adopted', 'Fostered', 'all'] } },
          { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Full-text search on name, breed, description' },
          { in: 'query', name: 'goodWithKids', schema: { type: 'boolean' } },
          { in: 'query', name: 'requiresYard', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'Filtered pet list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } } } } },
        },
      },
      post: {
        tags: ['Pets'],
        summary: 'Create a new pet listing (Admin/RescueStaff only)',
        parameters: [{ in: 'header', name: 'x-user-role', required: true, schema: { type: 'string', enum: ['Admin', 'RescueStaff'] } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'species'],
                properties: {
                  name: { type: 'string', example: 'Buddy' },
                  species: { type: 'string', example: 'Dog' },
                  breed: { type: 'string' },
                  ageMonths: { type: 'integer' },
                  gender: { type: 'string', enum: ['Male', 'Female'] },
                  healthStatus: { type: 'string' },
                  vaccinated: { type: 'boolean' },
                  sterilized: { type: 'boolean' },
                  adoptionStatus: { type: 'string' },
                  energyLevel: { type: 'string' },
                  requiresYard: { type: 'boolean' },
                  goodWithKids: { type: 'boolean' },
                  goodWithPets: { type: 'boolean' },
                  description: { type: 'string' },
                  shelterId: { type: 'string' },
                  imageUrl: { type: 'string', description: 'Base64 data URL from /api/upload' },
                  initialDiagnosis: { type: 'string' },
                  initialTreatment: { type: 'string' },
                  vetName: { type: 'string' },
                  medications: { type: 'string' },
                  medicalDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Pet created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
          400: { description: 'Missing required fields' },
          403: { description: 'Forbidden — Admin/RescueStaff only' },
        },
      },
    },
    '/pets/{id}': {
      get: {
        tags: ['Pets'],
        summary: 'Get a pet by ID',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Pet details with images and medical records', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
          404: { description: 'Pet not found' },
        },
      },
      put: {
        tags: ['Pets'],
        summary: 'Update a pet',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'header', name: 'x-user-role', schema: { type: 'string', enum: ['Admin', 'RescueStaff'] } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
        responses: { 200: { description: 'Updated pet' }, 404: { description: 'Pet not found' } },
      },
      delete: {
        tags: ['Pets'],
        summary: 'Delete a pet',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Pet deleted' }, 500: { description: 'Error' } },
      },
    },
    '/pets/{id}/medical': {
      post: {
        tags: ['Pets'],
        summary: 'Add a medical record to a pet (blocked if pet is already Adopted)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  medicalDate: { type: 'string', format: 'date' },
                  diagnosis: { type: 'string' },
                  treatment: { type: 'string' },
                  vetName: { type: 'string' },
                  medications: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Medical record added', content: { 'application/json': { schema: { $ref: '#/components/schemas/PetMedicalRecord' } } } },
          400: { description: 'Pet already adopted — records frozen' },
          404: { description: 'Pet not found' },
        },
      },
    },
    // ─── APPLICATIONS ─────────────────────────────────────────────────
    '/applications': {
      get: {
        tags: ['Applications'],
        summary: 'Get all adoption applications',
        responses: { 200: { description: 'List of applications', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdoptionApplication' } } } } } },
      },
      post: {
        tags: ['Applications'],
        summary: 'Submit a new adoption application',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'applicantName', 'applicantEmail'],
                properties: {
                  petId: { type: 'string' },
                  userId: { type: 'string' },
                  applicantName: { type: 'string' },
                  applicantEmail: { type: 'string', format: 'email' },
                  applicantPhone: { type: 'string' },
                  applicantAddress: { type: 'string' },
                  housingType: { type: 'string' },
                  hasYard: { type: 'boolean' },
                  hasChildren: { type: 'boolean' },
                  otherPets: { type: 'string' },
                  petExperience: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Application submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdoptionApplication' } } } },
          400: { description: 'Validation error / duplicate application / pet already adopted' },
          404: { description: 'Pet not found' },
        },
      },
    },
    '/applications/{id}/status': {
      put: {
        tags: ['Applications'],
        summary: 'Approve or reject an application (Admin only)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['Approved', 'Rejected'] },
                  adminNotes: { type: 'string', example: 'Great match! Please visit shelter by Nov 10.' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Status updated. If Approved: pet auto-set to Adopted, email sent, notifications created.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    applicationId: { type: 'string' },
                    status: { type: 'string' },
                    inAppNotificationCreated: { type: 'boolean' },
                    emailDelivery: { type: 'object', properties: { sent: { type: 'boolean' }, provider: { type: 'string' } } },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid status value' },
          404: { description: 'Application not found' },
        },
      },
    },
    // ─── CARE LOGS ────────────────────────────────────────────────────
    '/care-logs': {
      get: {
        tags: ['Care Logs'],
        summary: 'Get care logs (optionally filter by pet)',
        parameters: [{ in: 'query', name: 'petId', schema: { type: 'string' }, description: 'Filter logs for a specific pet' }],
        responses: { 200: { description: 'List of care logs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CareLog' } } } } } },
      },
      post: {
        tags: ['Care Logs'],
        summary: 'Post a care log update for an adopted pet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'notes'],
                properties: {
                  petId: { type: 'string' },
                  userId: { type: 'string' },
                  authorName: { type: 'string' },
                  logDate: { type: 'string', format: 'date' },
                  notes: { type: 'string' },
                  imageUrl: { type: 'string' },
                  healthUpdate: { type: 'string' },
                  mood: { type: 'string' },
                  weightKg: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Care log created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CareLog' } } } },
          400: { description: 'Missing required fields' },
          404: { description: 'Pet not found' },
        },
      },
    },
    // ─── DONATIONS ────────────────────────────────────────────────────
    '/donations': {
      get: {
        tags: ['Donations'],
        summary: 'Get donations (filter by userId or email)',
        parameters: [
          { in: 'query', name: 'userId', schema: { type: 'string' } },
          { in: 'query', name: 'email', schema: { type: 'string', format: 'email' } },
        ],
        responses: { 200: { description: 'List of donations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Donation' } } } } } },
      },
      post: {
        tags: ['Donations'],
        summary: 'Submit a donation (sends receipt email)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  donorName: { type: 'string' },
                  donorEmail: { type: 'string', format: 'email' },
                  userId: { type: 'string' },
                  shelterId: { type: 'string' },
                  amount: { type: 'number', minimum: 1 },
                  paymentMethod: { type: 'string', example: 'VietQR' },
                  target: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Donation recorded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    donation: { $ref: '#/components/schemas/Donation' },
                    emailResult: { type: 'object', properties: { sent: { type: 'boolean' }, provider: { type: 'string' } } },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid amount' },
        },
      },
    },
    // ─── SHELTERS ─────────────────────────────────────────────────────
    '/shelters': {
      get: {
        tags: ['Shelters'],
        summary: 'Get all registered shelters',
        responses: { 200: { description: 'Shelter list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Shelter' } } } } } },
      },
    },
    // ─── NOTIFICATIONS ────────────────────────────────────────────────
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get in-app notifications for a user',
        parameters: [{ in: 'query', name: 'email', schema: { type: 'string', format: 'email' }, description: 'Filter notifications by recipient email' }],
        responses: { 200: { description: 'Notification list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/InAppNotification' } } } } } },
      },
    },
    '/notifications/{id}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Notification marked as read' } },
      },
    },
    // ─── AI MATCHMAKER ────────────────────────────────────────────────
    '/match-pet': {
      post: {
        tags: ['AI Matchmaker'],
        summary: 'AI-powered pet matching using Gemini 2.5 Flash (falls back to rule engine)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lifestyleDescription'],
                properties: {
                  lifestyleDescription: { type: 'string', example: 'I live in an apartment, work from home, love quiet evenings' },
                  speciesPreference: { type: 'string', enum: ['Dog', 'Cat', 'All'] },
                  livingSpace: { type: 'string', enum: ['Apartment', 'HouseWithYard', 'Rented'] },
                  familyWithKids: { type: 'boolean' },
                  hasOtherPets: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Match results ranked by compatibility score',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    matches: { type: 'array', items: { $ref: '#/components/schemas/AiMatchResult' } },
                    poweredBy: { type: 'string', enum: ['Gemini 2.5 Flash', 'Rule Engine'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ─── UPLOAD ───────────────────────────────────────────────────────
    '/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload a base64 image for pets, care logs, or avatars',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dataUrl'],
                properties: {
                  dataUrl: { type: 'string', description: 'Base64 data URL (e.g. data:image/jpeg;base64,...)' },
                  fileName: { type: 'string', example: 'buddy.jpg' },
                  fileSize: { type: 'integer' },
                  mimeType: { type: 'string', example: 'image/jpeg' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Upload metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    imageId: { type: 'string' },
                    imageUrl: { type: 'string' },
                    fileName: { type: 'string' },
                    fileSize: { type: 'integer' },
                    mimeType: { type: 'string' },
                    uploadSource: { type: 'string' },
                    uploadedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          400: { description: 'No image data' },
        },
      },
    },
    // ─── MYSQL STATUS ─────────────────────────────────────────────────
    '/mysql/status': {
      get: {
        tags: ['Database'],
        summary: 'Get MySQL connection status',
        responses: {
          200: {
            description: 'Connection status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isConnected: { type: 'boolean' },
                    lastChecked: { type: 'string', format: 'date-time' },
                    serverVersion: { type: 'string' },
                    latencyMs: { type: 'integer' },
                    tablesCount: { type: 'integer' },
                    config: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mysql/test': {
      post: {
        tags: ['Database'],
        summary: 'Test MySQL connection (optionally with new config)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  host: { type: 'string' },
                  port: { type: 'integer' },
                  user: { type: 'string' },
                  password: { type: 'string' },
                  database: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Connection test result' } },
      },
    },
    '/mysql/init-schema': {
      post: {
        tags: ['Database'],
        summary: 'Initialize / migrate the MySQL schema (creates all tables)',
        responses: { 200: { description: 'Schema initialized' } },
      },
    },
    '/ws/status': {
      get: {
        tags: ['Database'],
        summary: 'Get WebSocket server status',
        responses: {
          200: {
            description: 'WebSocket stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    onlineClients: { type: 'integer' },
                    status: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
