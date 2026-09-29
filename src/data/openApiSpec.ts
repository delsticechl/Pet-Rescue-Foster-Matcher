// OpenAPI 3.0.0 Specification for PawFund Pet Rescue & Foster Matcher API
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PawFund Pet Rescue & Foster Platform RESTful API',
    version: '1.0.0',
    description:
      'Standard RESTful API compliant with OpenAPI 3.0.0, Level 3 Richardson Maturity Model, 3NF Relational Integrity, and ACID Transactions. Provides resources for Pet Profiles, Rescue Shelters, Adoption Applications, Clinical Records, Post-Adoption Care Logs, Donations, and Health Vaccine Reminders.',
    contact: {
      name: 'PawFund Platform Architecture Team',
      email: 'api-support@pawfund.org',
      url: 'https://pawfund.org',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API v1 Base Path',
    },
    {
      url: '/api',
      description: 'Legacy Direct Base Path (Backwards Compatible)',
    },
  ],
  tags: [
    { name: 'Service Root', description: 'API Discovery, HATEOAS index & service health' },
    { name: 'Pets', description: 'Animal rescue profiles, attributes, and image gallery management' },
    { name: 'Shelters', description: 'Animal shelter facilities, capacities, and intake metrics' },
    { name: 'Applications', description: 'Adoption applications lifecycle & ACID transactional approvals' },
    { name: 'Clinical & Health Reminders', description: 'Veterinary health records, vaccine schedules, and reminder audits' },
    { name: 'Care Logs', description: 'Post-adoption check-ins, recovery notes, and wellness tracking' },
    { name: 'Donations', description: 'Financial support contributions and transparent fund allocation' },
    { name: 'Users & Auth', description: 'Adopters, Shelter Staff, and Administrators user accounts' },
    { name: 'Media Uploads', description: 'Device file upload storage (PNG/JPG/WEBP with Base64 & metadata)' },
    { name: 'SQL & Stored Procedures', description: 'Direct Stored Procedure invocations and SQL view queries' },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Service Root'],
        summary: 'Root Service Discovery (HATEOAS Index)',
        description: 'Returns top-level links to all available REST collections in compliance with HATEOAS.',
        responses: {
          '200': {
            description: 'API root collection manifest',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'PawFund RESTful API' },
                    version: { type: 'string', example: '1.0.0' },
                    description: { type: 'string' },
                    status: { type: 'string', example: 'HEALTHY' },
                    _links: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Service Root'],
        summary: 'Health Check Probe',
        description: 'Returns service uptime, server timestamp, and database connectivity status.',
        responses: {
          '200': {
            description: 'Server is healthy and accepting requests',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptimeSeconds: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pets': {
      get: {
        tags: ['Pets'],
        summary: 'List and Filter Pets',
        description:
          'Retrieve paginated pet records with multi-criteria filtering by species, energy level, adoption status, and search keywords. Includes pagination headers (X-Total-Count, X-Page, X-Limit).',
        parameters: [
          { name: 'species', in: 'query', description: 'Filter by species (Dog, Cat, Other)', schema: { type: 'string', enum: ['Dog', 'Cat', 'Other', 'all'] } },
          { name: 'status', in: 'query', description: 'Filter by adoption status (Ready, Adopted, Fostered, Pending)', schema: { type: 'string', enum: ['Ready', 'Adopted', 'Fostered', 'Pending', 'all'] } },
          { name: 'shelterId', in: 'query', description: 'Filter by rescue shelter ID (e.g. SHELTER-001)', schema: { type: 'string' } },
          { name: 'search', in: 'query', description: 'Fuzzy search by name, breed, or description', schema: { type: 'string' } },
          { name: 'energyLevel', in: 'query', description: 'Energy level (Low, Medium, High)', schema: { type: 'string' } },
          { name: 'goodWithKids', in: 'query', description: 'Filter for child-friendly pets', schema: { type: 'boolean' } },
          { name: 'vaccinated', in: 'query', description: 'Filter for vaccinated pets', schema: { type: 'boolean' } },
          { name: 'sterilized', in: 'query', description: 'Filter for neutered/spayed pets', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', description: 'Page number (default: 1)', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', description: 'Records per page (default: 50)', schema: { type: 'integer', default: 50 } },
          { name: 'sort', in: 'query', description: 'Field to sort by (createdAt, ageMonths, name)', schema: { type: 'string', default: 'createdAt' } },
          { name: 'order', in: 'query', description: 'Sort direction (asc or desc)', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': {
            description: 'List of matching pet profiles',
            headers: {
              'X-Total-Count': { schema: { type: 'integer' }, description: 'Total number of items matching filters' },
              'X-Page': { schema: { type: 'integer' }, description: 'Current page number' },
              'X-Limit': { schema: { type: 'integer' }, description: 'Limit per page' },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Pets'],
        summary: 'Create New Pet Profile',
        description: 'Publish a new rescued pet into the PETS table. Restricted to Administrator or Shelter Staff.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PetInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pet successfully created in database',
            headers: {
              Location: { schema: { type: 'string' }, description: 'URI of newly created pet resource' },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
          '400': { description: 'Missing required fields or invalid data payload' },
          '403': { description: 'Forbidden: Requires Administrator privileges' },
        },
      },
    },
    '/pets/{id}': {
      get: {
        tags: ['Pets'],
        summary: 'Get Pet by ID',
        description: 'Retrieve full pet details including populated shelter info, image gallery, and medical history.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID (e.g. PET-001)', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Pet profile found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
            },
          },
          '404': { description: 'Pet not found' },
        },
      },
      put: {
        tags: ['Pets'],
        summary: 'Replace/Full Update Pet Profile',
        description: 'Completely replaces an existing pet profile with new attributes.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PetInput' } },
          },
        },
        responses: {
          '200': { description: 'Pet updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
          '404': { description: 'Pet not found' },
          '403': { description: 'Forbidden' },
        },
      },
      patch: {
        tags: ['Pets'],
        summary: 'Partial Update Pet Profile',
        description: 'Modifies specific attributes of a pet without overwriting the entire resource.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { type: 'object' } },
          },
        },
        responses: {
          '200': { description: 'Pet patched successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
          '404': { description: 'Pet not found' },
        },
      },
      delete: {
        tags: ['Pets'],
        summary: 'Delete Pet Record',
        description: 'Permanently deletes a pet record and cascades associated media records.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Pet deleted successfully' },
          '404': { description: 'Pet not found' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/pets/{id}/medical-records': {
      get: {
        tags: ['Clinical & Health Reminders'],
        summary: 'Get Medical Records of Pet',
        description: 'Returns clinical treatment timeline and vaccination history for a specific pet.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of medical records',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/PetMedicalRecord' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Clinical & Health Reminders'],
        summary: 'Add Medical Record for Pet',
        description: 'Appends a diagnosis, treatment, vaccines administered, and scheduled follow-up examination.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Pet ID', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PetMedicalRecordInput' } },
          },
        },
        responses: {
          '201': {
            description: 'Clinical record created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PetMedicalRecord' } } },
          },
          '404': { description: 'Pet not found' },
        },
      },
    },
    '/shelters': {
      get: {
        tags: ['Shelters'],
        summary: 'List All Shelters',
        description: 'Returns all accredited rescue facilities with live animal counts and capacity metrics.',
        responses: {
          '200': {
            description: 'List of rescue shelters',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Shelter' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Shelters'],
        summary: 'Register a New Rescue Shelter',
        description: 'Inserts a shelter entity into the SHELTERS table.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['shelterName', 'address', 'phone', 'email', 'managerId'],
                properties: {
                  shelterName: { type: 'string' },
                  address: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  managerId: { type: 'string' },
                  capacity: { type: 'integer', default: 50 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Shelter registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shelter' } } } },
        },
      },
    },
    '/shelters/{id}': {
      get: {
        tags: ['Shelters'],
        summary: 'Get Shelter by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Shelter details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shelter' } } } },
          '404': { description: 'Shelter not found' },
        },
      },
    },
    '/shelters/{id}/pets': {
      get: {
        tags: ['Shelters', 'Pets'],
        summary: 'List Pets at Shelter',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of pets residing at shelter', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } } } } },
        },
      },
    },
    '/applications': {
      get: {
        tags: ['Applications'],
        summary: 'List Adoption Applications',
        description: 'Filter adoption applications by status, applicant user ID, or rescue shelter.',
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'shelterId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Submitted', 'Interviewing', 'Approved', 'Rejected', 'All'] } },
        ],
        responses: {
          '200': {
            description: 'List of adoption applications',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdoptionApplication' } } } },
          },
        },
      },
      post: {
        tags: ['Applications'],
        summary: 'Submit Adoption Application',
        description: 'Submits a new adoption application. Evaluates SQL Trigger trg_CheckPetNotAdoptedBeforeApply.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AdoptionApplicationInput' } },
          },
        },
        responses: {
          '201': {
            description: 'Application successfully created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdoptionApplication' } } },
          },
          '400': { description: 'Pet already adopted or validation constraint failed' },
        },
      },
    },
    '/applications/{id}': {
      get: {
        tags: ['Applications'],
        summary: 'Get Application Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Application found', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdoptionApplication' } } } },
          '404': { description: 'Application not found' },
        },
      },
      patch: {
        tags: ['Applications'],
        summary: 'Update Application Status & ACID Transaction',
        description:
          'Updates application status (Submitted, Interviewing, Approved, Rejected). When approved, executes ACID SQL Transaction to update pet status to Adopted and auto-reject competing applications.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['Submitted', 'Interviewing', 'Approved', 'Rejected'] },
                  interviewTime: { type: 'string', format: 'date-time' },
                  staffNotes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated and transaction committed' },
          '404': { description: 'Application not found' },
        },
      },
    },
    '/care-logs': {
      get: {
        tags: ['Care Logs'],
        summary: 'List Post-Adoption Care Logs',
        parameters: [
          { name: 'petId', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of care logs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CareLog' } } } } },
        },
      },
      post: {
        tags: ['Care Logs'],
        summary: 'Create Care Log Entry',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CareLogInput' } } },
        },
        responses: {
          '201': { description: 'Care log saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/CareLog' } } } },
        },
      },
    },
    '/donations': {
      get: {
        tags: ['Donations'],
        summary: 'List Donations',
        responses: {
          '200': { description: 'List of donations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Donation' } } } } },
        },
      },
      post: {
        tags: ['Donations'],
        summary: 'Create Donation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['shelterId', 'amount'],
                properties: {
                  shelterId: { type: 'string' },
                  amount: { type: 'number' },
                  paymentMethod: { type: 'string' },
                  donorName: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Donation recorded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Donation' } } } },
        },
      },
    },
    '/health-reminders': {
      get: {
        tags: ['Clinical & Health Reminders'],
        summary: 'Get Health Reminders & Booster Schedule',
        description: 'Computes urgency windows (Overdue, Today, Urgent in 7 days, Upcoming in 30 days) from PET_MEDICAL_RECORDS.',
        parameters: [
          { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['Overdue', 'Today', 'Urgent', 'Upcoming', 'All'] } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['Vaccination', 'PostOp', 'Deworming', 'GeneralCheckup', 'All'] } },
          { name: 'daysWindow', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Computed clinical reminders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reminders: { type: 'array', items: { $ref: '#/components/schemas/HealthReminder' } },
                    summary: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health-reminders/complete': {
      post: {
        tags: ['Clinical & Health Reminders'],
        summary: 'Mark Reminder Checkup as Completed',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['petId', 'recordId'],
                properties: {
                  petId: { type: 'string' },
                  recordId: { type: 'string' },
                  nextFollowUp: { type: 'string', format: 'date' },
                  newDiagnosis: { type: 'string' },
                  newTreatment: { type: 'string' },
                  vetName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Checkup updated' },
        },
      },
    },
    '/uploads': {
      post: {
        tags: ['Media Uploads'],
        summary: 'Upload Device Photo',
        description: 'Accepts Base64 image payload with file metadata and returns standardized image storage reference.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dataUrl'],
                properties: {
                  dataUrl: { type: 'string', description: 'Base64 Data URL' },
                  fileName: { type: 'string' },
                  fileSize: { type: 'integer' },
                  mimeType: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Image stored successfully',
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
                    uploadSource: { type: 'string', example: 'LocalUpload' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/sql/stored-procedure/match-pets': {
      post: {
        tags: ['SQL & Stored Procedures'],
        summary: 'Execute sp_MatchPetsForAdopter Stored Procedure',
        description: 'Invokes relational stored procedure to calculate compatibility scores based on adopter lifestyle.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  housingType: { type: 'string' },
                  hasYard: { type: 'boolean' },
                  hasChildren: { type: 'boolean' },
                  hasOtherPets: { type: 'boolean' },
                  species: { type: 'string' },
                  activityPreference: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Matched ranked pets' },
        },
      },
    },
    '/sql/views/shelter-stats': {
      get: {
        tags: ['SQL & Stored Procedures'],
        summary: 'Query vw_ShelterStatistics SQL View',
        description: 'Executes relational view aggregating intake, adoptions, capacities, and donation revenues.',
        responses: {
          '200': { description: 'View data results' },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        properties: {
          petId: { type: 'string', example: 'PET-001' },
          name: { type: 'string', example: 'Lucky' },
          species: { type: 'string', enum: ['Dog', 'Cat', 'Other'], example: 'Dog' },
          breed: { type: 'string', example: 'Golden Retriever Mix' },
          ageMonths: { type: 'integer', example: 14 },
          gender: { type: 'string', enum: ['Male', 'Female', 'Đực', 'Cái'], example: 'Male' },
          healthStatus: { type: 'string', example: 'Healthy' },
          vaccinated: { type: 'boolean', example: true },
          sterilized: { type: 'boolean', example: true },
          adoptionStatus: { type: 'string', enum: ['Ready', 'Adopted', 'Fostered', 'Pending'], example: 'Ready' },
          energyLevel: { type: 'string', enum: ['Low', 'Medium', 'High'], example: 'High' },
          requiresYard: { type: 'boolean', example: true },
          goodWithKids: { type: 'boolean', example: true },
          goodWithPets: { type: 'boolean', example: true },
          description: { type: 'string', example: 'Friendly and energetic companion.' },
          shelterId: { type: 'string', example: 'SHELTER-001' },
          shelterName: { type: 'string', example: 'Saigon Animal Rescue Station' },
          primaryImage: { type: 'string', example: 'https://images.unsplash.com/...' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                imageId: { type: 'string' },
                imageUrl: { type: 'string' },
                isPrimary: { type: 'boolean' },
                fileName: { type: 'string' },
                fileSize: { type: 'integer' },
                mimeType: { type: 'string' },
                uploadSource: { type: 'string', enum: ['LocalUpload', 'ExternalURL'] },
              },
            },
          },
          medicalRecords: {
            type: 'array',
            items: { $ref: '#/components/schemas/PetMedicalRecord' },
          },
        },
      },
      PetInput: {
        type: 'object',
        required: ['name', 'species', 'shelterId'],
        properties: {
          name: { type: 'string' },
          species: { type: 'string', enum: ['Dog', 'Cat', 'Other'] },
          breed: { type: 'string' },
          ageMonths: { type: 'integer' },
          gender: { type: 'string' },
          healthStatus: { type: 'string' },
          vaccinated: { type: 'boolean' },
          sterilized: { type: 'boolean' },
          energyLevel: { type: 'string' },
          requiresYard: { type: 'boolean' },
          goodWithKids: { type: 'boolean' },
          goodWithPets: { type: 'boolean' },
          description: { type: 'string' },
          shelterId: { type: 'string' },
          imageUrl: { type: 'string' },
          fileName: { type: 'string' },
          fileSize: { type: 'integer' },
          mimeType: { type: 'string' },
        },
      },
      Shelter: {
        type: 'object',
        properties: {
          shelterId: { type: 'string', example: 'SHELTER-001' },
          shelterName: { type: 'string', example: 'Saigon Animal Rescue Station' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          managerId: { type: 'string' },
          capacity: { type: 'integer' },
          currentPetsCount: { type: 'integer' },
        },
      },
      AdoptionApplication: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', example: 'APP-001' },
          petId: { type: 'string', example: 'PET-001' },
          userId: { type: 'string', example: 'USR-002' },
          type: { type: 'string', enum: ['Adopt', 'Foster'] },
          housingType: { type: 'string' },
          hasYard: { type: 'boolean' },
          status: { type: 'string', enum: ['Submitted', 'Interviewing', 'Approved', 'Rejected'] },
          appliedAt: { type: 'string', format: 'date-time' },
          interviewTime: { type: 'string' },
          staffNotes: { type: 'string' },
          applicantName: { type: 'string' },
          petName: { type: 'string' },
        },
      },
      AdoptionApplicationInput: {
        type: 'object',
        required: ['petId', 'userId'],
        properties: {
          petId: { type: 'string' },
          userId: { type: 'string' },
          type: { type: 'string', enum: ['Adopt', 'Foster'] },
          housingType: { type: 'string' },
          hasYard: { type: 'boolean' },
          experienceDescription: { type: 'string' },
          incomeMonthly: { type: 'string' },
          otherPets: { type: 'string' },
        },
      },
      PetMedicalRecord: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          petId: { type: 'string' },
          medicalDate: { type: 'string', format: 'date' },
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          vetName: { type: 'string' },
          nextFollowUp: { type: 'string', format: 'date' },
          medications: { type: 'string' },
          reminderStatus: { type: 'string', enum: ['Pending', 'Completed'] },
        },
      },
      PetMedicalRecordInput: {
        type: 'object',
        required: ['diagnosis', 'treatment'],
        properties: {
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          vetName: { type: 'string' },
          nextFollowUp: { type: 'string', format: 'date' },
          medications: { type: 'string' },
        },
      },
      CareLog: {
        type: 'object',
        properties: {
          logId: { type: 'string' },
          petId: { type: 'string' },
          userId: { type: 'string' },
          logDate: { type: 'string', format: 'date' },
          note: { type: 'string' },
          imageUrl: { type: 'string' },
          healthUpdate: { type: 'string' },
          weightKg: { type: 'number' },
          mood: { type: 'string' },
          petName: { type: 'string' },
          adopterName: { type: 'string' },
        },
      },
      CareLogInput: {
        type: 'object',
        required: ['petId', 'userId', 'note'],
        properties: {
          petId: { type: 'string' },
          userId: { type: 'string' },
          note: { type: 'string' },
          imageUrl: { type: 'string' },
          healthUpdate: { type: 'string' },
          weightKg: { type: 'number' },
          mood: { type: 'string' },
        },
      },
      Donation: {
        type: 'object',
        properties: {
          donationId: { type: 'string' },
          shelterId: { type: 'string' },
          amount: { type: 'number' },
          paymentMethod: { type: 'string' },
          transactionCode: { type: 'string' },
          donorName: { type: 'string' },
          message: { type: 'string' },
          donatedAt: { type: 'string', format: 'date-time' },
        },
      },
      HealthReminder: {
        type: 'object',
        properties: {
          reminderId: { type: 'string' },
          petId: { type: 'string' },
          petName: { type: 'string' },
          petSpecies: { type: 'string' },
          petBreed: { type: 'string' },
          petImage: { type: 'string' },
          shelterName: { type: 'string' },
          recordId: { type: 'string' },
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          vetName: { type: 'string' },
          dueDate: { type: 'string', format: 'date' },
          daysRemaining: { type: 'integer' },
          urgency: { type: 'string', enum: ['Overdue', 'Today', 'Urgent', 'Upcoming', 'Future'] },
          category: { type: 'string' },
          status: { type: 'string' },
        },
      },
      StandardError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'RESOURCE_NOT_FOUND' },
              message: { type: 'string', example: 'The requested resource was not found' },
              status: { type: 'integer', example: 404 },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
};
