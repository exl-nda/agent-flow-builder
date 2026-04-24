import { Request, Response, NextFunction } from 'express'
import agentflowv2Service, { getOpenAIChatModelsForLangGraph } from '../../services/agentflowv2-generator'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

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
        const { flowData, instruction, model: requestedModel, credentialId, codeType } = req.body || {}
        const normalizedCodeType = codeType === 'msFramework' ? 'msFramework' : 'langgraph'
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
                requestedModel: typeof requestedModel === 'string' ? requestedModel : undefined,
                credentialId: typeof credentialId === 'string' ? credentialId : undefined,
                codeType: normalizedCodeType
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
            typeof requestedModel === 'string' ? requestedModel : undefined,
            {
                credentialId: typeof credentialId === 'string' ? credentialId : undefined,
                workspaceId: req.user?.activeWorkspaceId
            },
            normalizedCodeType
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

const getGeneratedWorkbenchCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.chatflowId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'chatflowId is required')
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `workspace ${workspaceId} not found`)
        }

        const normalizedCodeType = req.params.codeType === 'msFramework' ? 'msFramework' : 'langgraph'
        const record = await agentflowv2Service.getGeneratedWorkbenchCode(req.params.chatflowId, normalizedCodeType, workspaceId)
        return res.json({
            chatflowId: req.params.chatflowId,
            codeType: normalizedCodeType,
            code: record?.code || '',
            updatedDate: record?.updatedDate || null
        })
    } catch (error) {
        next(error)
    }
}

const saveGeneratedWorkbenchCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId, codeType, code } = req.body || {}
        if (!chatflowId || typeof chatflowId !== 'string') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'chatflowId is required')
        }
        if (typeof code !== 'string') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'code is required')
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `workspace ${workspaceId} not found`)
        }

        const normalizedCodeType = codeType === 'msFramework' ? 'msFramework' : 'langgraph'
        const saved = await agentflowv2Service.upsertGeneratedWorkbenchCode({
            chatflowId,
            codeType: normalizedCodeType,
            code,
            workspaceId
        })
        return res.json({
            id: saved.id,
            chatflowId: saved.chatflowId,
            codeType: saved.codeType,
            code: saved.code,
            updatedDate: saved.updatedDate
        })
    } catch (error) {
        next(error)
    }
}

export default {
    generateAgentflowv2,
    generateLangGraphCodeStream,
    listOpenAIChatModels,
    getGeneratedWorkbenchCode,
    saveGeneratedWorkbenchCode
}
