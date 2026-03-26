import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { Chip, Box, Stack, ToggleButton, ToggleButtonGroup, IconButton, Paper, Typography, Button, MenuItem, Select } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { gridSpacing } from '@/store/constant'
import AgentsEmptySVG from '@/assets/images/agents_empty.svg'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import MoreItemsTooltip from '@/ui-component/tooltip/MoreItemsTooltip'
import { getRedesignPalette, redesignShadows, redesignTypography } from '@/views/redesign/styles'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL, AGENTFLOW_ICONS } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconPlus, IconLayoutGrid, IconList, IconX, IconAlertTriangle, IconPencil, IconPlayerPlayFilled } from '@tabler/icons-react'

// ==============================|| AGENTS ||============================== //

const AgentPipelineCard = ({ data, images, icons, palette, onClick }) => {
    const nodes = [
        ...(images || []).map((item) => ({ label: item.label, kind: 'image', src: item.imageSrc })),
        ...(icons || []).map((item) => ({ label: item.name, kind: 'icon', icon: item.icon, color: item.color }))
    ]
    const tags = nodes.slice(0, 3)
    const remainingTags = nodes.slice(3).map((node) => ({ label: node.label }))
    const moreCount = Math.max(0, nodes.length - 3)
    const seed = (data?.id || data?.name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const dummyRuns = (seed % 3800) + 120
    const dummyAvg = (((seed % 95) + 10) / 10).toFixed(1)
    const titleIcons = ['⚡', '🏥', '📊', '👤', '🔒', '📦', '🧠', '🛠️', '💬', '🧩']
    const titleIcon = titleIcons[seed % titleIcons.length]

    return (
        <Paper
            onClick={onClick}
            sx={{
                borderRadius: 3,
                border: `1px solid ${palette.border}`,
                boxShadow: redesignShadows.sm,
                p: 0,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, #e8633a, #1b5e8e)',
                    opacity: 0,
                    transition: 'opacity 0.18s ease'
                },
                '&:hover': { boxShadow: redesignShadows.lg, borderColor: palette.border2, transform: 'translateY(-1px)' },
                '&:hover::before': { opacity: 1 }
            }}
        >
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '78%' }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 2,
                                bgcolor: palette.surface2,
                                border: `1px solid ${palette.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0
                            }}
                        >
                            {titleIcon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.94rem', fontWeight: 700, color: palette.text }} noWrap>
                                {data.name}
                            </Typography>
                            <Typography
                                sx={{ ...redesignTypography.eyebrow, color: palette.textMuted, mt: 0.25, fontSize: '0.6rem' }}
                                noWrap
                            >
                                WORKFLOW · ORCHESTRATION
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        size='small'
                        label='Active'
                        sx={{ height: 18, bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '0.62rem' }}
                    />
                </Box>
                <Typography
                    sx={{
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        color: palette.textDim,
                        minHeight: 38,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {data.description || 'Orchestrates multi-agent workflow with reusable tools and connectors.'}
                </Typography>
                <Stack direction='row' spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 0.75 }}>
                    {tags.map((tag, idx) => (
                        <Chip
                            key={idx}
                            size='small'
                            label={tag.label}
                            sx={{
                                height: 21,
                                borderRadius: 1.5,
                                bgcolor: palette.surface2,
                                border: `1px solid ${palette.border}`,
                                fontSize: '0.68rem'
                            }}
                        />
                    ))}
                    {moreCount > 0 && (
                        <MoreItemsTooltip images={remainingTags}>
                            <Chip
                                size='small'
                                label={`+${moreCount} more`}
                                sx={{
                                    height: 21,
                                    borderRadius: 1.5,
                                    bgcolor: palette.primaryGlow,
                                    color: palette.primary,
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    cursor: 'pointer'
                                }}
                            />
                        </MoreItemsTooltip>
                    )}
                </Stack>
            </Box>
            <Box
                sx={{
                    borderTop: `1px solid ${palette.border}`,
                    px: 2,
                    py: 1.25,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Typography sx={{ fontSize: '0.72rem', color: palette.textMuted }}>
                    <strong style={{ color: palette.text }}>{dummyRuns.toLocaleString()}</strong> runs &nbsp;{' '}
                    <strong style={{ color: palette.text }}>{dummyAvg}s</strong> avg
                </Typography>
                <Stack direction='row' spacing={0.75}>
                    <Button
                        size='small'
                        sx={{
                            minWidth: 30,
                            width: 30,
                            height: 28,
                            p: 0,
                            borderRadius: 1.5,
                            border: `1px solid ${palette.border}`,
                            color: palette.textMuted
                        }}
                    >
                        <IconPencil size={13} />
                    </Button>
                    <Button
                        size='small'
                        sx={{
                            minWidth: 30,
                            width: 30,
                            height: 28,
                            p: 0,
                            borderRadius: 1.5,
                            border: `1px solid ${palette.border}`,
                            color: palette.textMuted
                        }}
                    >
                        <IconPlayerPlayFilled size={13} />
                    </Button>
                </Stack>
            </Box>
        </Paper>
    )
}

AgentPipelineCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    icons: PropTypes.array,
    palette: PropTypes.object,
    onClick: PropTypes.func
}

const Agentflows = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const palette = getRedesignPalette(theme, customization.isDarkMode)

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [icons, setIcons] = useState({})
    const [search, setSearch] = useState('')
    const { error, setError } = useError()

    const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
    const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')
    const [agentflowVersion, setAgentflowVersion] = useState(localStorage.getItem('agentFlowVersion') || 'v2')
    const [showDeprecationNotice, setShowDeprecationNotice] = useState(true)
    const [selectedFilter, setSelectedFilter] = useState('All')

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit, agentflowVersion)
    }

    const refresh = (page, limit, nextView) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllAgentflows.request(nextView === 'v2' ? 'AGENTFLOW' : 'MULTIAGENT', params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('flowDisplayStyle', nextView)
        setView(nextView)
    }

    const handleVersionChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('agentFlowVersion', nextView)
        setAgentflowVersion(nextView)
        refresh(1, pageLimit, nextView)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterFlows(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
            data.id.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    const addNew = () => {
        if (agentflowVersion === 'v2') {
            navigate('/v2/agentcanvas')
        } else {
            navigate('/agentcanvas')
        }
    }

    const goToCanvas = (selectedAgentflow) => {
        if (selectedAgentflow.type === 'AGENTFLOW') {
            navigate(`/v2/agentcanvas/${selectedAgentflow.id}`)
        } else {
            navigate(`/agentcanvas/${selectedAgentflow.id}`)
        }
    }

    const handleDismissDeprecationNotice = () => {
        setShowDeprecationNotice(false)
    }

    useEffect(() => {
        refresh(currentPage, pageLimit, agentflowVersion)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAgentflows.error) {
            setError(getAllAgentflows.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllAgentflows.error])

    useEffect(() => {
        setLoading(getAllAgentflows.loading)
    }, [getAllAgentflows.loading])

    useEffect(() => {
        if (getAllAgentflows.data) {
            try {
                const agentflows = getAllAgentflows.data?.data
                setTotal(getAllAgentflows.data?.total)
                const images = {}
                const icons = {}
                for (let i = 0; i < agentflows.length; i += 1) {
                    const flowDataStr = agentflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[agentflows[i].id] = []
                    icons[agentflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        if (nodes[j].data.name === 'stickyNote' || nodes[j].data.name === 'stickyNoteAgentflow') continue
                        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodes[j].data.name)
                        if (foundIcon) {
                            icons[agentflows[i].id].push(foundIcon)
                        } else {
                            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                            if (!images[agentflows[i].id].some((img) => img.imageSrc === imageSrc)) {
                                images[agentflows[i].id].push({
                                    imageSrc,
                                    label: nodes[j].data.label
                                })
                            }
                        }
                    }
                }
                setImages(images)
                setIcons(icons)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllAgentflows.data])

    return (
        <MainCard sx={{ background: palette.pageBg, boxShadow: 'none' }}>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 2.2 }}>
                    <Box display='grid' gridTemplateColumns='repeat(4, 1fr)' gap={1.2}>
                        {[
                            { label: 'Total Pipelines', value: '24', meta: '↑ 4 this week' },
                            { label: 'Active Runs', value: '7', meta: 'live' },
                            { label: 'Executions Today', value: '312', meta: '↑ 18%' },
                            { label: 'Avg. Success Rate', value: '98.2%', meta: 'uptime' }
                        ].map((stat) => (
                            <Box
                                key={stat.label}
                                sx={{
                                    border: 1,
                                    borderColor: palette.border,
                                    bgcolor: palette.surface,
                                    borderRadius: 3,
                                    p: 1.35,
                                    boxShadow: redesignShadows.sm
                                }}
                            >
                                <Box sx={{ ...redesignTypography.eyebrow, color: palette.textMuted, mb: 0.7, fontSize: '0.58rem' }}>
                                    {stat.label}
                                </Box>
                                <Box sx={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.1, color: palette.text }}>{stat.value}</Box>
                                <Box sx={{ fontSize: '0.64rem', fontWeight: 600, color: palette.textMuted, mt: 0.25 }}>{stat.meta}</Box>
                                <Box sx={{ height: 2.5, borderRadius: 2, bgcolor: palette.surface2, mt: 0.9, overflow: 'hidden' }}>
                                    <Box
                                        sx={{
                                            width: stat.label === 'Total Pipelines' ? '60%' : stat.label === 'Active Runs' ? '29%' : '78%',
                                            height: '100%',
                                            bgcolor:
                                                stat.label === 'Active Runs'
                                                    ? palette.primary
                                                    : stat.label === 'Avg. Success Rate'
                                                    ? '#16a34a'
                                                    : palette.accent
                                        }}
                                    />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                    <ViewHeader
                        redesign
                        controlHeight={34}
                        onSearchChange={onSearchChange}
                        search={true}
                        searchPlaceholder='Search Name or Category'
                        title='Agent Pipeline'
                        description='Multi-agent systems, workflow orchestration'
                    >
                        <ToggleButtonGroup
                            sx={{ borderRadius: 2, maxHeight: 34 }}
                            value={agentflowVersion}
                            color='primary'
                            exclusive
                            onChange={handleVersionChange}
                        >
                            {/* <ToggleButton
                                sx={{
                                    borderColor: palette.border,
                                    borderRadius: 2,
                                    color: palette.textDim,
                                    bgcolor: palette.surface,
                                    boxShadow: redesignShadows.sm
                                }}
                                variant='contained'
                                value='v2'
                                title='V2'
                            >
                                <Chip sx={{ mr: 1 }} label='NEW' size='small' color='primary' />
                                V2
                            </ToggleButton>
                            <ToggleButton
                                sx={{
                                    borderColor: palette.border,
                                    borderRadius: 2,
                                    color: palette.textDim,
                                    bgcolor: palette.surface,
                                    boxShadow: redesignShadows.sm
                                }}
                                variant='contained'
                                value='v1'
                                title='V1'
                            >
                                V1
                            </ToggleButton> */}
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                            sx={{ borderRadius: 2, maxHeight: 34, bgcolor: palette.surface2, border: `1px solid ${palette.border}` }}
                            value={view}
                            disabled={total === 0}
                            color='primary'
                            exclusive
                            onChange={handleChange}
                        >
                            <ToggleButton
                                sx={{
                                    borderColor: theme.palette.grey[900] + 25,
                                    borderRadius: 2,
                                    color: palette.textDim,
                                    px: 1,
                                    minWidth: 30,
                                    '&.Mui-selected': { bgcolor: palette.surface, color: palette.primary, boxShadow: redesignShadows.sm }
                                }}
                                variant='contained'
                                value='card'
                                title='Card View'
                            >
                                <IconLayoutGrid size={15} />
                            </ToggleButton>
                            <ToggleButton
                                sx={{
                                    borderColor: theme.palette.grey[900] + 25,
                                    borderRadius: 2,
                                    color: palette.textDim,
                                    px: 1,
                                    minWidth: 30,
                                    '&.Mui-selected': { bgcolor: palette.surface, color: palette.primary, boxShadow: redesignShadows.sm }
                                }}
                                variant='contained'
                                value='list'
                                title='List View'
                            >
                                <IconList size={15} />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <StyledPermissionButton
                            permissionId={'agentflows:create'}
                            variant='contained'
                            onClick={addNew}
                            startIcon={<IconPlus size={14} />}
                            sx={{ borderRadius: 2, height: 34, boxShadow: redesignShadows.sm, px: 1.5, fontSize: '0.74rem' }}
                        >
                            Add New
                        </StyledPermissionButton>
                    </ViewHeader>
                    <Stack direction='row' spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        {['All', 'Active', 'Draft', 'Scheduled', 'Error'].map((chip) => (
                            <Chip
                                key={chip}
                                label={chip}
                                clickable
                                onClick={() => setSelectedFilter(chip)}
                                sx={{
                                    borderRadius: 5,
                                    border: 1,
                                    borderColor: selectedFilter === chip ? palette.accent : palette.border,
                                    bgcolor: selectedFilter === chip ? palette.accentGlow : palette.surface,
                                    color: selectedFilter === chip ? palette.accent : palette.textDim,
                                    fontSize: '0.7rem',
                                    fontWeight: selectedFilter === chip ? 600 : 500,
                                    height: 26
                                }}
                            />
                        ))}
                        {['Salesforce', 'HR', 'Finance', 'IT Ops'].map((chip) => (
                            <Chip
                                key={chip}
                                label={chip}
                                clickable
                                sx={{
                                    borderRadius: 5,
                                    border: `1px solid ${palette.border}`,
                                    bgcolor: palette.surface,
                                    color: palette.textDim,
                                    fontSize: '0.7rem',
                                    height: 26
                                }}
                            />
                        ))}
                        <Select
                            size='small'
                            defaultValue='Sort: Recently Updated'
                            sx={{
                                ml: 'auto',
                                height: 28,
                                borderRadius: 2,
                                bgcolor: palette.surface,
                                fontSize: '0.74rem',
                                boxShadow: redesignShadows.sm,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.border }
                            }}
                        >
                            <MenuItem value='Sort: Recently Updated'>Sort: Recently Updated</MenuItem>
                            <MenuItem value='Sort: Name A-Z'>Sort: Name A-Z</MenuItem>
                            <MenuItem value='Sort: Most Runs'>Sort: Most Runs</MenuItem>
                        </Select>
                    </Stack>

                    {/* Deprecation Notice For V1 */}
                    {agentflowVersion === 'v1' && showDeprecationNotice && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: 2,
                                background: customization.isDarkMode
                                    ? 'linear-gradient(135deg,rgba(165, 128, 6, 0.31) 0%, #ffcc802f 100%)'
                                    : 'linear-gradient(135deg, #fff8e17a 0%, #ffcc804a 100%)',
                                color: customization.isDarkMode ? 'white' : '#333333',
                                fontWeight: 400,
                                borderRadius: 2,
                                gap: 1.5
                            }}
                        >
                            <IconAlertTriangle
                                size={20}
                                style={{
                                    color: customization.isDarkMode ? '#ffcc80' : '#f57c00',
                                    flexShrink: 0
                                }}
                            />
                            <Box sx={{ flex: 1 }}>
                                <strong>V1 Agentflows are deprecated.</strong> We recommend migrating to V2 for improved performance and
                                continued support.
                            </Box>
                            <IconButton
                                aria-label='dismiss'
                                size='small'
                                onClick={handleDismissDeprecationNotice}
                                sx={{
                                    color: customization.isDarkMode ? '#ffcc80' : '#f57c00',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 204, 128, 0.1)'
                                    }
                                }}
                            >
                                <IconX size={16} />
                            </IconButton>
                        </Box>
                    )}
                    {!isLoading && total > 0 && (
                        <>
                            {!view || view === 'card' ? (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    {getAllAgentflows.data?.data.filter(filterFlows).map((data, index) => (
                                        <AgentPipelineCard
                                            key={index}
                                            onClick={() => goToCanvas(data)}
                                            data={data}
                                            images={images[data.id]}
                                            icons={icons[data.id]}
                                            palette={palette}
                                        />
                                    ))}
                                </Box>
                            ) : (
                                <FlowListTable
                                    redesign
                                    isAgentCanvas={true}
                                    isAgentflowV2={agentflowVersion === 'v2'}
                                    data={getAllAgentflows.data?.data}
                                    images={images}
                                    icons={icons}
                                    isLoading={isLoading}
                                    filterFunction={filterFlows}
                                    updateFlowsApi={getAllAgentflows}
                                    setError={setError}
                                    currentPage={currentPage}
                                    pageLimit={pageLimit}
                                />
                            )}
                            {/* Pagination and Page Size Controls */}
                            <TablePagination redesign currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                        </>
                    )}

                    {!isLoading && total === 0 && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '12vh', width: 'auto' }}
                                    src={AgentsEmptySVG}
                                    alt='AgentsEmptySVG'
                                />
                            </Box>
                            <div>No Agents Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}
            <ConfirmDialog />
        </MainCard>
    )
}

export default Agentflows
