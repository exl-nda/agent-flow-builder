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
import { python } from '@codemirror/lang-python'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { sublime } from '@uiw/codemirror-theme-sublime'
import chatflowsApi from '@/api/chatflows'

const DEFAULT_MODEL = 'gpt-5.1'
const DEFAULT_CODE_TYPE = 'langgraph'
const CODE_TYPE_OPTIONS = [
    { label: 'LangGraph Code', value: 'langgraph' },
    { label: 'MS Framework Code', value: 'msFramework' }
]

const LangGraphWorkbenchDialog = ({ open, chatflow, initialCode, onClose }) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const [editorCode, setEditorCode] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState('')
    const [selectedCodeType, setSelectedCodeType] = useState(DEFAULT_CODE_TYPE)
    const [generatedCodeByType, setGeneratedCodeByType] = useState({
        langgraph: initialCode || '',
        msFramework: ''
    })
    const [updatedDateByType, setUpdatedDateByType] = useState({
        langgraph: null,
        msFramework: null
    })
    const [loadedCodeTypes, setLoadedCodeTypes] = useState({
        langgraph: false,
        msFramework: false
    })
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

    const formatLastUpdated = useCallback((updatedDate) => {
        if (!updatedDate) return 'N/A'
        const parsedDate = new Date(updatedDate)
        if (Number.isNaN(parsedDate.getTime())) return 'N/A'
        return parsedDate.toLocaleString()
    }, [])

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
        if (!initialCode) return
        setGeneratedCodeByType((prev) => ({
            ...prev,
            langgraph: prev.langgraph || initialCode
        }))
    }, [initialCode])

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

            const activeCodeType = selectedCodeType
            const generatedTypeLabel = activeCodeType === 'msFramework' ? 'MS Framework' : 'LangGraph'
            let streamedCode = ''
            const effectiveInstruction = instruction?.trim() || `Generate ${generatedTypeLabel} code from current flow JSON`
            const artifactPayload = JSON.stringify(
                {
                    instruction: effectiveInstruction,
                    flowData,
                    codeType: selectedCodeType
                },
                null,
                2
            )

            appendMessage({
                role: 'artifact',
                title: `${generatedTypeLabel} Prompt Artifact`,
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
                        model: selectedModel,
                        codeType: activeCodeType
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
                                        setGeneratedCodeByType((prev) => ({
                                            ...prev,
                                            [activeCodeType]: ''
                                        }))
                                        appendMessage({
                                            role: 'assistant',
                                            content: `Streaming code for phase: ${tokenPhase}`
                                        })
                                    }
                                    setEditorCode((prev) => {
                                        const nextCode = prev + event.data.token
                                        streamedCode = nextCode
                                        setGeneratedCodeByType((prevCodeMap) => ({
                                            ...prevCodeMap,
                                            [activeCodeType]: nextCode
                                        }))
                                        return nextCode
                                    })
                                    scrollEditorToBottom()
                                }
                                break
                            case 'end':
                                appendMessage({
                                    role: 'assistant',
                                    content: 'Generation complete.'
                                })
                                if (chatflow?.id && streamedCode) {
                                    const savedCode = await chatflowsApi.saveGeneratedWorkbenchCode({
                                        chatflowId: chatflow.id,
                                        codeType: activeCodeType,
                                        code: streamedCode
                                    })
                                    setUpdatedDateByType((prev) => ({
                                        ...prev,
                                        [activeCodeType]: savedCode?.data?.updatedDate || null
                                    }))
                                    setLoadedCodeTypes((prev) => ({
                                        ...prev,
                                        [activeCodeType]: true
                                    }))
                                }
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
        [appendMessage, chatflow?.flowData, chatflow?.id, selectedCodeType, selectedModel, scrollEditorToBottom]
    )

    useEffect(() => {
        if (!open) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            setLoadedCodeTypes({
                langgraph: false,
                msFramework: false
            })
        }
    }, [open])

    useEffect(() => {
        if (!open || !chatflow?.id) return
        if (loadedCodeTypes[selectedCodeType]) return

        let cancelled = false
        ;(async () => {
            try {
                const res = await chatflowsApi.getGeneratedWorkbenchCode(chatflow.id, selectedCodeType)
                if (cancelled) return
                const code = res?.data?.code || ''
                setGeneratedCodeByType((prev) => ({
                    ...prev,
                    [selectedCodeType]: code || prev[selectedCodeType]
                }))
                setUpdatedDateByType((prev) => ({
                    ...prev,
                    [selectedCodeType]: res?.data?.updatedDate || null
                }))
                setLoadedCodeTypes((prev) => ({
                    ...prev,
                    [selectedCodeType]: true
                }))
            } catch (e) {
                if (!cancelled) {
                    console.error('Failed to load generated workbench code:', e)
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [open, chatflow?.id, selectedCodeType, loadedCodeTypes])

    useEffect(() => {
        setEditorCode(generatedCodeByType[selectedCodeType] || '')
    }, [generatedCodeByType, selectedCodeType])

    const handleGenerate = async () => {
        if (isGenerating) return
        const userInstruction = chatInput.trim()
        if (userInstruction) {
            appendMessage({ role: 'user', content: userInstruction })
            setChatInput('')
        } else {
            appendMessage({
                role: 'assistant',
                content: `Generating ${selectedCodeType === 'msFramework' ? 'MS Framework' : 'LangGraph'} code from flow JSON.`
            })
        }
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
                            Pick code type, optionally add instruction, then click Generate.
                        </Typography>
                        <FormControl size='small' sx={{ mb: 1.5 }} disabled={isGenerating}>
                            <InputLabel id='workbench-code-type-select-label'>Code Type</InputLabel>
                            <Select
                                labelId='workbench-code-type-select-label'
                                id='workbench-code-type-select'
                                value={selectedCodeType}
                                label='Code Type'
                                onChange={(e) => setSelectedCodeType(e.target.value)}
                            >
                                {CODE_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
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
                                        handleGenerate()
                                    }
                                }}
                            />
                            <Button variant='contained' onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </Button>
                        </Stack>
                    </Paper>

                    <Paper variant='outlined' sx={{ flex: 1.6, p: 2, display: 'flex', flexDirection: 'column', minWidth: 420 }}>
                        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }} flexWrap='wrap' gap={1}>
                            <Box>
                                <Typography variant='h4'>Code Editor</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                    Last updated on: {formatLastUpdated(updatedDateByType[selectedCodeType])}
                                </Typography>
                            </Box>
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
                            extensions={[python(), EditorView.lineWrapping]}
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
    initialCode: PropTypes.string,
    onClose: PropTypes.func
}

export default LangGraphWorkbenchDialog
