import { z } from 'zod'
import { INode } from '../../../src/Interface'
import { DynamicStructuredTool } from '../CustomTool/core'

const code = `
const sanitize = (v) => String(v || '').replace(/<[^>]*>/g, ' ').trim()
const normalize = (v) => sanitize(v).toLowerCase()

const userMessage = typeof $userMessage !== 'undefined' ? $userMessage : ''
const kbResults = typeof $kbResults !== 'undefined' ? $kbResults : undefined
const clarificationRaw = typeof $clarificationAnswer !== 'undefined' ? $clarificationAnswer : undefined
let kb = kbResults
if (typeof kb === 'string') {
  try {
    kb = JSON.parse(kb)
  } catch (e) {
    kb = kb
  }
}

let clarification = clarificationRaw
if (typeof clarification === 'string') {
  try {
    clarification = JSON.parse(clarification)
  } catch (e) {
    clarification = clarification
  }
}

const firstArticle = Array.isArray(kb?.articles) ? kb.articles[0] : (Array.isArray(kb) ? kb[0] : null)

if (firstArticle) {
  return (
    'Here is what to try first: ' + firstArticle.title + '. ' +
    'Steps: ' + firstArticle.snippet + ' ' +
    'Reference: ' + firstArticle.url
  )
}

const question = clarification?.question || sanitize(clarification)
if (question) {
  return 'I need one more detail before suggesting steps: ' + question
}

// Fallback path: if kbResults weren't bound, infer likely issue directly from user message.
const text = normalize(userMessage)
const inferred = text.includes('vpn') || text.includes('wifi') || text.includes('network')
  ? {
      title: 'Fix VPN Disconnects on macOS',
      snippet: 'Reset VPN profile, flush DNS, and re-authenticate with SSO.',
      url: 'https://kb.example.local/network/vpn-macos'
    }
  : text.includes('password') || text.includes('login') || text.includes('signin')
    ? {
        title: 'Reset Corporate Password',
        snippet: 'Use self-service reset, then sign out from all sessions and re-login.',
        url: 'https://kb.example.local/account/password-reset'
      }
    : text.includes('boot') || text.includes('laptop') || text.includes('device')
      ? {
          title: 'Laptop Won’t Boot',
          snippet: 'Run hardware diagnostics and verify disk health before OS recovery.',
          url: 'https://kb.example.local/device/boot-failure'
        }
      : null

if (inferred) {
  return (
    'Here is what to try first: ' + inferred.title + '. ' +
    'Steps: ' + inferred.snippet + ' ' +
    'Reference: ' + inferred.url
  )
}

return 'Please share your OS, exact error message, and when the issue started so I can suggest a precise fix.'
`

class ResponseBuilderHelpdesk_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'Response Builder (Helpdesk)'
        this.name = 'responseBuilderHelpdesk'
        this.version = 1.0
        this.type = 'ResponseBuilderHelpdesk'
        this.icon = 'customtool.svg'
        this.category = 'Tools'
        this.description = 'Compose final IT helpdesk response and escalation metadata.'
        this.baseClasses = [this.type, 'Tool']
    }

    async init(): Promise<any> {
        const obj = {
            name: 'response_builder_helpdesk',
            description: 'Generate final response from KB results or clarification output.',
            schema: z.object({
                userMessage: z.preprocess((v) => (v == null ? undefined : String(v)), z.string().optional()),
                kbResults: z.any().optional().describe('Output from KB search tool'),
                clarificationAnswer: z.any().optional().describe('Output from clarification tool'),
                category: z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().optional()),
                severity: z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().optional())
            }),
            code
        }

        return new DynamicStructuredTool(obj)
    }
}

module.exports = { nodeClass: ResponseBuilderHelpdesk_Tools }

