import puppeteer from 'puppeteer'
import { buildDocumentDetailLines } from '@/lib/document-request-utils'

type PdfResident = {
  firstName: string
  middleName: string | null
  lastName: string
  houseNumber: string
  street: string
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
  republicName: string
  provinceName: string
  cityName: string
  barangayName: string
  officeName: string
  captainName: string
  captainTitle: string
  secretaryName: string
  secretaryTitle: string
}

type PdfDetailLine = {
  label: string
  value: string
}

function getBrandingConfig(): BrandingConfig {
  return {
    republicName: process.env.BARANGAY_REPUBLIC_NAME ?? 'Republic of the Philippines',
    provinceName: process.env.BARANGAY_PROVINCE_NAME ?? 'Province of Cavite',
    cityName: process.env.BARANGAY_CITY_NAME ?? 'City of Dasmarinas',
    barangayName: process.env.BARANGAY_NAME ?? 'Barangay Sampaloc IV',
    officeName: process.env.BARANGAY_OFFICE_NAME ?? 'Office of the Punong Barangay',
    captainName: process.env.BARANGAY_CAPTAIN_NAME ?? 'Authorized Signatory',
    captainTitle: process.env.BARANGAY_CAPTAIN_TITLE ?? 'Punong Barangay',
    secretaryName: process.env.BARANGAY_SECRETARY_NAME ?? 'Barangay Secretary',
    secretaryTitle: process.env.BARANGAY_SECRETARY_TITLE ?? 'Barangay Secretary',
  }
}

function formatLongDate(value: Date) {
  return value.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getResidentFullName(resident: PdfResident) {
  return [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' ')
}

function getResidentAddress(resident: PdfResident) {
  return [resident.houseNumber, resident.street].filter(Boolean).join(', ')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderParagraphs(paragraphs: string[]) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function renderDetailItems(detailLines: PdfDetailLine[]) {
  return detailLines
    .map(
      (line) => `
        <div class="detail-item">
          <span class="detail-item-label">${escapeHtml(line.label)}</span>
          <span class="detail-item-value">${escapeHtml(line.value)}</span>
        </div>
      `
    )
    .join('')
}

function buildDocumentNarrative(request: PdfDocumentRequest) {
  const residentName = getResidentFullName(request.resident)
  const residentAddress = getResidentAddress(request.resident)
  const issueDate = formatLongDate(request.generatedAt)

  if (request.documentTypeId === 'clearance') {
    return [
      `This is to certify that ${residentName} is a bona fide resident of ${residentAddress}.`,
      `Based on barangay records, the resident has stayed in the community for ${request.yearsOfResidency} year(s) and is known to be of good moral character.`,
      `This Barangay Clearance is issued on ${issueDate}${request.purpose ? ` for ${request.purpose}.` : '.'}`,
    ]
  }

  if (request.documentTypeId === 'indigency') {
    return [
      `This is to certify that ${residentName} is a bona fide resident of ${residentAddress}.`,
      `The resident has requested a Certificate of Indigency${request.purpose ? ` for ${request.purpose}` : ''}.`,
      `This certification is issued on ${issueDate} upon the request of the concerned resident.`,
    ]
  }

  if (request.documentTypeId === 'residency') {
    return [
      `This is to certify that ${residentName} is presently residing at ${residentAddress}.`,
      `Barangay records show that the resident has lived in the barangay for ${request.yearsOfResidency} year(s).`,
      `This certificate is issued on ${issueDate}${request.purpose ? ` for ${request.purpose}.` : '.'}`,
    ]
  }

  return [
    `This is to certify that ${residentName} is a bona fide resident of ${residentAddress}.`,
    `The resident has requested a ${request.type}${request.purpose ? ` for ${request.purpose}` : ''}.`,
    `This document is issued on ${issueDate} upon the request of the concerned resident.`,
  ]
}

function createDocumentRequestHtml(request: PdfDocumentRequest) {
  const branding = getBrandingConfig()
  const detailLines = buildDocumentDetailLines(
    request.documentTypeId,
    {
      ...((request.details ?? {}) as Record<string, string | undefined>),
      requestedCopies: String(request.quantity),
      purpose: request.purpose ?? undefined,
      yearsOfResidency:
        request.yearsOfResidency > 0 ? String(request.yearsOfResidency) : undefined,
      placeOfBirth: request.placeOfBirth ?? undefined,
    }
  ).filter((line) => line.label !== 'Requested Copies')
  const bodyParagraphs = buildDocumentNarrative(request)
  const issueDate = formatLongDate(request.generatedAt)
  const requestedDate = formatLongDate(request.requestedAt)
  const residentName = getResidentFullName(request.resident)
  const residentAddress = getResidentAddress(request.resident)
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(`${request.type} - ${request.serialNumber}`)}</title>
        <style>
          @page { size: A4; margin: 20mm 18mm 20mm 18mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.55;
          }
          .page { min-height: 100%; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; }
          .header p { margin: 0; }
          .header-eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #475569; }
          .header-title { font-size: 28px; font-weight: 700; letter-spacing: 0.04em; margin-top: 6px; }
          .header-subtitle { margin-top: 4px; font-size: 13px; font-weight: 600; }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 18px;
          }
          .meta-card {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 10px 12px;
            background: #f8fafc;
          }
          .meta-label {
            display: block;
            color: #475569;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; }
          .document-title {
            margin-top: 24px;
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          .body-copy { margin-top: 24px; }
          .body-copy p { margin: 0 0 14px; text-align: justify; text-indent: 36px; }
          .detail-panel {
            margin-top: 22px;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 16px;
            background: #ffffff;
          }
          .detail-panel-title {
            margin: 0 0 12px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #334155;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 18px;
          }
          .detail-item { border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .detail-item-label { display: block; color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
          .detail-item-value { margin-top: 2px; font-size: 12px; font-weight: 600; color: #0f172a; }
          .signature-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-top: 42px;
            align-items: end;
          }
          .signature-block { text-align: center; }
          .signature-line {
            border-bottom: 1px solid #0f172a;
            min-height: 42px;
            display: flex;
            align-items: end;
            justify-content: center;
            padding-bottom: 8px;
          }
          .signature-name { font-size: 13px; font-weight: 700; text-transform: uppercase; }
          .signature-title { margin-top: 8px; color: #475569; font-size: 11px; }
          .footer-note {
            margin-top: 28px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <p class="header-eyebrow">${escapeHtml(branding.republicName)}</p>
            <p class="header-eyebrow">${escapeHtml(branding.provinceName)}</p>
            <p class="header-eyebrow">${escapeHtml(branding.cityName)}</p>
            <p class="header-title">${escapeHtml(branding.barangayName)}</p>
            <p class="header-subtitle">${escapeHtml(branding.officeName)}</p>
          </header>

          <section class="meta-grid">
            <div class="meta-card">
              <span class="meta-label">Serial Number</span>
              <span class="meta-value">${escapeHtml(request.serialNumber)}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Issue Date</span>
              <span class="meta-value">${escapeHtml(issueDate)}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Resident Name</span>
              <span class="meta-value">${escapeHtml(residentName)}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Address</span>
              <span class="meta-value">${escapeHtml(residentAddress)}</span>
            </div>
          </section>

          <h1 class="document-title">${escapeHtml(request.type)}</h1>

          <section class="body-copy">${renderParagraphs(bodyParagraphs)}</section>

          <section class="detail-panel">
            <h2 class="detail-panel-title">Request Details</h2>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item-label">Request Filed</span>
                <span class="detail-item-value">${escapeHtml(requestedDate)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item-label">Copies Requested</span>
                <span class="detail-item-value">${escapeHtml(String(request.quantity))}</span>
              </div>
              ${renderDetailItems(detailLines)}
            </div>
          </section>

          <section class="signature-row">
            <div class="signature-block">
              <div class="signature-line">
                <span class="signature-name">${escapeHtml(branding.secretaryName)}</span>
              </div>
              <p class="signature-title">${escapeHtml(branding.secretaryTitle)}</p>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                <span class="signature-name">${escapeHtml(branding.captainName)}</span>
              </div>
              <p class="signature-title">${escapeHtml(branding.captainTitle)}</p>
            </div>
          </section>

          <p class="footer-note">
            This document was generated electronically by the Barangay Management System.
          </p>
        </main>
      </body>
    </html>`
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
