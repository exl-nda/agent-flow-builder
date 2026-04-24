import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import path from 'path'
import * as fs from 'fs'
import { generateAgentflowv2 as generateAgentflowv2_json } from 'flowise-components'
import { z } from 'zod'
import { sysPrompt, langGraphSystemPrompt, msFrameworkSystemPrompt } from './prompt'
import { databaseEntities } from '../../utils'
import { decryptCredentialData } from '../../utils'
import logger from '../../utils/logger'
import { MODE } from '../../Interface'
import OpenAI from 'openai'
import { Credential } from '../../database/entities/Credential'
import { GeneratedWorkbenchCode } from '../../database/entities/GeneratedWorkbenchCode'

const REDACTED_CREDENTIAL_VALUE_PREFIX = '_FLOWISE_BLANK_'

/** OpenAI chat model ids from flowise-components `models.json` (ChatOpenAI node list). */
export const getOpenAIChatModelsForLangGraph = (): { label: string; name: string }[] => {
    try {
        const pkgJson = require.resolve('flowise-components/package.json')
        const dir = path.dirname(pkgJson)
        const modelsPath = path.join(dir, 'models.json')
        const raw = fs.readFileSync(modelsPath, 'utf8')
        const parsed = JSON.parse(raw) as { chat?: Array<{ name: string; models: { label: string; name: string }[] }> }
        const openai = parsed.chat?.find((p) => p.name === 'chatOpenAI')
        const models = openai?.models?.map((m) => ({ label: m.label, name: m.name })) ?? []
        return models.length ? models : [{ label: 'gpt-5.1', name: 'gpt-5.1' }]
    } catch {
        return [{ label: 'gpt-5.1', name: 'gpt-5.1' }]
    }
}

// Define the Zod schema for Agentflowv2 data structure
const NodeType = z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    width: z.number(),
    height: z.number(),
    selected: z.boolean().optional(),
    positionAbsolute: z
        .object({
            x: z.number(),
            y: z.number()
        })
        .optional(),
    dragging: z.boolean().optional(),
    data: z.any().optional(),
    parentNode: z.string().optional()
})

const EdgeType = z.object({
    source: z.string(),
    sourceHandle: z.string(),
    target: z.string(),
    targetHandle: z.string(),
    data: z
        .object({
            sourceColor: z.string().optional(),
            targetColor: z.string().optional(),
            edgeLabel: z.string().optional(),
            isHumanInput: z.boolean().optional()
        })
        .optional(),
    type: z.string().optional(),
    id: z.string()
})

const AgentFlowV2Type = z
    .object({
        description: z.string().optional(),
        usecases: z.array(z.string()).optional(),
        nodes: z.array(NodeType),
        edges: z.array(EdgeType)
    })
    .describe('Generate Agentflowv2 nodes and edges')

// Type for the templates array
type AgentFlowV2Template = z.infer<typeof AgentFlowV2Type>

const getAllAgentFlow2Nodes = async () => {
    const appServer = getRunningExpressApp()
    const nodes = appServer.nodesPool.componentNodes
    const agentFlow2Nodes = []
    for (const node in nodes) {
        if (nodes[node].category === 'Agent Flows') {
            agentFlow2Nodes.push({
                name: nodes[node].name,
                label: nodes[node].label,
                description: nodes[node].description
            })
        }
    }
    return JSON.stringify(agentFlow2Nodes, null, 2)
}

const getAllToolNodes = async () => {
    const appServer = getRunningExpressApp()
    const nodes = appServer.nodesPool.componentNodes
    const toolNodes = []
    const disabled_nodes = process.env.DISABLED_NODES ? process.env.DISABLED_NODES.split(',') : []
    const removeTools = ['chainTool', 'retrieverTool', 'webBrowser', ...disabled_nodes]

    for (const node in nodes) {
        if (nodes[node].category.includes('Tools')) {
            if (removeTools.includes(nodes[node].name)) {
                continue
            }
            toolNodes.push({
                name: nodes[node].name,
                description: nodes[node].description
            })
        }
    }
    return JSON.stringify(toolNodes, null, 2)
}

const getAllAgentflowv2Marketplaces = async () => {
    const templates: AgentFlowV2Template[] = []
    let marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2')
    let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
    jsonsInDir.forEach((file) => {
        try {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            // get rid of the node.data, remain all other properties
            const filteredNodes = fileDataObj.nodes.map((node: any) => {
                return {
                    ...node,
                    data: undefined
                }
            })

            const title = file.split('.json')[0]
            const template = {
                title,
                description: fileDataObj.description || `Template from ${file}`,
                usecases: fileDataObj.usecases || [],
                nodes: filteredNodes,
                edges: fileDataObj.edges
            }

            // Validate template against schema
            const validatedTemplate = AgentFlowV2Type.parse(template)
            templates.push({
                ...validatedTemplate,
                // @ts-ignore
                title: title
            })
        } catch (error) {
            console.error(`Error processing template file ${file}:`, error)
            // Continue with next file instead of failing completely
        }
    })

    // Format templates into the requested string format
    let formattedTemplates = ''
    templates.forEach((template: AgentFlowV2Template, index: number) => {
        formattedTemplates += `Example ${index + 1}: <<${(template as any).title}>> - ${template.description}\n`
        formattedTemplates += `"nodes": [\n`

        // Format nodes with proper indentation
        const nodesJson = JSON.stringify(template.nodes, null, 3)
        // Split by newlines and add 3 spaces to the beginning of each line except the first and last
        const nodesLines = nodesJson.split('\n')
        if (nodesLines.length > 2) {
            formattedTemplates += `   ${nodesLines[0]}\n`
            for (let i = 1; i < nodesLines.length - 1; i++) {
                formattedTemplates += `   ${nodesLines[i]}\n`
            }
            formattedTemplates += `   ${nodesLines[nodesLines.length - 1]}\n`
        } else {
            formattedTemplates += `   ${nodesJson}\n`
        }

        formattedTemplates += `]\n`
        formattedTemplates += `"edges": [\n`

        // Format edges with proper indentation
        const edgesJson = JSON.stringify(template.edges, null, 3)
        // Split by newlines and add tab to the beginning of each line except the first and last
        const edgesLines = edgesJson.split('\n')
        if (edgesLines.length > 2) {
            formattedTemplates += `\t${edgesLines[0]}\n`
            for (let i = 1; i < edgesLines.length - 1; i++) {
                formattedTemplates += `\t${edgesLines[i]}\n`
            }
            formattedTemplates += `\t${edgesLines[edgesLines.length - 1]}\n`
        } else {
            formattedTemplates += `\t${edgesJson}\n`
        }

        formattedTemplates += `]\n\n`
    })

    return formattedTemplates
}

const generateAgentflowv2 = async (question: string, selectedChatModel: Record<string, any>) => {
    try {
        const agentFlow2Nodes = await getAllAgentFlow2Nodes()
        const toolNodes = await getAllToolNodes()
        const marketplaceTemplates = await getAllAgentflowv2Marketplaces()

        const prompt = sysPrompt
            .replace('{agentFlow2Nodes}', agentFlow2Nodes)
            .replace('{marketplaceTemplates}', marketplaceTemplates)
            .replace('{userRequest}', question)
        const options: Record<string, any> = {
            appDataSource: getRunningExpressApp().AppDataSource,
            databaseEntities: databaseEntities,
            logger: logger
        }

        let response

        if (process.env.MODE === MODE.QUEUE) {
            const predictionQueue = getRunningExpressApp().queueManager.getQueue('prediction')
            const job = await predictionQueue.addJob({
                prompt,
                question,
                toolNodes,
                selectedChatModel,
                isAgentFlowGenerator: true
            })
            logger.debug(`[server]: Generated Agentflowv2 Job added to queue: ${job.id}`)
            const queueEvents = predictionQueue.getQueueEvents()
            response = await job.waitUntilFinished(queueEvents)
        } else {
            response = await generateAgentflowv2_json(
                { prompt, componentNodes: getRunningExpressApp().nodesPool.componentNodes, toolNodes, selectedChatModel },
                question,
                options
            )
        }

        try {
            // Try to parse and validate the response if it's a string
            if (typeof response === 'string') {
                const parsedResponse = JSON.parse(response)
                const validatedResponse = AgentFlowV2Type.parse(parsedResponse)
                return validatedResponse
            }
            // If response is already an object
            else if (typeof response === 'object') {
                const validatedResponse = AgentFlowV2Type.parse(response)
                return validatedResponse
            }
            // Unexpected response type
            else {
                throw new Error(`Unexpected response type: ${typeof response}`)
            }
        } catch (parseError) {
            console.error('Failed to parse or validate response:', parseError)
            // If parsing fails, return an error object
            return {
                error: 'Failed to validate response format',
                rawResponse: response
            } as any // Type assertion to avoid type errors
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: generateAgentflowv2 - ${getErrorMessage(error)}`)
    }
}

const getLangGraphUserPrompt = (flowData: Record<string, any>, instruction?: string) => {
    const serializedFlow = JSON.stringify(flowData, null, 2)
    const additionalInstruction = instruction?.trim()
        ? `\n\n### ADDITIONAL INSTRUCTION\n${instruction.trim()}\n`
        : ''
    return `${serializedFlow}${additionalInstruction}`
}

type WorkbenchCodeType = 'langgraph' | 'msFramework'

type GeneratedWorkbenchCodePayload = {
    chatflowId: string
    codeType: WorkbenchCodeType
    code: string
    workspaceId: string
}

const getGeneratedWorkbenchCode = async (chatflowId: string, codeType: WorkbenchCodeType, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(GeneratedWorkbenchCode)
        return await repo.findOneBy({ chatflowId, codeType, workspaceId })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: getGeneratedWorkbenchCode - ${getErrorMessage(error)}`
        )
    }
}

const upsertGeneratedWorkbenchCode = async (payload: GeneratedWorkbenchCodePayload) => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(GeneratedWorkbenchCode)
        const existing = await repo.findOneBy({
            chatflowId: payload.chatflowId,
            codeType: payload.codeType,
            workspaceId: payload.workspaceId
        })

        if (existing) {
            existing.code = payload.code
            return await repo.save(existing)
        }

        const record = repo.create({
            chatflowId: payload.chatflowId,
            codeType: payload.codeType,
            code: payload.code,
            workspaceId: payload.workspaceId
        })
        return await repo.save(record)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: upsertGeneratedWorkbenchCode - ${getErrorMessage(error)}`
        )
    }
}

type LangGraphValidationResult = {
    passed: boolean
    issues: string[]
}

type LangGraphLogEvent = {
    phase: string
    type: 'request' | 'response' | 'validation'
    payload: any
}

type LangGraphCredentialOptions = {
    credentialId?: string
    workspaceId?: string
}

const resolveOpenAIApiKeyFromStoredCredential = async (options?: LangGraphCredentialOptions): Promise<string | undefined> => {
    const appServer = getRunningExpressApp()
    const credentialRepo = appServer.AppDataSource.getRepository(Credential)

    const extractOpenAIKey = async (credential: Credential): Promise<string | undefined> => {
        try {
            // Use raw decrypted data (no password redaction), otherwise API keys become _FLOWISE_BLANK_*
            const decrypted = await decryptCredentialData(credential.encryptedData)
            const key = decrypted?.openAIApiKey
            if (typeof key !== 'string') return undefined
            const trimmed = key.trim()
            if (!trimmed || trimmed.startsWith(REDACTED_CREDENTIAL_VALUE_PREFIX)) return undefined
            return trimmed
        } catch {
            return undefined
        }
    }

    if (options?.credentialId) {
        const lookup = options.workspaceId
            ? { id: options.credentialId, workspaceId: options.workspaceId }
            : { id: options.credentialId }
        const credential = await credentialRepo.findOneBy(lookup)
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${options.credentialId} not found`)
        }
        const key = await extractOpenAIKey(credential)
        if (!key) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Credential ${options.credentialId} does not contain openAIApiKey`
            )
        }
        return key
    }

    const credentials = options?.workspaceId
        ? await credentialRepo.findBy({ workspaceId: options.workspaceId })
        : await credentialRepo.find()
    for (const credential of credentials) {
        const key = await extractOpenAIKey(credential)
        if (key) return key
    }

    return undefined
}

/* Disabled: local heuristic validation (use with LLM repair when re-enabled)
const validateLangGraphCode = (code: string): LangGraphValidationResult => {
    const issues: string[] = []
    const normalized = code || ''

    if (!/TypedDict/.test(normalized)) {
        issues.push('Missing TypedDict state schema.')
    }
    if (!/StateGraph\s*\(/.test(normalized)) {
        issues.push('Missing StateGraph construction.')
    }
    if (!/(set_entry_point\s*\()|(START)/.test(normalized)) {
        issues.push('Missing graph entry point (set_entry_point or START).')
    }
    if (!/END/.test(normalized)) {
        issues.push('Missing END node usage.')
    }
    if (!/compile\s*\(/.test(normalized)) {
        issues.push('Missing compile() call.')
    }
    if (!/invoke\s*\(/.test(normalized)) {
        issues.push('Missing invoke() example.')
    }
    if (/add_edge\s*\([^)]*condition\s*=/.test(normalized)) {
        issues.push('Invalid API usage: add_edge(..., condition=...) is not supported.')
    }
    if (!/add_conditional_edges\s*\(/.test(normalized)) {
        issues.push('Missing add_conditional_edges() for routing.')
    }
    if (!/def\s+\w+\s*\(\s*state/.test(normalized)) {
        issues.push('Missing node function signatures that accept state.')
    }

    return {
        passed: issues.length === 0,
        issues
    }
}
*/

const sanitizePythonCode = (code: string) => {
    if (!code) return ''
    let cleaned = code.trim()
    // Remove markdown code fences if present
    cleaned = cleaned.replace(/^```(?:python|py)?\s*/i, '')
    cleaned = cleaned.replace(/```$/i, '')
    return cleaned.trim()
}

const generateCompletionFromMessages = async (
    client: OpenAI,
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    phase: string,
    onLog?: (log: LangGraphLogEvent) => void,
    onToken?: (phase: string, token: string) => void
) => {
    onLog?.({
        phase,
        type: 'request',
        payload: {
            model,
            temperature: 0.2,
            messages
        }
    })

    const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages,
        stream: true
    })
    let content = ''
    for await (const chunk of completion) {
        const token = chunk.choices?.[0]?.delta?.content || ''
        if (!token) continue
        content += token
        onToken?.(phase, token)
    }
    onLog?.({
        phase,
        type: 'response',
        payload: {
            content
        }
    })

    return sanitizePythonCode(content)
}

const generateLangGraphCodeStream = async (
    flowData: Record<string, any>,
    instruction?: string,
    onLog?: (log: LangGraphLogEvent) => void,
    onToken?: (phase: string, token: string) => void,
    modelOverride?: string,
    credentialOptions?: LangGraphCredentialOptions,
    codeType: WorkbenchCodeType = 'langgraph'
) => {
    try {
        const apiKey = (await resolveOpenAIApiKeyFromStoredCredential(credentialOptions)) || process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'OpenAI API key is not configured. Add an OpenAI credential or set OPENAI_API_KEY.'
            )
        }

        const model =
            typeof modelOverride === 'string' && modelOverride.trim().length > 0
                ? modelOverride.trim()
                : process.env.OPENAI_LANGGRAPH_MODEL || process.env.OPENAI_MODEL || 'gpt-5.1'
        const userPrompt = getLangGraphUserPrompt(flowData, instruction)
        const client = new OpenAI({ apiKey })

        const systemPrompt = codeType === 'msFramework' ? msFrameworkSystemPrompt : langGraphSystemPrompt
        const candidateCode = await generateCompletionFromMessages(
            client,
            model,
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            'generation',
            onLog,
            onToken
        )

        const validationResult: LangGraphValidationResult = { passed: true, issues: [] }

        return {
            code: candidateCode,
            model,
            artifact: {
                instruction:
                    instruction ||
                    `Auto-generate ${codeType === 'msFramework' ? 'MS Framework' : 'LangGraph'} code from current flow JSON`,
                flowData,
                codeType
            },
            phases: ['generation'],
            validation: validationResult
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: generateLangGraphCodeStream - ${getErrorMessage(error)}`)
    }
}

export default {
    generateAgentflowv2,
    generateLangGraphCodeStream,
    getGeneratedWorkbenchCode,
    upsertGeneratedWorkbenchCode
}
