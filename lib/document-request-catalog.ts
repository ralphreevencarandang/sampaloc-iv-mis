export type DocumentFieldOption = {
  label: string
  value: string
}

export type DocumentFieldDefinition = {
  name:
    | 'clearanceFor'
    | 'assistanceProgram'
    | 'yearsOfResidency'
    | 'cedulaYear'
    | 'annualIncome'
    | 'emergencyContactName'
    | 'emergencyContactNumber'
    | 'schoolOrTraining'
    | 'targetEmployer'
  label: string
  type: 'text' | 'tel' | 'number' | 'select'
  placeholder?: string
  required?: boolean
  description?: string
  options?: DocumentFieldOption[]
}

export type DocumentTypeDefinition = {
  id: 'clearance' | 'indigency' | 'residency' | 'cedula' | 'barangay-id' | 'first-time-job-seeker'
  label: string
  shortLabel: string
  description: string
  badge: string
  fields: DocumentFieldDefinition[]
}

export const documentTypeCatalog: DocumentTypeDefinition[] = [
  {
    id: 'clearance',
    label: 'Barangay Clearance',
    shortLabel: 'Clearance',
    description: 'For employment, business permits, travel, or similar official transactions.',
    badge: 'Most requested',
    fields: [
      {
        name: 'clearanceFor',
        label: 'Clearance For',
        type: 'select',
        required: true,
        options: [
          { label: 'Employment', value: 'employment' },
          { label: 'Business Permit', value: 'business-permit' },
          { label: 'Travel', value: 'travel' },
          { label: 'Scholarship', value: 'scholarship' },
          { label: 'Other', value: 'other' },
        ],
      },
    ],
  },
  {
    id: 'indigency',
    label: 'Certificate of Indigency',
    shortLabel: 'Indigency',
    description: 'For medical, educational, burial, or social assistance applications.',
    badge: 'Assistance',
    fields: [
      {
        name: 'assistanceProgram',
        label: 'Assistance Program / Institution',
        type: 'text',
        required: true,
        placeholder: 'e.g. Hospital bill assistance, scholarship office',
      },
    ],
  },
  {
    id: 'residency',
    label: 'Certificate of Residency',
    shortLabel: 'Residency',
    description: 'Proof of current address and duration of stay in Sampaloc IV.',
    badge: 'Address proof',
    fields: [
      {
        name: 'yearsOfResidency',
        label: 'Years of Residency',
        type: 'number',
        required: true,
        placeholder: 'Enter total years living in the barangay',
      },
    ],
  },
  {
    id: 'cedula',
    label: 'Cedula Request',
    shortLabel: 'Cedula',
    description: 'Personal community tax certificate request details.',
    badge: 'Tax record',
    fields: [
      {
        name: 'cedulaYear',
        label: 'Cedula Year',
        type: 'number',
        required: true,
        placeholder: 'e.g. 2026',
      },
      {
        name: 'annualIncome',
        label: 'Annual Income',
        type: 'text',
        required: true,
        placeholder: 'e.g. 180000',
      },
    ],
  },
  {
    id: 'barangay-id',
    label: 'Barangay ID',
    shortLabel: 'Barangay ID',
    description: 'Request a barangay ID with emergency contact information.',
    badge: 'ID card',
    fields: [
      {
        name: 'emergencyContactName',
        label: 'Emergency Contact Name',
        type: 'text',
        required: true,
        placeholder: 'Enter contact person',
      },
      {
        name: 'emergencyContactNumber',
        label: 'Emergency Contact Number',
        type: 'tel',
        required: true,
        placeholder: '09XXXXXXXXX',
      },
    ],
  },
  {
    id: 'first-time-job-seeker',
    label: 'First Time Job Seeker Certificate',
    shortLabel: 'Job Seeker',
    description: 'For first-time applicants requesting employment-related barangay certification.',
    badge: 'Employment',
    fields: [
      {
        name: 'schoolOrTraining',
        label: 'School / Training Background',
        type: 'text',
        required: true,
        placeholder: 'Enter your latest school or training program',
      },
      {
        name: 'targetEmployer',
        label: 'Target Employer / Industry',
        type: 'text',
        required: true,
        placeholder: 'Enter target employer or industry',
      },
    ],
  },
]

export function getDocumentDefinition(documentType: string) {
  return documentTypeCatalog.find((item) => item.id === documentType)
}
