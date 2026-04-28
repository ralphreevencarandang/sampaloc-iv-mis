export type MedicalRecordAttachment = {
  name: string
  size: number
  type?: string
}

export type ClinicMedicalRecordListItem = {
  id: string
  patientId: string
  patientName: string
  diagnosis: string
  notes: string
  date: string
  createdByName: string
  attachments: MedicalRecordAttachment[]
  isArchive: boolean
}

function safeParseAttachments(value: string | null): MedicalRecordAttachment[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.flatMap((item) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'name' in item &&
        typeof item.name === 'string' &&
        'size' in item &&
        typeof item.size === 'number'
      ) {
        return [
          {
            name: item.name,
            size: item.size,
            type: 'type' in item && typeof item.type === 'string' ? item.type : undefined,
          },
        ]
      }

      return []
    })
  } catch {
    return []
  }
}

export function serializeClinicMedicalRecord(record: {
  id: string
  patientId: string
  symptoms: string
  diagnosis: string
  treatment: string
  prescription: string | null
  date: Date
  isArchive: boolean
  patient: {
    firstName: string
    middleName: string | null
    lastName: string
  }
  checkedBy: {
    name: string
  }
}): ClinicMedicalRecordListItem {
  const patientName = [record.patient.firstName, record.patient.middleName, record.patient.lastName]
    .filter(Boolean)
    .join(' ')

  return {
    id: record.id,
    patientId: record.patientId,
    patientName,
    diagnosis: record.diagnosis,
    notes: record.treatment || record.symptoms,
    date: record.date.toISOString(),
    createdByName: record.checkedBy.name,
    attachments: safeParseAttachments(record.prescription),
    isArchive: record.isArchive,
  }
}

export function calculateAge(birthDate: Date, referenceDate = new Date()) {
  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDifference = referenceDate.getMonth() - birthDate.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }

  return age
}
