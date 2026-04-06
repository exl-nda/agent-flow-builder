import { Request, Response, NextFunction } from 'express'
import agentflowv2Service, { getOpenAIChatModelsForLangGraph } from '../../services/agentflowv2-generator'

const generateAgentflowv2 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.question || !req.body.selectedChatModel) {
            throw new Error('Question and selectedChatModel are required')
        }
        const apiResponse = await agentflowv2Service.generateAgentflowv2(req.body.question, req.body.selectedChatModel)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const listOpenAIChatModels = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const models = getOpenAIChatModelsForLangGraph()
        return res.json({ models })
    } catch (error) {
        next(error)
    }
}

const generateLangGraphCodeStream = async (req: Request, res: Response) => {
    try {
        const { flowData, instruction, model: requestedModel } = req.body || {}
        if (!flowData || typeof flowData !== 'object') {
            throw new Error('flowData is required')
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control')

        const writeSSE = (event: string, data: any) => {
            res.write(`event: ${event}\n`)
            res.write(`data: ${JSON.stringify({ event, data })}\n\n`)
        }

        writeSSE('log', {
            phase: 'input',
            type: 'request',
            payload: {
                flowData,
                instruction: instruction || 'Auto-generate LangGraph code from current flow JSON',
                requestedModel: typeof requestedModel === 'string' ? requestedModel : undefined
            }
        })

        const { code, model, artifact } = await agentflowv2Service.generateLangGraphCodeStream(
            flowData,
            instruction,
            (log) => {
                writeSSE('log', log)
            },
            (phase, token) => {
                writeSSE('token', { phase, token })
            },
            typeof requestedModel === 'string' ? requestedModel : undefined
        )

        const startResponse = {
            event: 'start',
            data: {
                model,
                artifact
            }
        }
        writeSSE('start', startResponse)

        // Tokens are streamed live via onToken callback above.

        const endResponse = {
            event: 'end',
            data: '[DONE]',
            code
        }
        writeSSE('end', endResponse)
        res.end()
    } catch (error) {
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
        }
        const errorResponse = {
            event: 'error',
            data: error instanceof Error ? error.message : 'LangGraph generation failed'
        }
        res.write('event: error\n')
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`)
        res.end()
    }
}

export default {
    generateAgentflowv2,
    generateLangGraphCodeStream,
    listOpenAIChatModels
}
