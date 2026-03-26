import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// material-ui
import { Button, Box, Chip, Skeleton, Stack, Paper, Typography, useTheme } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import CredentialListDialog from './CredentialListDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import AddEditCredentialDialog from './AddEditCredentialDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// API
import credentialsApi from '@/api/credentials'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconX, IconPlus } from '@tabler/icons-react'
import CredentialEmptySVG from '@/assets/images/credential_empty.svg'
import keySVG from '@/assets/images/key.svg'

// const
import { baseURL } from '@/store/constant'
import { SET_COMPONENT_CREDENTIALS } from '@/store/actions'
import { useError } from '@/store/context/ErrorContext'
import ShareWithWorkspaceDialog from '@/ui-component/dialog/ShareWithWorkspaceDialog'
import { getRedesignPalette, redesignShadows, redesignTypography } from '@/views/redesign/styles'

// ==============================|| Credentials ||============================== //

const Credentials = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const palette = getRedesignPalette(theme, customization.isDarkMode)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [showCredentialListDialog, setShowCredentialListDialog] = useState(false)
    const [credentialListDialogProps, setCredentialListDialogProps] = useState({})
    const [showSpecificCredentialDialog, setShowSpecificCredentialDialog] = useState(false)
    const [specificCredentialDialogProps, setSpecificCredentialDialogProps] = useState({})
    const [credentials, setCredentials] = useState([])
    const [componentsCredentials, setComponentsCredentials] = useState([])

    const [showShareCredentialDialog, setShowShareCredentialDialog] = useState(false)
    const [shareCredentialDialogProps, setShareCredentialDialogProps] = useState({})
    const [selectedCategory, setSelectedCategory] = useState('All')

    const { confirm } = useConfirm()

    const getAllCredentialsApi = useApi(credentialsApi.getAllCredentials)
    const getAllComponentsCredentialsApi = useApi(credentialsApi.getAllComponentsCredentials)

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }
    function filterCredentials(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const getConnectorMeta = (credential) => {
        const seed = (credential?.id || credential?.name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        const authPool = ['OAuth 2.0', 'API Key', 'Bot Token', 'SAML + OAuth', 'API Token']
        const envPool = ['Production', 'mckesson.service-now.com', 'mckesson.slack.com', 'PRD-800', 'AGENT_WH_XS']
        const searchable = `${credential?.name || ''} ${credential?.credentialName || ''}`.toLowerCase()
        let status = 'connected'
        if (searchable.includes('snowflake')) status = 'warning'
        if (searchable.includes('servicenow') || searchable.includes('service now')) status = 'disconnected'
        const authType = authPool[seed % authPool.length]
        const expiresIn =
            status === 'connected' ? `${(seed % 120) + 30} days` : status === 'warning' ? `${(seed % 12) + 2} days` : 'Expired'
        const todayCalls = ((seed % 3900) + 90).toLocaleString()
        const usedByAgents = (seed % 14) + 2
        const affectedAgents = Math.max(1, Math.floor(((seed % 14) + 2) / 4))
        const teamAccess = ['Pharmacy Ops', 'Finance Leadership', 'Security Team'][seed % 3]
        return {
            status,
            authType,
            expiresIn,
            environment: envPool[seed % envPool.length],
            todayCalls,
            usedByAgents,
            affectedAgents,
            teamAccess
        }
    }

    const getConnectorIconSrc = (credential) => {
        const searchable = `${credential?.name || ''} ${credential?.credentialName || ''}`.toLowerCase()
        const iconMap = [
            { match: ['salesforce'], src: 'https://cdn.simpleicons.org/salesforce/00A1E0' },
            { match: ['databricks'], src: 'https://cdn.simpleicons.org/databricks/FF3621' },
            { match: ['sharepoint'], src: 'https://cdn.simpleicons.org/microsoftsharepoint/0078D4' },
            { match: ['outlook'], src: 'https://cdn.simpleicons.org/microsoftoutlook/0078D4' },
            { match: ['sap'], src: 'https://cdn.simpleicons.org/sap/0FAAFF' },
            { match: ['snowflake'], src: 'https://cdn.simpleicons.org/snowflake/29B5E8' },
            { match: ['servicenow', 'service now'], src: 'https://cdn.simpleicons.org/servicenow/81B441' },
            { match: ['slack'], src: 'https://cdn.simpleicons.org/slack/4A154B' },
            { match: ['splunk'], src: 'https://cdn.simpleicons.org/splunk/000000' },
            { match: ['workiva'], src: 'https://cdn.simpleicons.org/w/7C3AED' },
            { match: ['fda'], src: 'https://cdn.simpleicons.org/datadog/632CA6' }
        ]
        const found = iconMap.find((item) => item.match.some((keyword) => searchable.includes(keyword)))
        return found?.src || `${baseURL}/api/v1/components-credentials-icon/${credential.credentialName}`
    }

    const listCredential = () => {
        const dialogProp = {
            title: 'Add New Credential',
            componentsCredentials
        }
        setCredentialListDialogProps(dialogProp)
        setShowCredentialListDialog(true)
    }

    const addNew = (credentialComponent) => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            credentialComponent
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }

    const edit = (credential) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: credential
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }

    const _share = (credential) => {
        const dialogProps = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Share',
            data: {
                id: credential.id,
                name: credential.name,
                title: 'Share Credential',
                itemType: 'credential'
            }
        }
        setShareCredentialDialogProps(dialogProps)
        setShowShareCredentialDialog(true)
    }

    const deleteCredential = async (credential) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete credential ${credential.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await credentialsApi.deleteCredential(credential.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Credential deleted',
                        options: {
                            key: new Date().getTime() + Math.random(),
                            variant: 'success',
                            action: (key) => (
                                <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                    <IconX />
                                </Button>
                            )
                        }
                    })
                    onConfirm()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete Credential: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }

    const onCredentialSelected = (credentialComponent) => {
        setShowCredentialListDialog(false)
        addNew(credentialComponent)
    }

    const onConfirm = () => {
        setShowCredentialListDialog(false)
        setShowSpecificCredentialDialog(false)
        getAllCredentialsApi.request()
    }

    useEffect(() => {
        getAllCredentialsApi.request()
        getAllComponentsCredentialsApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllCredentialsApi.loading)
    }, [getAllCredentialsApi.loading])

    useEffect(() => {
        if (getAllCredentialsApi.data) {
            setCredentials(getAllCredentialsApi.data)
        }
    }, [getAllCredentialsApi.data])

    useEffect(() => {
        if (getAllComponentsCredentialsApi.data) {
            setComponentsCredentials(getAllComponentsCredentialsApi.data)
            dispatch({ type: SET_COMPONENT_CREDENTIALS, componentsCredentials: getAllComponentsCredentialsApi.data })
        }
    }, [getAllComponentsCredentialsApi.data, dispatch])

    const dummyConnectors = [
        {
            id: 'dummy-salesforce',
            name: 'Salesforce',
            credentialName: 'salesforceApi',
            description: 'Enterprise CRM integration for account, case, lead, and opportunity workflows.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-databricks',
            name: 'Databricks',
            credentialName: 'databricksApi',
            description: 'Lakehouse analytics access for ETL, SQL endpoints, and model serving.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-sharepoint',
            name: 'SharePoint',
            credentialName: 'sharepointApi',
            description: 'Document and site integration for enterprise knowledge workflows.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-outlook',
            name: 'Outlook',
            credentialName: 'microsoftOutlookApi',
            description: 'Workspace integration for inbox triage, templated replies, and notifications.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-sap',
            name: 'SAP S/4HANA',
            credentialName: 'sapApi',
            description: 'ERP integration across procurement, finance, and supply chain modules.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-snowflake',
            name: 'Snowflake',
            credentialName: 'snowflakeApi',
            description: 'Read-only warehouse connectivity for governed analytics workloads.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-servicenow',
            name: 'ServiceNow',
            credentialName: 'serviceNowApi',
            description: 'ITSM integration for incident/change/problem automation.',
            shared: false,
            isDummy: true
        },
        {
            id: 'dummy-fda',
            name: 'FDA NDC Database',
            credentialName: 'fdaApi',
            description: 'Drug code directory access restricted to regulated teams.',
            shared: true,
            isDummy: true
        },
        {
            id: 'dummy-workiva',
            name: 'Workiva Financial Platform',
            credentialName: 'workivaApi',
            description: 'Financial close/reporting connector restricted to finance leadership.',
            shared: true,
            isDummy: true
        }
    ]

    const displayCredentials = [
        ...credentials,
        ...dummyConnectors.filter((dummy) => !credentials.some((credential) => credential.name?.toLowerCase() === dummy.name.toLowerCase()))
    ]
    const restrictedConnectorNames = ['salesforce', 'sap s/4hana', 'sap']
    const connectorStats = displayCredentials.reduce(
        (acc, credential) => {
            const isRestricted = restrictedConnectorNames.includes((credential.name || '').toLowerCase())
            if (isRestricted) acc.restricted += 1

            const meta = getConnectorMeta(credential)
            if (meta.status === 'connected') acc.connected += 1
            if (meta.status === 'warning') acc.expiring += 1
            if (meta.status === 'disconnected') acc.disconnected += 1
            return acc
        },
        { connected: 0, expiring: 0, disconnected: 0, restricted: 0 }
    )

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
                            searchPlaceholder='Search Connections'
                            title='Connectors'
                            description='API keys, tokens, and secrets for 3rd party integrations'
                        >
                            <StyledPermissionButton
                                permissionId='credentials:create'
                                variant='contained'
                                sx={{ borderRadius: 2, height: 34, boxShadow: redesignShadows.sm, px: 1.5, fontSize: '0.74rem' }}
                                onClick={listCredential}
                                startIcon={<IconPlus size={14} />}
                            >
                                Add Connection
                            </StyledPermissionButton>
                        </ViewHeader>
                        <Box
                            display='grid'
                            gridTemplateColumns={{
                                xs: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(4, minmax(0, 1fr))'
                            }}
                            gap={1.4}
                        >
                            {[
                                { label: 'Connected', value: connectorStats.connected, icon: '🟢' },
                                { label: 'Token Expiring', value: connectorStats.expiring, icon: '⚠️' },
                                { label: 'Disconnected', value: connectorStats.disconnected, icon: '🔴' },
                                { label: 'Team Restricted', value: connectorStats.restricted, icon: '🔒' }
                            ].map((item) => (
                                <Paper
                                    key={item.label}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 3,
                                        border: 1,
                                        borderColor: palette.border,
                                        boxShadow: redesignShadows.sm
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ fontSize: '0.95rem' }}>{item.icon}</Box>
                                        <Box>
                                            <Typography
                                                sx={{ ...redesignTypography.eyebrow, color: palette.textMuted, fontSize: '0.58rem' }}
                                            >
                                                {item.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: palette.text }}>
                                                {item.value}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                        <Stack direction='row' spacing={0} sx={{ borderBottom: 1, borderColor: palette.border }}>
                            {[
                                ['All', 11],
                                ['CRM', 2],
                                ['ERP', 2],
                                ['Communication', 3],
                                ['Security', 2],
                                ['Data', 2]
                            ].map(([cat, count]) => (
                                <Box
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    sx={{
                                        px: 2,
                                        py: 1.1,
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: selectedCategory === cat ? 600 : 500,
                                        color: selectedCategory === cat ? palette.primary : palette.textMuted,
                                        borderBottom: 2,
                                        borderColor: selectedCategory === cat ? palette.primary : 'transparent'
                                    }}
                                >
                                    {cat} <span style={{ marginLeft: 4, fontSize: '0.62rem', opacity: 0.8 }}>{count}</span>
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
                                Active Connections
                            </Box>
                        </Box>
                        {!isLoading && displayCredentials.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                        src={CredentialEmptySVG}
                                        alt='CredentialEmptySVG'
                                    />
                                </Box>
                                <div>No Connections Yet</div>
                            </Stack>
                        ) : (
                            <Box
                                display='grid'
                                gridTemplateColumns={{
                                    xs: 'repeat(1, minmax(0, 1fr))',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    md: 'repeat(3, minmax(0, 1fr))',
                                    lg: 'repeat(3, minmax(0, 1fr))',
                                    xl: 'repeat(4, minmax(0, 1fr))'
                                }}
                                gap={1.4}
                            >
                                {isLoading &&
                                    [1, 2, 3].map((index) => (
                                        <Skeleton key={index} variant='rounded' height={220} sx={{ borderRadius: 3 }} />
                                    ))}
                                {!isLoading &&
                                    displayCredentials
                                        .filter((c) => !restrictedConnectorNames.includes((c.name || '').toLowerCase()))
                                        .filter((c) => !c.shared)
                                        .filter(filterCredentials)
                                        .map((credential) => {
                                            const meta = getConnectorMeta(credential)
                                            const statusStyles = {
                                                connected: {
                                                    border: '#16a34a',
                                                    chipBg: '#dcfce7',
                                                    chipColor: '#16a34a',
                                                    label: 'Connected'
                                                },
                                                warning: { border: '#d97706', chipBg: '#fef3c7', chipColor: '#d97706', label: 'Expiring' },
                                                disconnected: {
                                                    border: '#dc2626',
                                                    chipBg: '#fee2e2',
                                                    chipColor: '#dc2626',
                                                    label: 'Disconnected'
                                                }
                                            }[meta.status]
                                            return (
                                                <Paper
                                                    key={credential.id}
                                                    sx={{
                                                        border: 1,
                                                        borderColor: palette.border,
                                                        borderRadius: 3,
                                                        boxShadow: redesignShadows.sm,
                                                        p: 2,
                                                        position: 'relative',
                                                        '&::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            top: 0,
                                                            bottom: 0,
                                                            left: 0,
                                                            width: 3,
                                                            backgroundColor: statusStyles.border,
                                                            borderTopLeftRadius: 12,
                                                            borderBottomLeftRadius: 12
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            mb: 1.5
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box
                                                                sx={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 2,
                                                                    border: 1,
                                                                    borderColor: palette.border,
                                                                    bgcolor: palette.surface2
                                                                }}
                                                            >
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={credential.credentialName}
                                                                    src={getConnectorIconSrc(credential)}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null
                                                                        e.target.style.padding = '7px'
                                                                        e.target.src = keySVG
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Box>
                                                                <Typography
                                                                    sx={{ fontSize: '0.9rem', fontWeight: 700, color: palette.text }}
                                                                >
                                                                    {credential.name}
                                                                </Typography>
                                                                <Typography
                                                                    sx={{
                                                                        ...redesignTypography.eyebrow,
                                                                        color: palette.textMuted,
                                                                        fontSize: '0.62rem'
                                                                    }}
                                                                >
                                                                    {selectedCategory} · {meta.authType.toUpperCase()}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                        <Chip
                                                            size='small'
                                                            label={statusStyles.label}
                                                            sx={{
                                                                fontSize: '0.6875rem',
                                                                fontWeight: 600,
                                                                bgcolor: statusStyles.chipBg,
                                                                color: statusStyles.chipColor
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography
                                                        sx={{ fontSize: '0.76rem', lineHeight: 1.5, color: palette.textDim, mb: 1.1 }}
                                                    >
                                                        {credential.description ||
                                                            'Enterprise integration for account, case, lead, and opportunity management.'}
                                                    </Typography>
                                                    <Box display='grid' gridTemplateColumns='1fr 1fr' gap={1} sx={{ mb: 1.5 }}>
                                                        <Paper sx={{ p: 1.25, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                            <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                                Auth Type
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                {meta.authType}
                                                            </Typography>
                                                        </Paper>
                                                        <Paper sx={{ p: 1.25, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                            <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                                Token Expires
                                                            </Typography>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    color:
                                                                        meta.status === 'connected'
                                                                            ? '#16a34a'
                                                                            : meta.status === 'warning'
                                                                            ? '#d97706'
                                                                            : '#dc2626'
                                                                }}
                                                            >
                                                                {meta.expiresIn}
                                                            </Typography>
                                                        </Paper>
                                                        <Paper sx={{ p: 1.25, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                            <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                                Environment
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                {meta.environment}
                                                            </Typography>
                                                        </Paper>
                                                        <Paper sx={{ p: 1.25, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                            <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                                API Calls Today
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                {meta.todayCalls}
                                                            </Typography>
                                                        </Paper>
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            pt: 1.25,
                                                            borderTop: 1,
                                                            borderColor: palette.border
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.72rem',
                                                                color:
                                                                    meta.status === 'warning'
                                                                        ? '#d97706'
                                                                        : meta.status === 'disconnected'
                                                                        ? '#dc2626'
                                                                        : palette.textMuted,
                                                                fontWeight: meta.status === 'connected' ? 500 : 700
                                                            }}
                                                        >
                                                            {meta.status === 'warning'
                                                                ? `⚠ Renew within ${meta.expiresIn}`
                                                                : meta.status === 'disconnected'
                                                                ? `🚨 ${meta.affectedAgents} agents affected`
                                                                : `🔗 Used by ${meta.usedByAgents} agents`}
                                                        </Typography>
                                                        <Stack direction='row' spacing={0.75}>
                                                            {meta.status === 'warning' && (
                                                                <Button
                                                                    size='small'
                                                                    sx={{
                                                                        minWidth: 0,
                                                                        px: 1.2,
                                                                        border: `1px solid ${palette.border}`,
                                                                        bgcolor: palette.surface2,
                                                                        color: palette.textDim,
                                                                        borderRadius: 1.5,
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    Test
                                                                </Button>
                                                            )}
                                                            {meta.status === 'warning' && (
                                                                <Button
                                                                    size='small'
                                                                    sx={{
                                                                        minWidth: 0,
                                                                        px: 1.2,
                                                                        borderRadius: 1.5,
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 700
                                                                    }}
                                                                >
                                                                    Renew Token
                                                                </Button>
                                                            )}
                                                            {meta.status === 'disconnected' && (
                                                                <Button
                                                                    size='small'
                                                                    sx={{
                                                                        minWidth: 0,
                                                                        px: 1.2,
                                                                        borderRadius: 1.5,
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 700
                                                                    }}
                                                                >
                                                                    Reconnect
                                                                </Button>
                                                            )}
                                                            {meta.status === 'disconnected' && (
                                                                <Button
                                                                    size='small'
                                                                    sx={{
                                                                        minWidth: 0,
                                                                        px: 1.2,
                                                                        border: `1px solid ${palette.border}`,
                                                                        bgcolor: palette.surface2,
                                                                        color: palette.textDim,
                                                                        borderRadius: 1.5,
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    View Logs
                                                                </Button>
                                                            )}
                                                            {meta.status === 'connected' && (
                                                                <>
                                                                    <Button
                                                                        size='small'
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            px: 1.2,
                                                                            border: `1px solid ${palette.border}`,
                                                                            bgcolor: palette.surface2,
                                                                            color: palette.textDim,
                                                                            borderRadius: 1.5,
                                                                            fontSize: '0.68rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        Test
                                                                    </Button>
                                                                    <Button
                                                                        size='small'
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            px: 1.2,
                                                                            border: `1px solid ${palette.border}`,
                                                                            bgcolor: palette.surface2,
                                                                            color: palette.textDim,
                                                                            borderRadius: 1.5,
                                                                            fontSize: '0.68rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                        onClick={() => !credential.isDummy && edit(credential)}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size='small'
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            px: 1.2,
                                                                            border: `1px solid ${palette.border}`,
                                                                            bgcolor: palette.surface2,
                                                                            color: palette.textDim,
                                                                            borderRadius: 1.5,
                                                                            fontSize: '0.68rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                        onClick={() => !credential.isDummy && deleteCredential(credential)}
                                                                    >
                                                                        Revoke
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Paper>
                                            )
                                        })}
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
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
                                Team-Restricted Connections
                            </Box>
                            <Typography sx={{ fontSize: '0.72rem', color: palette.primary, fontWeight: 500 }}>Request access →</Typography>
                        </Box>
                        <Box
                            display='grid'
                            gridTemplateColumns={{
                                xs: 'repeat(1, minmax(0, 1fr))',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(3, minmax(0, 1fr))',
                                lg: 'repeat(3, minmax(0, 1fr))',
                                xl: 'repeat(4, minmax(0, 1fr))'
                            }}
                            gap={1.4}
                        >
                            {displayCredentials
                                .filter((c) => restrictedConnectorNames.includes((c.name || '').toLowerCase()))
                                .slice(0, 2)
                                .map((credential) => {
                                    const meta = getConnectorMeta(credential)
                                    return (
                                        <Paper
                                            key={`${credential.id}-restricted`}
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                border: '1px dashed rgba(124,58,237,0.3)',
                                                bgcolor: '#faf8ff',
                                                boxShadow: redesignShadows.sm,
                                                position: 'relative',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    bottom: 0,
                                                    left: 0,
                                                    width: 3,
                                                    backgroundColor: '#7c3aed',
                                                    borderTopLeftRadius: 12,
                                                    borderBottomLeftRadius: 12
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.1 }}>
                                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: palette.text }}>
                                                    {credential.name}
                                                </Typography>
                                                <Chip
                                                    size='small'
                                                    label='Restricted'
                                                    sx={{ fontSize: '0.66rem', bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 700 }}
                                                />
                                            </Box>
                                            <Typography sx={{ fontSize: '0.76rem', lineHeight: 1.5, color: palette.textDim, mb: 1.1 }}>
                                                {credential.description ||
                                                    'Restricted connector access controlled by team membership policies.'}
                                            </Typography>
                                            <Box display='grid' gridTemplateColumns='1fr 1fr' gap={1} sx={{ mb: 1.2 }}>
                                                <Paper sx={{ p: 1.1, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                    <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                        Team Access
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed' }}>
                                                        {meta.teamAccess}
                                                    </Typography>
                                                </Paper>
                                                <Paper sx={{ p: 1.1, bgcolor: palette.surface2, boxShadow: 'none' }}>
                                                    <Typography sx={{ ...redesignTypography.eyebrow, color: palette.textMuted }}>
                                                        Auth Type
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{meta.authType}</Typography>
                                                </Paper>
                                            </Box>
                                            <Box
                                                sx={{
                                                    pt: 1,
                                                    borderTop: `1px solid ${palette.border}`,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Typography sx={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>
                                                    🔒 {meta.teamAccess} only
                                                </Typography>
                                                <Button
                                                    size='small'
                                                    sx={{
                                                        minWidth: 0,
                                                        px: 1.2,
                                                        border: '1px solid rgba(124,58,237,0.3)',
                                                        bgcolor: '#ede9fe',
                                                        color: '#7c3aed',
                                                        borderRadius: 1.5,
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    Request Access
                                                </Button>
                                            </Box>
                                        </Paper>
                                    )
                                })}
                            <Paper
                                onClick={listCredential}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    border: `2px dashed ${palette.border}`,
                                    bgcolor: palette.surface,
                                    boxShadow: redesignShadows.sm,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    cursor: 'pointer',
                                    minHeight: 210,
                                    '&:hover': { borderColor: palette.primary, bgcolor: palette.primaryGlow }
                                }}
                            >
                                <Typography sx={{ fontSize: '1.6rem', color: palette.textMuted }}>+</Typography>
                                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: palette.textDim }}>
                                    Add New Connection
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: palette.textMuted }}>
                                    Connect an API, secret, or token
                                </Typography>
                            </Paper>
                        </Box>
                    </Stack>
                )}
            </MainCard>
            <CredentialListDialog
                show={showCredentialListDialog}
                dialogProps={credentialListDialogProps}
                onCancel={() => setShowCredentialListDialog(false)}
                onCredentialSelected={onCredentialSelected}
            ></CredentialListDialog>
            {showSpecificCredentialDialog && (
                <AddEditCredentialDialog
                    show={showSpecificCredentialDialog}
                    dialogProps={specificCredentialDialogProps}
                    onCancel={() => setShowSpecificCredentialDialog(false)}
                    onConfirm={onConfirm}
                    setError={setError}
                ></AddEditCredentialDialog>
            )}
            {showShareCredentialDialog && (
                <ShareWithWorkspaceDialog
                    show={showShareCredentialDialog}
                    dialogProps={shareCredentialDialogProps}
                    onCancel={() => setShowShareCredentialDialog(false)}
                    setError={setError}
                ></ShareWithWorkspaceDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default Credentials
