import axios from 'axios'
import api from '@/lib/axios'
import type { ClinicMedicalRecordListItem } from '@/lib/clinic-utils'

export async function fetchClinicMedicalRecords(
  archived = false
): Promise<ClinicMedicalRecordListItem[]> {
  try {
    const response = await api.get<ClinicMedicalRecordListItem[]>('/clinic/medical-records', {
      params: { archived },
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch medical records.')
    }

    throw error
  }
}

export async function fetchClinicMedicalRecordById(
  id: string
): Promise<ClinicMedicalRecordListItem> {
  try {
    const response = await api.get<ClinicMedicalRecordListItem>(`/clinic/medical-records/${id}`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch medical record.')
    }

    throw error
  }
}
