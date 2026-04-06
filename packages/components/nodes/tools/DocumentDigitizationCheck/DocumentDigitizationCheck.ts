import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getFirstPdfBufferFromUploads } from '../../../src/azureDocumentIntelligenceUploads'
import { getBaseClasses } from '../../../src/utils'

const DEFAULT_MIN_CHARS = 50

class DocumentDigitizationCheck implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Document Digitization Check'
        this.name = 'documentDigitizationCheck'
        this.version = 1.1
        this.type = 'DocumentDigitizationCheck'
        this.icon = 'pdf.svg'
        this.category = 'Tools'
        this.description =
            'Reads the uploaded PDF locally (embedded text). Returns isDigitized as the strings "true" or "false" (for string-based Condition) plus extracted text. Use with Agentflow Condition to skip Azure OCR when not needed.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
        this.inputs = [
            {
                label: 'Minimum Characters',
                name: 'minChars',
                type: 'number',
                default: DEFAULT_MIN_CHARS,
                description:
                    'If extracted text has at least this many non-whitespace characters, the PDF is treated as already digitized (embedded text).'
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: 'document_digitization_check',
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
                    'Checks whether the uploaded PDF already contains extractable text (digitized). Returns JSON with isDigitized ("true"|"false") and text. No arguments required; uses the file from the current upload.',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const minChars = (nodeData.inputs?.minChars as number) ?? DEFAULT_MIN_CHARS
        const toolName = (nodeData.inputs?.toolName as string) || 'document_digitization_check'
        const toolDesc =
            (nodeData.inputs?.toolDesc as string) ||
            'Checks whether the uploaded PDF already contains extractable text (digitized). Returns isDigitized as "true" or "false" strings for Condition (string Equal). Uses the uploaded PDF from the conversation.'

        return new DynamicStructuredTool({
            name: toolName,
            description: toolDesc,
            schema: z.object({}),
            func: async () => {
                const found = await getFirstPdfBufferFromUploads(options)
                if (!found) {
                    return JSON.stringify({
                        isDigitized: 'false',
                        text: '',
                        error: 'No application/pdf upload found. Upload a PDF first.'
                    })
                }

                const loader = new PDFLoader(new Blob([found.buffer]), {
                    splitPages: false,
                    pdfjs: () =>
                        // @ts-ignore
                        import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
                })
                const docs = await loader.load()
                let text = ''
                for (const d of docs) {
                    text += d.pageContent + '\n'
                }
                text = text.trim()
                const significant = text.replace(/\s/g, '').length
                const isDigitized = significant >= minChars

                return JSON.stringify({
                    isDigitized: isDigitized ? 'true' : 'false',
                    text
                })
            }
        })
    }
}

module.exports = { nodeClass: DocumentDigitizationCheck }
