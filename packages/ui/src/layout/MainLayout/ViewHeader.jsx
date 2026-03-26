import PropTypes from 'prop-types'
import { useRef } from 'react'

// material-ui
import { IconButton, Box, OutlinedInput, Toolbar, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { StyledFab } from '@/ui-component/button/StyledFab'
import { getRedesignPalette, redesignShadows, redesignTypography } from '@/views/redesign/styles'

// icons
import { IconSearch, IconArrowLeft, IconEdit } from '@tabler/icons-react'

import useSearchShortcut from '@/hooks/useSearchShortcut'
import { getOS } from '@/utils/genericHelper'

const os = getOS()
const isMac = os === 'macos'
const isDesktop = isMac || os === 'windows' || os === 'linux'
const keyboardShortcut = isMac ? '[ ⌘ + F ]' : '[ Ctrl + F ]'

const ViewHeader = ({
    children,
    filters = null,
    onSearchChange,
    search,
    searchPlaceholder = 'Search',
    title,
    description,
    isBackButton,
    onBack,
    isEditButton,
    onEdit,
    redesign = false,
    controlHeight = 40
}) => {
    const theme = useTheme()
    const searchInputRef = useRef()
    useSearchShortcut(searchInputRef)
    const palette = getRedesignPalette(theme, theme?.customization?.isDarkMode)

    return (
        <Box sx={{ flexGrow: 1, py: 1.25, width: '100%' }}>
            <Toolbar
                disableGutters={true}
                sx={{
                    p: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
                    {isBackButton && (
                        <StyledFab sx={{ mr: 3 }} size='small' color='secondary' aria-label='back' title='Back' onClick={onBack}>
                            <IconArrowLeft />
                        </StyledFab>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column' }}>
                        <Typography
                            sx={{
                                ...(redesign ? redesignTypography.pageTitle : {}),
                                fontSize: redesign ? '1.95rem' : '1.8rem',
                                fontWeight: redesign ? 700 : 600,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                flex: 1,
                                maxWidth: 'calc(100vh - 100px)'
                            }}
                            variant='h1'
                        >
                            {title}
                        </Typography>
                        {description && (
                            <Typography
                                sx={{
                                    ...(redesign ? redesignTypography.pageSubtitle : {}),
                                    fontSize: redesign ? '0.78rem' : '1rem',
                                    fontWeight: redesign ? redesignTypography.pageSubtitle.fontWeight : 500,
                                    mt: redesign ? 0.5 : 2,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    flex: 1,
                                    maxWidth: 'calc(100vh - 100px)'
                                }}
                            >
                                {description}
                            </Typography>
                        )}
                    </Box>
                    {isEditButton && (
                        <IconButton sx={{ ml: 3 }} color='secondary' title='Edit' onClick={onEdit}>
                            <IconEdit />
                        </IconButton>
                    )}
                </Box>
                <Box sx={{ height: controlHeight, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {search && (
                        <OutlinedInput
                            inputRef={searchInputRef}
                            size='small'
                            sx={{
                                width: redesign ? '270px' : '325px',
                                height: '100%',
                                display: { xs: 'none', sm: 'flex' },
                                borderRadius: redesign ? 2 : 2,
                                bgcolor: redesign ? palette.surface : 'inherit',
                                boxShadow: redesign ? redesignShadows.sm : 'none',

                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderRadius: redesign ? 2 : 2,
                                    borderColor: redesign ? palette.border : undefined,
                                    borderWidth: redesign ? '1px' : undefined
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: redesign ? palette.border2 : undefined,
                                    borderWidth: redesign ? '1px' : undefined
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: redesign ? palette.primary : undefined,
                                    borderWidth: redesign ? '1px' : undefined
                                },
                                '&.Mui-focused': redesign ? { boxShadow: `0 0 0 2px ${palette.primaryGlow}` } : {}
                            }}
                            variant='outlined'
                            placeholder={`${searchPlaceholder} ${isDesktop ? keyboardShortcut : ''}`}
                            onChange={onSearchChange}
                            startAdornment={
                                <Box
                                    sx={{
                                        color: redesign ? palette.textMuted : theme.palette.grey[400],
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 1
                                    }}
                                >
                                    <IconSearch style={{ color: 'inherit', width: redesign ? 14 : 16, height: redesign ? 14 : 16 }} />
                                </Box>
                            }
                            type='search'
                        />
                    )}
                    {filters}
                    {children}
                </Box>
            </Toolbar>
        </Box>
    )
}

ViewHeader.propTypes = {
    children: PropTypes.node,
    filters: PropTypes.node,
    onSearchChange: PropTypes.func,
    search: PropTypes.bool,
    searchPlaceholder: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    isBackButton: PropTypes.bool,
    onBack: PropTypes.func,
    isEditButton: PropTypes.bool,
    onEdit: PropTypes.func,
    redesign: PropTypes.bool,
    controlHeight: PropTypes.number
}

export default ViewHeader
