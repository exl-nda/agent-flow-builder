import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getFirstPdfBufferFromUploads } from '../../../src/azureDocumentIntelligenceUploads'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const MODEL_ID = 'prebuilt-read'
const POLL_MS = 2000
const MAX_POLLS = 180

function normalizeEndpoint(endpoint: string): string {
    let e = endpoint.trim()
    if (!e.endsWith('/')) e += '/'
    return e
}

function extractTextFromAnalyzeResult(body: any): string {
    const ar = body?.analyzeResult
    if (!ar) return ''
    if (typeof ar.content === 'string' && ar.content.trim()) return ar.content.trim()
    if (Array.isArray(ar.paragraphs)) {
        return ar.paragraphs
            .map((p: { content?: string }) => p?.content ?? '')
            .filter(Boolean)
            .join('\n')
    }
    if (Array.isArray(ar.pages)) {
        const lines: string[] = []
        for (const page of ar.pages) {
            if (Array.isArray(page.lines)) {
                for (const line of page.lines) {
                    if (line?.content) lines.push(line.content)
                }
            }
        }
        if (lines.length) return lines.join('\n')
    }
    return ''
}

class AzureDocumentIntelligenceDigitize implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure Document Intelligence Digitize (prebuilt-read)'
        this.name = 'azureDocumentIntelligenceDigitize'
        this.version = 1.0
        this.type = 'AzureDocumentIntelligenceDigitize'
        this.icon = 'Azure.svg'
        this.category = 'Tools'
        this.description =
            'Sends the uploaded PDF to Azure AI Document Intelligence prebuilt-read, polls until complete, and returns OCR text for downstream classification or extraction.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureDocumentIntelligence']
        }
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: 'azure_document_intelligence_digitize',
                description: 'Name exposed to the agent',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Tool Description',
                name: 'toolDesc',
                type: 'string',
                rows: 4,
                description: 'When the LLM should call this tool',
                default:
                    'Digitizes a scanned PDF using Azure Document Intelligence (OCR). No required arguments; uses the uploaded PDF from the conversation.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Locale (optional)',
                name: 'locale',
                type: 'string',
                placeholder: 'en-US',
                description: 'Optional BCP-47 locale hint for OCR (passed as query parameter when set)',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pages (optional)',
                name: 'pages',
                type: 'string',
                placeholder: '1-3',
                description: 'Optional page range, e.g. 1-3 or 1,3,5 (Azure pages query parameter)',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max pages (first N)',
                name: 'maxPages',
                type: 'number',
                default: 10,
                description: 'Limits analysis to the first N pages (helps with free-tier limits). Set pages/range explicitly to override.',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('azureDocumentIntelligenceKey', credentialData, nodeData)
        let endpoint = getCredentialParam('azureDocumentIntelligenceEndpoint', credentialData, nodeData) as string
        const apiVersion = (getCredentialParam('apiVersion', credentialData, nodeData) as string) || '2024-11-30'

        const toolName = (nodeData.inputs?.toolName as string) || 'azure_document_intelligence_digitize'
        const toolDesc =
            (nodeData.inputs?.toolDesc as string) ||
            'Runs Azure Document Intelligence prebuilt-read OCR on the uploaded PDF and returns plain text.'

        const locale = nodeData.inputs?.locale as string | undefined
        const pagesOverride = nodeData.inputs?.pages as string | undefined
        const maxPages = (nodeData.inputs?.maxPages as number) ?? 10

        const schema = z.object({
            pages: z.string().optional().describe('Optional page range for this call, e.g. 1-5'),
            locale: z.string().optional().describe('Optional BCP-47 locale for this call')
        })

        return new DynamicStructuredTool({
            name: toolName,
            description: toolDesc,
            schema,
            func: async (args: z.infer<typeof schema>) => {
                const found = await getFirstPdfBufferFromUploads(options)
                if (!found) {
                    throw new Error('No application/pdf upload found. Upload a PDF before running this tool.')
                }

                endpoint = normalizeEndpoint(endpoint)
                const pagesParam = args?.pages || pagesOverride || (maxPages > 0 ? `1-${maxPages}` : undefined)
                const localeParam = args?.locale || locale

                let url = `${endpoint}documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=${encodeURIComponent(apiVersion)}`
                const qp: string[] = []
                if (pagesParam) qp.push(`pages=${encodeURIComponent(pagesParam)}`)
                if (localeParam) qp.push(`locale=${encodeURIComponent(localeParam)}`)
                if (qp.length) url += `&${qp.join('&')}`

                const submit = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': apiKey,
                        'Content-Type': 'application/pdf'
                    },
                    body: new Uint8Array(found.buffer)
                })

                if (submit.status !== 202) {
                    const errText = await submit.text()
                    throw new Error(`Azure Document Intelligence analyze failed (${submit.status}): ${errText}`)
                }

                const opLocation = submit.headers.get('operation-location') || submit.headers.get('Operation-Location')
                if (!opLocation) {
                    throw new Error('Azure Document Intelligence did not return Operation-Location header')
                }

                let resultBody: any
                for (let i = 0; i < MAX_POLLS; i++) {
                    await new Promise((r) => setTimeout(r, POLL_MS))
                    const poll = await fetch(opLocation, {
                        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
                    })
                    if (!poll.ok) {
                        const t = await poll.text()
                        throw new Error(`Azure Document Intelligence poll failed (${poll.status}): ${t}`)
                    }
                    resultBody = await poll.json()
                    const st = resultBody?.status
                    if (st === 'succeeded') break
                    if (st === 'failed') {
                        const err = resultBody?.error?.message || JSON.stringify(resultBody?.error || resultBody)
                        throw new Error(`Azure Document Intelligence failed: ${err}`)
                    }
                }

                if (resultBody?.status !== 'succeeded') {
                    throw new Error('Azure Document Intelligence timed out waiting for analysis to complete')
                }

                const text = extractTextFromAnalyzeResult(resultBody)
                return text
            }
        })
    }
}

module.exports = { nodeClass: AzureDocumentIntelligenceDigitize }
