import { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Box, Stack, ButtonGroup, Skeleton, ToggleButtonGroup, ToggleButton, Chip, Paper, Typography, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ToolDialog from './ToolDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import { getRedesignPalette, redesignShadows, redesignTypography } from '@/views/redesign/styles'
import MoreItemsTooltip from '@/ui-component/tooltip/MoreItemsTooltip'

// API
import toolsApi from '@/api/tools'

// Hooks
import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { gridSpacing } from '@/store/constant'

// icons
import { IconPlus, IconFileUpload, IconLayoutGrid, IconList } from '@tabler/icons-react'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'

// ==============================|| TOOLS ||============================== //

const ToolParityCard = ({ data, palette, onClick, restricted = false }) => {
    const seed = (data?.id || data?.name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const usage = (seed % 1400) + 90
    const agentCount = (seed % 14) + 2
    const typePool = ['API · CRM', 'DATA · DATABASE', 'COMMUNICATION', 'ML · NLP', 'API · ITSM', 'UTILITY']
    const iconPool = ['🔵', '📊', '📧', '🧠', '🔧', '💬', '📈', '🔐']
    const type = typePool[seed % typePool.length]
    const toolIcon = iconPool[seed % iconPool.length]

    const schema = Array.isArray(data?.schema) ? data.schema : []
    const schemaTags = schema
        .slice(0, 3)
        .map((item) => item.property || item.name || item.type)
        .filter(Boolean)
    const fallbackTagPool = [
        ['REST', 'OAuth2', 'Bulk'],
        ['Snowflake', 'Read-only'],
        ['SMTP', 'Templates', 'Audit'],
        ['NLP', 'PII', 'Fine-tuned'],
        ['ITSM', 'Webhook'],
        ['Webhooks', 'Block Kit']
    ]
    const tags = schemaTags.length > 0 ? schemaTags : fallbackTagPool[seed % fallbackTagPool.length]
    const remaining = schema.slice(3).map((item) => ({ label: item.property || item.name || item.type }))

    return (
        <Paper
            onClick={!restricted ? onClick : undefined}
            sx={{
                p: 2,
                borderRadius: 3,
                border: `1px ${restricted ? 'dashed' : 'solid'} ${restricted ? 'rgba(124,58,237,0.3)' : palette.border}`,
                bgcolor: restricted ? '#faf8ff' : palette.surface,
                boxShadow: redesignShadows.sm,
                cursor: restricted ? 'default' : 'pointer',
                position: 'relative',
                '&:hover': restricted ? {} : { boxShadow: redesignShadows.lg, borderColor: palette.border2, transform: 'translateY(-1px)' }
            }}
        >
            {restricted && (
                <Chip
                    size='small'
                    label='Team Restricted'
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        bgcolor: '#ede9fe',
                        color: '#7c3aed'
                    }}
                />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.1 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#dbeafe',
                        fontSize: '1rem',
                        flexShrink: 0
                    }}
                >
                    {toolIcon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: palette.text }} noWrap>
                        {data.name}
                    </Typography>
                    <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted, fontSize: '0.62rem' }} noWrap>
                        {type}
                    </Typography>
                </Box>
            </Box>
            <Typography
                sx={{
                    fontSize: '0.76rem',
                    lineHeight: 1.5,
                    color: palette.textDim,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 36,
                    mb: 1
                }}
            >
                {data.description || 'External API tool for agent execution and orchestration workflows.'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Stack direction='row' spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {tags.map((tag, idx) => (
                        <Chip
                            key={idx}
                            size='small'
                            label={tag}
                            sx={{
                                height: 20,
                                fontSize: '0.62rem',
                                borderRadius: 1.3,
                                bgcolor: palette.surface2,
                                border: `1px solid ${palette.border}`
                            }}
                        />
                    ))}
                    {remaining.length > 0 && (
                        <MoreItemsTooltip images={remaining}>
                            <Chip
                                size='small'
                                label={`+${remaining.length} more`}
                                sx={{
                                    height: 20,
                                    fontSize: '0.62rem',
                                    borderRadius: 1.3,
                                    bgcolor: palette.primaryGlow,
                                    color: palette.primary,
                                    fontWeight: 700
                                }}
                            />
                        </MoreItemsTooltip>
                    )}
                </Stack>
                <Typography sx={{ fontSize: '0.66rem', color: palette.textMuted, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: palette.text, fontSize: '0.82rem' }}>{usage.toLocaleString()}</strong>
                    <br />
                    calls today
                </Typography>
            </Box>
            <Box
                sx={{
                    pt: 1,
                    mt: 1,
                    borderTop: `1px solid ${palette.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Typography
                    sx={{ fontSize: '0.7rem', color: restricted ? '#7c3aed' : palette.textMuted, fontWeight: restricted ? 700 : 500 }}
                >
                    {restricted ? `🔒 Team ${agentCount}` : `${agentCount} agents`}
                </Typography>
                <Button
                    size='small'
                    sx={{
                        border: `1px solid ${restricted ? 'rgba(124,58,237,0.35)' : palette.border}`,
                        bgcolor: restricted ? '#ede9fe' : palette.surface2,
                        color: restricted ? '#7c3aed' : palette.textDim,
                        borderRadius: 1.5,
                        px: 1.2,
                        minWidth: 0,
                        fontSize: '0.68rem',
                        fontWeight: 600
                    }}
                >
                    {restricted ? 'Request Access' : '+ Add to Agent'}
                </Button>
            </Box>
        </Paper>
    )
}

ToolParityCard.propTypes = {
    data: PropTypes.object,
    palette: PropTypes.object,
    onClick: PropTypes.func,
    restricted: PropTypes.bool
}

const Tools = () => {
    const theme = useTheme()
    const palette = getRedesignPalette(theme, theme?.customization?.isDarkMode)
    const getAllToolsApi = useApi(toolsApi.getAllTools)
    const { error, setError } = useError()

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('toolsDisplayStyle') || 'card')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const inputRef = useRef(null)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllToolsApi.request(params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Tool',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        refresh(currentPage, pageLimit)
    }

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterTools(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllToolsApi.loading)
    }, [getAllToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.data) {
            setTotal(getAllToolsApi.data.total)
        }
    }, [getAllToolsApi.data])

    return (
        <>
            <MainCard sx={{ background: palette.pageBg, boxShadow: 'none' }}>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 2.2 }}>
                        <ViewHeader
                            redesign
                            controlHeight={34}
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder='Search Tools'
                            title='Tools'
                            description='External functions or APIs the agent can use to take action'
                        >
                            <ToggleButtonGroup
                                sx={{ borderRadius: 2, maxHeight: 34, bgcolor: palette.surface2, border: `1px solid ${palette.border}` }}
                                value={view}
                                color='primary'
                                disabled={total === 0}
                                exclusive
                                onChange={handleChange}
                            >
                                <ToggleButton
                                    sx={{
                                        borderColor: palette.border,
                                        borderRadius: 2,
                                        color: palette.textDim,
                                        bgcolor: palette.surface,
                                        minWidth: 30,
                                        '&.Mui-selected': {
                                            bgcolor: palette.surface,
                                            color: palette.primary,
                                            boxShadow: redesignShadows.sm
                                        }
                                    }}
                                    variant='contained'
                                    value='card'
                                    title='Card View'
                                >
                                    <IconLayoutGrid size={15} />
                                </ToggleButton>
                                <ToggleButton
                                    sx={{
                                        borderColor: palette.border,
                                        borderRadius: 2,
                                        color: palette.textDim,
                                        bgcolor: palette.surface,
                                        minWidth: 30,
                                        '&.Mui-selected': {
                                            bgcolor: palette.surface,
                                            color: palette.primary,
                                            boxShadow: redesignShadows.sm
                                        }
                                    }}
                                    variant='contained'
                                    value='list'
                                    title='List View'
                                >
                                    <IconList size={15} />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PermissionButton
                                    permissionId={'tools:create'}
                                    variant='outlined'
                                    onClick={() => inputRef.current.click()}
                                    startIcon={<IconFileUpload size={14} />}
                                    sx={{
                                        borderRadius: 2,
                                        height: 34,
                                        borderColor: palette.border,
                                        color: palette.textDim,
                                        fontSize: '0.74rem'
                                    }}
                                >
                                    Load
                                </PermissionButton>
                                <input
                                    style={{ display: 'none' }}
                                    ref={inputRef}
                                    type='file'
                                    hidden
                                    accept='.json'
                                    onChange={(e) => handleFileUpload(e)}
                                />
                            </Box>
                            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                                <StyledPermissionButton
                                    permissionId={'tools:create'}
                                    variant='contained'
                                    onClick={addNew}
                                    startIcon={<IconPlus size={14} />}
                                    sx={{ borderRadius: 2, height: 34, fontSize: '0.74rem', px: 1.5, boxShadow: redesignShadows.sm }}
                                >
                                    Create
                                </StyledPermissionButton>
                            </ButtonGroup>
                        </ViewHeader>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                border: '1px solid #bfdbfe',
                                bgcolor: '#eff6ff',
                                borderRadius: 2.5,
                                px: 2,
                                py: 1.2
                            }}
                        >
                            <Box sx={{ fontSize: '0.76rem', fontWeight: 500, color: palette.textDim }}>
                                <strong>{total || 32} tools</strong> are available across your organization. Tools marked with a lock are
                                restricted to specific teams.
                            </Box>
                            <Chip
                                size='small'
                                label='🔒 4 team-restricted'
                                sx={{ ml: 'auto', fontSize: '0.64rem', bgcolor: '#ede9fe', color: '#7c3aed' }}
                            />
                        </Box>
                        <Stack direction='row' spacing={0} sx={{ borderBottom: 1, borderColor: palette.border }}>
                            {['All', 'APIs', 'Data', 'ML / AI', 'Communication', 'Utilities'].map((cat) => (
                                <Box
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    sx={{
                                        cursor: 'pointer',
                                        px: 2.1,
                                        py: 1.1,
                                        fontSize: '0.78rem',
                                        fontWeight: selectedCategory === cat ? 600 : 500,
                                        color: selectedCategory === cat ? palette.primary : palette.textMuted,
                                        borderBottom: 2,
                                        borderColor: selectedCategory === cat ? palette.primary : 'transparent'
                                    }}
                                >
                                    {cat}
                                </Box>
                            ))}
                        </Stack>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box
                                sx={{
                                    ...redesignTypography.sectionTitle,
                                    color: palette.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Box sx={{ width: 3, height: 14, bgcolor: palette.accent, borderRadius: 2 }} />
                                Organization Tools
                            </Box>
                            <Typography sx={{ fontSize: '0.72rem', color: palette.primary, fontWeight: 500 }}>View all →</Typography>
                        </Box>
                        {isLoading && (
                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                            </Box>
                        )}
                        {!isLoading && total > 0 && (
                            <>
                                {!view || view === 'card' ? (
                                    <>
                                        <Box
                                            display='grid'
                                            gridTemplateColumns={{
                                                xs: 'repeat(1, minmax(0, 1fr))',
                                                sm: 'repeat(2, minmax(0, 1fr))',
                                                md: 'repeat(3, minmax(0, 1fr))',
                                                lg: 'repeat(3, minmax(0, 1fr))',
                                                xl: 'repeat(6, minmax(0, 1fr))'
                                            }}
                                            gap={1.4}
                                        >
                                            {(getAllToolsApi.data?.data?.filter(filterTools) || []).slice(0, 6).map((data) => (
                                                <ToolParityCard data={data} key={data.id} onClick={() => edit(data)} palette={palette} />
                                            ))}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                            <Box
                                                sx={{
                                                    ...redesignTypography.sectionTitle,
                                                    color: palette.text,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1
                                                }}
                                            >
                                                <Box sx={{ width: 3, height: 14, bgcolor: palette.accent, borderRadius: 2 }} />
                                                Team-Restricted Tools
                                            </Box>
                                            <Typography sx={{ fontSize: '0.72rem', color: palette.primary, fontWeight: 500 }}>
                                                Request access →
                                            </Typography>
                                        </Box>
                                        <Box
                                            display='grid'
                                            gridTemplateColumns={{
                                                xs: 'repeat(1, minmax(0, 1fr))',
                                                sm: 'repeat(2, minmax(0, 1fr))',
                                                md: 'repeat(3, minmax(0, 1fr))',
                                                lg: 'repeat(3, minmax(0, 1fr))',
                                                xl: 'repeat(6, minmax(0, 1fr))'
                                            }}
                                            gap={1.4}
                                        >
                                            {(getAllToolsApi.data?.data?.filter(filterTools) || []).slice(0, 2).map((data) => (
                                                <ToolParityCard
                                                    data={data}
                                                    key={`${data.id}-restricted`}
                                                    onClick={() => edit(data)}
                                                    palette={palette}
                                                    restricted
                                                />
                                            ))}
                                        </Box>
                                    </>
                                ) : (
                                    <ToolsTable
                                        redesign
                                        data={getAllToolsApi.data?.data?.filter(filterTools) || []}
                                        isLoading={isLoading}
                                        onSelect={edit}
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
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={ToolEmptySVG}
                                        alt='ToolEmptySVG'
                                    />
                                </Box>
                                <div>No Tools Created Yet</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></ToolDialog>
        </>
    )
}

export default Tools
