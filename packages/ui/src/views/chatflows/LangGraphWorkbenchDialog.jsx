import { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { sublime } from '@uiw/codemirror-theme-sublime'
import chatflowsApi from '@/api/chatflows'

const DEFAULT_MODEL = 'gpt-5.1'

const LangGraphWorkbenchDialog = ({ open, chatflow, onClose }) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const [editorCode, setEditorCode] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState('')
    const hasAutoSentRef = useRef(false)
    const abortControllerRef = useRef(null)
    const [expandedEntries, setExpandedEntries] = useState({})
    const [modelOptions, setModelOptions] = useState([])
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
    const chatScrollRef = useRef(null)
    const editorViewRef = useRef(null)
    const currentTokenPhaseRef = useRef('')

    const parseSSEEvent = (eventBlock) => {
        const lines = eventBlock.split('\n')
        const event = {}

        for (const line of lines) {
            if (line.startsWith('event:')) {
                event.event = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
                const dataStr = line.substring(5).trim()
                try {
                    const parsed = JSON.parse(dataStr)
                    event.data = parsed?.data
                } catch (e) {
                    console.error('Failed to parse stream event:', e)
                }
            }
        }

        return event
    }

    const appendMessage = useCallback((msg) => {
        setChatMessages((prev) => [...prev, msg])
    }, [])

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
        }
    }, [chatMessages, generationError, isGenerating])

    const getArtifactPreview = (content) => {
        if (!content) return ''
        const lines = content.split('\n')
        if (lines.length <= 4) return content
        return `${lines.slice(0, 4).join('\n')}\n...`
    }

    const formatLogContent = (data) => {
        try {
            return JSON.stringify(data, null, 2)
        } catch (e) {
            return String(data)
        }
    }

    const effectiveModelOptions =
        modelOptions.length > 0
            ? modelOptions.some((m) => m.name === DEFAULT_MODEL)
                ? modelOptions
                : [{ label: DEFAULT_MODEL, name: DEFAULT_MODEL }, ...modelOptions]
            : [{ label: `${DEFAULT_MODEL} (loading list…)`, name: DEFAULT_MODEL }]

    const scrollEditorToBottom = useCallback(() => {
        const view = editorViewRef.current
        if (!view?.scrollDOM) return
        view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight
    }, [])

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text || '')
        } catch (e) {
            console.error('Failed to copy log content:', e)
        }
    }

    useEffect(() => {
        if (!open) return undefined
        let cancelled = false
        ;(async () => {
            try {
                const res = await chatflowsApi.getLangGraphOpenAIModels()
                const models = res?.data?.models
                if (cancelled || !Array.isArray(models) || models.length === 0) return
                setModelOptions(models)
                setSelectedModel((prev) => {
                    if (prev === DEFAULT_MODEL) return DEFAULT_MODEL
                    if (models.some((m) => m.name === prev)) return prev
                    return DEFAULT_MODEL
                })
            } catch (e) {
                console.error('Failed to load OpenAI models for LangGraph workbench:', e)
                if (!cancelled) {
                    setModelOptions([{ label: DEFAULT_MODEL, name: DEFAULT_MODEL }])
                    setSelectedModel(DEFAULT_MODEL)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [open])

    useEffect(() => {
        if (!isGenerating) return
        const raf = requestAnimationFrame(() => {
            scrollEditorToBottom()
        })
        return () => cancelAnimationFrame(raf)
    }, [editorCode, isGenerating, scrollEditorToBottom])

    const streamLangGraphCode = useCallback(
        async (instruction) => {
            let flowData = {}
            try {
                flowData = chatflow?.flowData ? JSON.parse(chatflow.flowData) : {}
            } catch (e) {
                setGenerationError('Invalid flow JSON. Please save and try again.')
                return
            }

            const effectiveInstruction = instruction?.trim() || 'Generate LangGraph code from current flow JSON'
            const artifactPayload = JSON.stringify(
                {
                    instruction: effectiveInstruction,
                    flowData
                },
                null,
                2
            )

            appendMessage({
                role: 'artifact',
                title: 'Auto Prompt Artifact',
                content: artifactPayload
            })

            setEditorCode('')
            setGenerationError('')
            setIsGenerating(true)
            currentTokenPhaseRef.current = ''

            const abortController = new AbortController()
            abortControllerRef.current = abortController

            try {
                const response = await fetch('/api/v1/agentflowv2-generator/langgraph-code/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-request-from': 'internal'
                    },
                    credentials: 'include',
                    signal: abortController.signal,
                    body: JSON.stringify({
                        flowData,
                        instruction: effectiveInstruction,
                        model: selectedModel
                    })
                })

                if (!response.ok) {
                    throw new Error(`Generation request failed with status ${response.status}`)
                }
                if (!response.body) {
                    throw new Error('Streaming response body is not available.')
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''
                let done = false

                while (!done) {
                    const result = await reader.read()
                    done = result.done
                    if (done) break

                    buffer += decoder.decode(result.value, { stream: true })
                    const blocks = buffer.split('\n\n')
                    buffer = blocks.pop() || ''

                    for (const block of blocks) {
                        if (!block.trim()) continue
                        const event = parseSSEEvent(block)
                        switch (event.event) {
                            case 'start':
                                appendMessage({
                                    role: 'assistant',
                                    content: `Generating with model: ${event.data?.model || 'openai'}`
                                })
                                break
                            case 'token':
                                if (typeof event.data?.token === 'string') {
                                    const tokenPhase = event.data?.phase || 'generation'
                                    if (currentTokenPhaseRef.current !== tokenPhase) {
                                        currentTokenPhaseRef.current = tokenPhase
                                        setEditorCode('')
                                        appendMessage({
                                            role: 'assistant',
                                            content: `Streaming code for phase: ${tokenPhase}`
                                        })
                                    }
                                    setEditorCode((prev) => prev + event.data.token)
                                    scrollEditorToBottom()
                                }
                                break
                            case 'end':
                                appendMessage({
                                    role: 'assistant',
                                    content: 'Generation complete.'
                                })
                                break
                            case 'log':
                                appendMessage({
                                    role: 'log',
                                    title: `Log: ${event.data?.phase || 'unknown'} / ${event.data?.type || 'event'}`,
                                    content: formatLogContent(event.data?.payload ?? event.data)
                                })
                                break
                            case 'error':
                                setGenerationError(typeof event.data === 'string' ? event.data : 'Generation failed.')
                                appendMessage({
                                    role: 'assistant',
                                    content: `Error: ${typeof event.data === 'string' ? event.data : 'Generation failed.'}`
                                })
                                break
                            default:
                                break
                        }
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    const msg = error.message || 'Generation failed.'
                    setGenerationError(msg)
                    appendMessage({ role: 'assistant', content: `Error: ${msg}` })
                }
            } finally {
                setIsGenerating(false)
            }
        },
        [appendMessage, chatflow?.flowData, selectedModel]
    )

    useEffect(() => {
        if (open && !hasAutoSentRef.current) {
            hasAutoSentRef.current = true
            setChatMessages([])
            setChatInput('')
            setEditorCode('')
            setGenerationError('')
            setExpandedEntries({})
            appendMessage({
                role: 'assistant',
                content: 'Workbench opened. Auto-sending flow JSON to generate LangGraph code.'
            })
            streamLangGraphCode('')
        }
        if (!open) {
            hasAutoSentRef.current = false
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [appendMessage, open, streamLangGraphCode])

    const handleSend = async () => {
        if (!chatInput.trim() || isGenerating) return
        const userInstruction = chatInput.trim()
        appendMessage({ role: 'user', content: userInstruction })
        setChatInput('')
        await streamLangGraphCode(userInstruction)
    }

    const handleRegenerate = async () => {
        if (isGenerating) return
        await streamLangGraphCode('')
    }

    const handleRunPython = () => {
        appendMessage({
            role: 'assistant',
            content: 'Run Python is coming next. Backend execution API is not wired yet.'
        })
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth='xl'>
            <DialogTitle>LangGraph Workbench</DialogTitle>
            <DialogContent sx={{ px: 2, pb: 2 }}>
                <Stack direction='row' spacing={2} sx={{ height: '75vh', minHeight: 560 }}>
                    <Paper variant='outlined' sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', minWidth: 320 }}>
                        <Typography variant='h4' sx={{ mb: 1 }}>
                            Chat
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ mb: 2 }}>
                            Chat instructions will regenerate code using OpenAI and stream it into the editor.
                        </Typography>
                        <Box
                            ref={chatScrollRef}
                            sx={{
                                flex: 1,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                p: 1.5,
                                overflowY: 'auto',
                                backgroundColor: theme.palette.background.default
                            }}
                        >
                            {chatMessages.map((msg, index) => (
                                <Box
                                    key={`${msg.role}-${index}`}
                                    sx={{
                                        mb: 1.5,
                                        display: 'flex',
                                        justifyContent: msg.role === 'artifact' || msg.role === 'user' ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            maxWidth: '92%',
                                            borderRadius: 1,
                                            p: 1,
                                            backgroundColor:
                                                msg.role === 'artifact'
                                                    ? theme.palette.primary.light
                                                    : msg.role === 'log'
                                                      ? theme.palette.mode === 'dark'
                                                          ? theme.palette.grey[900]
                                                          : theme.palette.grey[100]
                                                    : msg.role === 'assistant'
                                                      ? theme.palette.background.paper
                                                      : theme.palette.secondary.light
                                        }}
                                    >
                                        <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                                                {msg.title || msg.role}
                                            </Typography>
                                            {msg.role === 'log' && (
                                                <Tooltip title='Copy log'>
                                                    <IconButton size='small' onClick={() => copyToClipboard(msg.content)}>
                                                        <ContentCopyIcon fontSize='inherit' />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                whiteSpace: msg.role === 'artifact' || msg.role === 'log' ? 'pre-wrap' : 'normal',
                                                fontFamily:
                                                    msg.role === 'artifact' || msg.role === 'log'
                                                        ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace'
                                                        : 'inherit',
                                                fontSize: msg.role === 'artifact' || msg.role === 'log' ? 12 : 14
                                            }}
                                        >
                                            {msg.role === 'artifact' || msg.role === 'log'
                                                ? expandedEntries[index]
                                                    ? msg.content
                                                    : getArtifactPreview(msg.content)
                                                : msg.content}
                                        </Typography>
                                        {(msg.role === 'artifact' || msg.role === 'log') && (
                                            <Button
                                                size='small'
                                                sx={{ mt: 0.5, px: 0, minWidth: 0, textTransform: 'none' }}
                                                onClick={() =>
                                                    setExpandedEntries((prev) => ({
                                                        ...prev,
                                                        [index]: !prev[index]
                                                    }))
                                                }
                                            >
                                                {expandedEntries[index]
                                                    ? 'Show less'
                                                    : msg.role === 'artifact'
                                                      ? 'Show full artifact'
                                                      : 'Show full log'}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                        <Stack direction='row' spacing={1} sx={{ mt: 1.5 }}>
                            <TextField
                                fullWidth
                                size='small'
                                placeholder='Ask to modify code...'
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                            />
                            <Button variant='contained' onClick={handleSend} disabled={!chatInput.trim() || isGenerating}>
                                Send
                            </Button>
                        </Stack>
                    </Paper>

                    <Paper variant='outlined' sx={{ flex: 1.6, p: 2, display: 'flex', flexDirection: 'column', minWidth: 420 }}>
                        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }} flexWrap='wrap' gap={1}>
                            <Typography variant='h4'>Code Editor</Typography>
                            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                                <FormControl size='small' sx={{ minWidth: 220 }} disabled={isGenerating}>
                                    <InputLabel id='langgraph-model-select-label'>Model</InputLabel>
                                    <Select
                                        labelId='langgraph-model-select-label'
                                        id='langgraph-model-select'
                                        value={
                                            effectiveModelOptions.some((m) => m.name === selectedModel)
                                                ? selectedModel
                                                : effectiveModelOptions[0].name
                                        }
                                        label='Model'
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                    >
                                        {effectiveModelOptions.map((m) => (
                                            <MenuItem key={m.name} value={m.name}>
                                                {m.label || m.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button variant='outlined' size='small' onClick={handleRegenerate} disabled={isGenerating}>
                                    {isGenerating ? 'Generating...' : 'Regenerate'}
                                </Button>
                                <Button variant='contained' color='secondary' size='small' onClick={handleRunPython}>
                                    Run Python
                                </Button>
                            </Stack>
                        </Stack>
                        {generationError && (
                            <Alert severity='error' sx={{ mb: 1 }}>
                                {generationError}
                            </Alert>
                        )}
                        <CodeMirror
                            value={editorCode}
                            height='430px'
                            theme={isDarkMode ? vscodeDark : sublime}
                            onChange={(value) => setEditorCode(value)}
                            onCreateEditor={(view) => {
                                editorViewRef.current = view
                                scrollEditorToBottom()
                            }}
                            extensions={[EditorView.lineWrapping]}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: true,
                                highlightActiveLine: true
                            }}
                        />
                    </Paper>
                </Stack>
            </DialogContent>
        </Dialog>
    )
}

LangGraphWorkbenchDialog.propTypes = {
    open: PropTypes.bool,
    chatflow: PropTypes.object,
    onClose: PropTypes.func
}

export default LangGraphWorkbenchDialog
