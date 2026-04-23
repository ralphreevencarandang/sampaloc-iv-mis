export type DocumentFieldOption = {
  label: string
  value: string
}

export type DocumentFieldDefinition = {
  name:
    | 'yearsOfResidency'
    | 'placeOfBirth'
    | 'emergencyContactPerson'
    | 'emergencyContactAddress'
    | 'emergencyContactNumber'
  label: string
  type: 'text' | 'tel' | 'number'
  placeholder?: string
  required?: boolean
  description?: string
}

export type DocumentTypeDefinition = {
  id: 'clearance' | 'indigency' | 'residency' | 'cedula' | 'barangay-id' | 'first-time-job-seeker'
  label: string
  shortLabel: string
  description: string
  
  fee: number
  fields: DocumentFieldDefinition[]
}

const documentTypesWithPurpose = ['clearance', 'indigency', 'residency'] as const

export const documentTypeCatalog: DocumentTypeDefinition[] = [
  {
    id: 'clearance',
    label: 'Barangay Clearance',
    shortLabel: 'Clearance',
    description: 'For employment, business permits, travel, or similar official transactions.',
    fee: 75,
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
    id: 'indigency',
    label: 'Certificate of Indigency',
    shortLabel: 'Indigency',
    description: 'For medical, educational, burial, or social assistance applications.',

    fee: 50,
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
    id: 'residency',
    label: 'Certificate of Residency',
    shortLabel: 'Residency',
    description: 'Proof of current address and duration of stay in Sampaloc IV.',
    fee: 50,
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
    fee: 90,
    fields: [
      {
        name: 'placeOfBirth',
        label: 'Place of Birth',
        type: 'text',
        required: true,
        placeholder: 'Enter place of birth',
      },
    ],
  },
  {
    id: 'barangay-id',
    label: 'Barangay ID',
    shortLabel: 'Barangay ID',
    description: 'Request a barangay ID with emergency contact information.',
    fee: 150,
    fields: [
      {
        name: 'placeOfBirth',
        label: 'Place of Birth',
        type: 'text',
        required: true,
        placeholder: 'Enter place of birth',
      },
      {
        name: 'emergencyContactPerson',
        label: 'Emergency Contact Person',
        type: 'text',
        required: true,
        placeholder: 'Enter contact person name',
      },
      {
        name: 'emergencyContactAddress',
        label: 'Emergency Contact Address',
        type: 'text',
        required: true,
        placeholder: 'Enter contact address',
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
    fee: 0,
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
]

export function getDocumentDefinition(documentType: string) {
  return documentTypeCatalog.find((item) => item.id === documentType)
}

export function getDocumentFieldNames(documentType: string) {
  return getDocumentDefinition(documentType)?.fields.map((field) => field.name) ?? []
}

export function documentTypeRequiresPurpose(documentType: string) {
  return (documentTypesWithPurpose as readonly string[]).includes(documentType)
}
