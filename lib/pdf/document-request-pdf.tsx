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
    republicName: 'Republic of the Philippines',
    provinceName:  'Province of Cavite',
    cityName:  'City of Dasmarinas',
    barangayName: 'Barangay Sampaloc IV',
    officeName: 'Office of the Punong Barangay',
    captainName: 'Authorized Signatory',
    captainTitle: 'Punong Barangay',
    secretaryName: 'Barangay Secretary',
    secretaryTitle:  'Barangay Secretary',
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay Clearance - Norito A. Cabansag Jr</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            font-family: "Times New Roman", Times, serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
        }
        .sheet {
            background: white;
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            box-sizing: border-box;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            position: relative;
        }
        .header {
            text-align: center;
            line-height: 1.2;
            margin-bottom: 40px;
        }
        .header h3 {
            margin: 0;
            font-weight: normal;
            font-size: 14pt;
        }
        .header h2 {
            margin: 0;
            font-weight: bold;
            font-size: 16pt;
            text-transform: uppercase;
        }
        .office-title {
            margin-top: 10px;
            font-weight: bold;
            font-size: 12pt;
            text-decoration: underline;
        }
        .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 50px;
            font-size: 11pt;
        }
        .document-title {
            text-align: center;
            font-size: 24pt;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 40px;
            letter-spacing: 2px;
        }
        .salutation {
            font-weight: bold;
            margin-bottom: 30px;
        }
        .content-body {
            text-align: justify;
            line-height: 1.8;
            font-size: 12pt;
            text-indent: 50px;
        }
        .certify-line {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin: 20px 0;
            letter-spacing: 5px;
        }
        .name-highlight {
            display: block;
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            text-decoration: underline;
            margin: 10px 0;
        }
        .address-line {
            display: block;
            text-align: center;
            font-style: italic;
            margin-bottom: 30px;
        }
        .purpose-section {
            margin-top: 30px;
            text-indent: 0;
        }
        .validity-note {
            margin-top: 50px;
            font-weight: bold;
            font-style: italic;
        }
        .footer-signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .thumbprint-box {
            border: 1px solid black;
            width: 100px;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            text-align: center;
        }
        .official-sign {
            text-align: center;
        }
        .official-sign .name {
            font-weight: bold;
            text-decoration: underline;
            font-size: 13pt;
        }
        .signature-line {
            border-top: 1px solid black;
            width: 200px;
            margin-top: 40px;
            text-align: center;
            font-size: 10pt;
        }
        .contact-info {
            position: absolute;
            bottom: 20mm;
            left: 20mm;
            font-size: 10pt;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <h3>Republic of the Philippines</h3>
            <h3>Province of Cavite</h3>
            <h2>CITY OF DASMARIÑAS</h2>
            <h3>Barangay Sampaloc IV</h3>
            <div class="office-title">OFFICE OF THE PUNONG BARANGAY</div>
        </div>

        <div class="meta-info">
            <div>Date: 13-Apr-26</div>
            <div>Serial No. SIV-2-0026</div>
        </div>

        <div class="document-title">BARANGAY CLEARANCE</div>

        <div class="salutation">To Whom It May Concern:</div>

        <div class="certify-line">THIS IS TO CERTIFY</div>

        <div class="content-body">
            THAT <span class="name-highlight">NORITO A. CABANSAG JR</span>
            <span class="address-line">of Block 27 Lot 18 Zone 3 Bautista, Barangay Sampaloc IV, Dasmariñas City, Cavite;</span>
            is a bona fide resident of this barangay and who is personally known to me to be law abiding citizen and has a good moral character.
            <br><br>
            That of my own personal knowledge, he/ she has not committed, nor been involved in, any unlawful activities in this barangay.
            
            <div class="purpose-section">
                Issued upon the request of the above-named person or establishment for 
                <strong>NBI CLEARANCE - FIRST TIME JOB SEEKER</strong> purposes.
            </div>

            <div class="validity-note">
                Note: Valid only for (3) months from the date of issuance.
            </div>
        </div>

        <div class="footer-signatures">
            <div>
                <div class="thumbprint-box">Right Thumb Print</div>
                <div class="signature-line">Applicant's Signature</div>
            </div>
            
            <div class="official-sign">
                <div class="name">HON. ARMANDO M. MOVIDO</div>
                <div>Punong Barangay</div>
            </div>
        </div>

        <div class="contact-info">
            Contact No. 0968-215-2805
        </div>
    </div>
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
