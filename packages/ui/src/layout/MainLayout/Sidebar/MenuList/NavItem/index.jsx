import PropTypes from 'prop-types'
import { forwardRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Chip, ListItemButton, ListItemIcon, ListItemText, Typography, useMediaQuery } from '@mui/material'

// project imports
import { MENU_OPEN, SET_MENU } from '@/store/actions'
import config from '@/config'

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { getRedesignPalette, redesignShadows } from '@/views/redesign/styles'

// ==============================|| SIDEBAR MENU LIST ITEMS ||============================== //

const NavItem = ({ item, level, navType, onClick, onUploadFile }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const matchesSM = useMediaQuery(theme.breakpoints.down('lg'))
    const palette = getRedesignPalette(theme, customization.isDarkMode)

    const Icon = item.icon
    const itemIcon = item?.icon ? (
        <Icon stroke={1.6} size='0.95rem' />
    ) : (
        <FiberManualRecordIcon
            sx={{
                width: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6,
                height: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6
            }}
            fontSize={level > 0 ? 'inherit' : 'medium'}
        />
    )

    let itemTarget = '_self'
    if (item.target) {
        itemTarget = '_blank'
    }

    let listItemProps = {
        component: forwardRef(function ListItemPropsComponent(props, ref) {
            return <Link ref={ref} {...props} to={`${config.basename}${item.url}`} target={itemTarget} />
        })
    }
    if (item?.external) {
        listItemProps = { component: 'a', href: item.url, target: itemTarget }
    }
    if (item?.id === 'loadChatflow') {
        listItemProps.component = 'label'
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

    const itemHandler = (id) => {
        if (navType === 'SETTINGS' && id !== 'loadChatflow') {
            onClick(id)
        } else {
            dispatch({ type: MENU_OPEN, id })
            if (matchesSM) dispatch({ type: SET_MENU, opened: false })
        }
    }

    // active menu item on page load
    useEffect(() => {
        if (navType === 'MENU') {
            const currentIndex = document.location.pathname
                .toString()
                .split('/')
                .findIndex((id) => id === item.id)
            if (currentIndex > -1) {
                dispatch({ type: MENU_OPEN, id: item.id })
            }
            if (!document.location.pathname.toString().split('/')[1]) {
                itemHandler('chatflows')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navType])

    return (
        <ListItemButton
            {...listItemProps}
            disabled={item.disabled}
            sx={{
                borderRadius: 2,
                alignItems: 'flex-start',
                backgroundColor: level > 1 ? 'transparent !important' : 'inherit',
                py: level > 1 ? 1 : 1.1,
                px: 1.5,
                color: palette.textDim,
                minHeight: 34,
                '&:hover': {
                    backgroundColor: palette.surface2,
                    color: palette.text
                },
                '&.Mui-selected': {
                    backgroundColor: palette.accentGlow,
                    color: palette.accent,
                    boxShadow: redesignShadows.sm
                },
                '&.Mui-selected:hover': {
                    backgroundColor: palette.accentGlow
                }
            }}
            selected={customization.isOpen.findIndex((id) => id === item.id) > -1}
            onClick={() => itemHandler(item.id)}
        >
            {item.id === 'loadChatflow' && <input type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />}
            <ListItemIcon sx={{ my: 'auto', minWidth: !item?.icon ? 16 : 30, color: 'inherit' }}>{itemIcon}</ListItemIcon>
            <ListItemText
                primary={
                    <Typography
                        variant={customization.isOpen.findIndex((id) => id === item.id) > -1 ? 'h5' : 'body1'}
                        color='inherit'
                        sx={{ my: 0.25, fontSize: '0.82rem', fontWeight: 500 }}
                    >
                        {item.title}
                    </Typography>
                }
                secondary={
                    item.caption && (
                        <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption, mt: -0.6 }} display='block' gutterBottom>
                            {item.caption}
                        </Typography>
                    )
                }
                sx={{ my: 'auto' }}
            />
            {item.chip && (
                <Chip
                    color={item.chip.color}
                    variant={item.chip.variant}
                    size={item.chip.size}
                    label={item.chip.label}
                    avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
                />
            )}
            {item.countBadge && (
                <Chip
                    label={item.countBadge}
                    size='small'
                    sx={{
                        my: 'auto',
                        ml: 0.5,
                        height: 22,
                        minWidth: 34,
                        borderRadius: 5,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: palette.primary,
                        background: palette.primaryGlow,
                        border: `1px solid ${palette.border}`
                    }}
                />
            )}
            {item.isBeta && (
                <Chip
                    sx={{
                        my: 'auto',
                        width: 'max-content',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        background: theme.palette.teal.main,
                        color: 'white'
                    }}
                    label={'BETA'}
                />
            )}
        </ListItemButton>
    )
}

NavItem.propTypes = {
    item: PropTypes.object,
    level: PropTypes.number,
    navType: PropTypes.string,
    onClick: PropTypes.func,
    onUploadFile: PropTypes.func
}

export default NavItem
