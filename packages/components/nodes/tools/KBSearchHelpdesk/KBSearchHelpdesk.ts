import { z } from 'zod'
import { INode } from '../../../src/Interface'
import { DynamicStructuredTool } from '../CustomTool/core'

const code = `
const kb = [
  {
    category: 'network',
    title: 'Fix VPN Disconnects on macOS',
    snippet: 'Reset VPN profile, flush DNS, and re-authenticate with SSO.',
    url: 'https://kb.example.local/network/vpn-macos',
    confidence: 0.91
  },
  {
    category: 'password',
    title: 'Reset Corporate Password',
    snippet: 'Use self-service reset, then sign out from all sessions and re-login.',
    url: 'https://kb.example.local/account/password-reset',
    confidence: 0.94
  },
  {
    category: 'device',
    title: 'Laptop Won’t Boot',
    snippet: 'Run hardware diagnostics and verify disk health before OS recovery.',
    url: 'https://kb.example.local/device/boot-failure',
    confidence: 0.88
  }
]

const query = typeof $query !== 'undefined' ? $query : ''
const category = typeof $category !== 'undefined' ? $category : ''
const sanitize = (v) => String(v || '').replace(/<[^>]*>/g, ' ').toLowerCase()
const q = sanitize(query)
const requestedCategory = sanitize(category)

const inferredCategory =
  q.includes('vpn') || q.includes('wifi') || q.includes('network')
    ? 'network'
    : q.includes('password') || q.includes('login') || q.includes('signin')
      ? 'password'
      : q.includes('boot') || q.includes('laptop') || q.includes('device')
        ? 'device'
        : (requestedCategory || 'other')

const articles = kb.filter((item) => item.category === inferredCategory).slice(0, 3)
return {
  category: inferredCategory,
  articles
}
`

class KBSearchHelpdesk_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'KB Search (Helpdesk)'
        this.name = 'kbSearchHelpdesk'
        this.version = 1.0
        this.type = 'KBSearchHelpdesk'
        this.icon = 'customtool.svg'
        this.category = 'Tools'
        this.description = 'Search an internal IT helpdesk KB using issue text.'
        this.baseClasses = [this.type, 'Tool']
    }

    async init(): Promise<any> {
        const obj = {
            name: 'kb_search_helpdesk',
            description: 'Search internal helpdesk KB and return top matching articles.',
            schema: z.object({
                query: z.preprocess((v) => (v == null ? '' : String(v)), z.string()).describe('User issue message'),
                category: z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().optional()),
                severity: z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().optional())
            }),
            code
        }

        return new DynamicStructuredTool(obj)
    }
}

module.exports = { nodeClass: KBSearchHelpdesk_Tools }

