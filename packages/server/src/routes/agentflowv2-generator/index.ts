import express from 'express'
import agentflowv2GeneratorController from '../../controllers/agentflowv2-generator'
const router = express.Router()

router.post('/generate', agentflowv2GeneratorController.generateAgentflowv2)
router.get('/openai-chat-models', agentflowv2GeneratorController.listOpenAIChatModels)
router.post('/langgraph-code/stream', agentflowv2GeneratorController.generateLangGraphCodeStream)

export default router
