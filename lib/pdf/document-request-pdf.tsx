import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

type PdfResident = {
  firstName: string
  middleName: string | null
  lastName: string
  birthDate?: Date | null
  houseNumber: string
  street: string
  contactNumber?: string | null
}

type PdfDocumentRequest = {
  id: string
  documentTypeId: string
  type: string
  purpose: string | null
  quantity: number
  amount: number
  details: unknown
  yearsOfResidency: number
  placeOfBirth: string | null
  serialNumber: string
  requestedAt: Date
  generatedAt: Date
  resident: PdfResident
}

type BrandingConfig = {
  captainName: string
  captainTitle: string
  secretaryName: string
  secretaryTitle: string
}

const templateCache = new Map<string, string>()

function getBrandingConfig(): BrandingConfig {
  return {
    captainName: 'HON. ARMANDO M. MOVIDO',
    captainTitle: 'Punong Barangay',
    secretaryName: 'BELEN P. MOVIDO',
    secretaryTitle: 'Barangay Secretary',
  }
}

function getResidentFullName(resident: PdfResident) {
  return [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' ')
}

function getResidentAddress(resident: PdfResident) {
  return [resident.houseNumber, resident.street].filter(Boolean).join(' ')
}

function getTemplate(templateName: string) {
  const cached = templateCache.get(templateName)

  if (cached) {
    return cached
  }

  const templatePath = path.join(process.cwd(), 'lib', 'pdf', 'templates', templateName)
  const template = fs.readFileSync(templatePath, 'utf8')
  templateCache.set(templateName, template)

  return template
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    escapeHtml(values[key] ?? '')
  )
}

function formatShortDate(value: Date) {
  return value
    .toLocaleDateString('en-PH', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    })
    .replaceAll(' ', '-')
}

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return 'th'
  }

  const lastDigit = day % 10

  if (lastDigit === 1) {
    return 'st'
  }

  if (lastDigit === 2) {
    return 'nd'
  }

  if (lastDigit === 3) {
    return 'rd'
  }

  return 'th'
}

function formatOrdinalIssueDate(value: Date) {
  const day = value.getDate()
  const month = value.toLocaleDateString('en-PH', { month: 'long' })
  const year = value.getFullYear()

  return `${day}${getOrdinalSuffix(day)} day of ${month}, ${year}`
}

function formatOrdinalIssueDateNoComma(value: Date) {
  return formatOrdinalIssueDate(value).replace(',', '')
}

function formatLongDate(value: Date) {
  return value.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPurpose(request: PdfDocumentRequest) {
  return request.purpose?.trim() || 'legal'
}

function getResidentAge(request: PdfDocumentRequest) {
  const birthDate = request.resident.birthDate

  if (!birthDate) {
    return '____'
  }

  let age = request.generatedAt.getFullYear() - birthDate.getFullYear()
  const generatedMonth = request.generatedAt.getMonth()
  const birthMonth = birthDate.getMonth()
  const hasBirthdayPassed =
    generatedMonth > birthMonth ||
    (generatedMonth === birthMonth && request.generatedAt.getDate() >= birthDate.getDate())

  if (!hasBirthdayPassed) {
    age -= 1
  }

  return String(Math.max(age, 0))
}

function getTemplateValues(request: PdfDocumentRequest) {
  const branding = getBrandingConfig()
  const name = getResidentFullName(request.resident)
  const address = getResidentAddress(request.resident)
  const purpose = getPurpose(request)

  return {
    name,
    nameUpper: name.toUpperCase(),
    address,
    purpose,
    purposeUpper: purpose.toUpperCase(),
    serialNumber: request.serialNumber,
    shortDate: formatShortDate(request.generatedAt),
    issueDate: formatLongDate(request.generatedAt),
    ordinalIssueDate: formatOrdinalIssueDate(request.generatedAt),
    ordinalIssueDateNoComma: formatOrdinalIssueDateNoComma(request.generatedAt),
    requestedDate: formatLongDate(request.requestedAt),
    yearsOfResidency: String(request.yearsOfResidency),
    placeOfBirth: request.placeOfBirth ?? '',
    age: getResidentAge(request),
    contactNumber: request.resident.contactNumber?.trim() || '________________',
    captainName: branding.captainName,
    captainTitle: branding.captainTitle,
    secretaryName: branding.secretaryName,
    secretaryTitle: branding.secretaryTitle,
  }
}

function createGenericDocumentRequestHtml(request: PdfDocumentRequest) {
  const values = getTemplateValues(request)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: "Times New Roman", Times, serif; color: #000; }
    .page { box-sizing: border-box; width: 210mm; height: 297mm; padding: 25mm; }
    .header { text-align: center; font-family: Arial, sans-serif; line-height: 1.3; }
    .title { margin: 45px 0; text-align: center; font: bold 24pt Arial, sans-serif; text-decoration: underline; }
    .meta { display: flex; justify-content: space-between; margin-top: 35px; font: bold 11pt Arial, sans-serif; }
    p { font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 40px; }
    .signature { margin-top: 80px; text-align: right; font-family: Arial, sans-serif; }
    .signature strong { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>Republic of the Philippines</div>
      <div>Province of Cavite</div>
      <div><strong>CITY OF DASMARI&Ntilde;AS</strong></div>
      <div><strong>Barangay Sampaloc IV</strong></div>
      <div><strong>OFFICE OF THE PUNONG BARANGAY</strong></div>
    </div>
    <div class="meta">
      <div>Serial No. ${escapeHtml(values.serialNumber)}</div>
      <div>Date: ${escapeHtml(values.shortDate)}</div>
    </div>
    <div class="title">${escapeHtml(request.type.toUpperCase())}</div>
    <p>This is to certify that <strong>${escapeHtml(values.nameUpper)}</strong> is a bona fide resident of ${escapeHtml(values.address)}, Barangay Sampaloc IV, Dasmari&ntilde;as City, Cavite.</p>
    <p>This document is issued on ${escapeHtml(values.issueDate)}${request.purpose ? ` for ${escapeHtml(request.purpose)}.` : '.'}</p>
    <div class="signature">
      <strong>${escapeHtml(values.captainName)}</strong><br>
      ${escapeHtml(values.captainTitle)}
    </div>
  </div>
</body>
</html>`
}

function createDocumentRequestHtml(request: PdfDocumentRequest) {
  if (request.documentTypeId === 'clearance') {
    return renderTemplate(getTemplate('clearance-template.html'), getTemplateValues(request))
  }

  if (request.documentTypeId === 'indigency') {
    return renderTemplate(getTemplate('indigency-template.html'), getTemplateValues(request))
  }

  if (
    request.documentTypeId === 'first-time-job-seeker' ||
    request.documentTypeId === 'FIRST_TIME_JOB_SEEKER'
  ) {
    return renderTemplate(getTemplate('first-time-job-seeker-template.html'), getTemplateValues(request))
  }

  return createGenericDocumentRequestHtml(request)
}

export async function generateDocumentRequestPdfBuffer(request: PdfDocumentRequest) {
  const browser = await puppeteer.launch({
    headless: true,
  })

  try {
    const page = await browser.newPage()

    await page.setContent(createDocumentRequestHtml(request), {
      waitUntil: 'networkidle0',
    })
    await page.emulateMediaType('screen')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
