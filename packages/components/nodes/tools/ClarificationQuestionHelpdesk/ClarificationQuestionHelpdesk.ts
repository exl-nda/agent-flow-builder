import { z } from 'zod'
import { INode } from '../../../src/Interface'
import { DynamicStructuredTool } from '../CustomTool/core'

const code = `
const userMessage = typeof $userMessage !== 'undefined' ? $userMessage : ''
const missingFields = typeof $missingFields !== 'undefined' ? $missingFields : undefined

const msg = String(userMessage || '').replace(/<[^>]*>/g, ' ').trim()
const missing = Array.isArray(missingFields) ? missingFields.filter(Boolean) : []

const baseQuestion = 'Please share your OS, exact error text, and when the issue started.'
const extra = missing.length ? (' Missing details: ' + missing.join(', ')) : ''

return {
  question: baseQuestion + extra,
  reason: 'Insufficient issue detail for accurate troubleshooting.',
  originalMessage: msg
}
`

class ClarificationQuestionHelpdesk_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'Clarification Question (Helpdesk)'
        this.name = 'clarificationQuestionHelpdesk'
        this.version = 1.0
        this.type = 'ClarificationQuestionHelpdesk'
        this.icon = 'customtool.svg'
        this.category = 'Tools'
        this.description = 'Generate one focused follow-up question for unclear issues.'
        this.baseClasses = [this.type, 'Tool']
    }

    async init(): Promise<any> {
        const obj = {
            name: 'clarification_question_helpdesk',
            description: 'Ask a focused clarification question to collect missing issue details.',
            schema: z.object({
                userMessage: z.preprocess((v) => (v == null ? '' : String(v)), z.string()).describe('User message to clarify'),
                missingFields: z.preprocess(
                    (v) => {
                        if (v == null || v === '') return undefined
                        if (Array.isArray(v)) return v.map(String)
                        if (typeof v === 'string') {
                            try {
                                const p = JSON.parse(v)
                                return Array.isArray(p) ? p.map(String) : undefined
                            } catch {
                                return undefined
                            }
                        }
                        return undefined
                    },
                    z.array(z.string()).optional()
                ).describe('Known missing fields')
            }),
            code
        }

        return new DynamicStructuredTool(obj)
    }
}

module.exports = { nodeClass: ClarificationQuestionHelpdesk_Tools }

