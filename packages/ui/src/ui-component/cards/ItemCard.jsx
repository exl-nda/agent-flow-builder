import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Tooltip, Typography, useTheme } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import MoreItemsTooltip from '../tooltip/MoreItemsTooltip'
import { getRedesignPalette, redesignShadows } from '@/views/redesign/styles'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    height: '100%',
    minHeight: '160px',
    maxHeight: '300px',
    width: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

// ===========================|| CONTRACT CARD ||=========================== //

const ItemCard = ({ data, images, icons, onClick, redesign = false }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const palette = getRedesignPalette(theme, customization.isDarkMode)

    return (
        <CardWrapper
            content={false}
            onClick={onClick}
            sx={{
                border: 1,
                borderColor: redesign ? palette.border : theme.palette.grey[900] + 25,
                borderRadius: redesign ? 3 : 2,
                background: redesign ? palette.surface : undefined,
                boxShadow: redesign ? redesignShadows.sm : undefined,
                '&:hover': redesign
                    ? {
                          borderColor: palette.border2,
                          boxShadow: redesignShadows.lg,
                          transform: 'translateY(-2px)'
                      }
                    : undefined
            }}
        >
            <Box sx={{ height: '100%', p: redesign ? 2.5 : 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 3 }}>
                    <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            {data.iconSrc && (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        backgroundImage: `url(${data.iconSrc})`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center center'
                                    }}
                                ></div>
                            )}
                            {!data.iconSrc && data.color && (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        background: data.color
                                    }}
                                ></div>
                            )}
                            <Typography
                                sx={{
                                    display: '-webkit-box',
                                    fontSize: redesign ? '0.95rem' : '1.25rem',
                                    fontWeight: redesign ? 700 : 500,
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden'
                                }}
                            >
                                {data.templateName || data.name}
                            </Typography>
                        </div>
                        {data.description && (
                            <span
                                style={{
                                    display: '-webkit-box',
                                    marginTop: 10,
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    fontSize: redesign ? '0.78rem' : undefined,
                                    lineHeight: redesign ? 1.55 : undefined,
                                    color: redesign ? palette.textDim : undefined
                                }}
                            >
                                {data.description}
                            </span>
                        )}
                    </Box>
                    {(images?.length > 0 || icons?.length > 0) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1
                            }}
                        >
                            {[
                                ...(images || []).map((img) => ({ type: 'image', src: img.imageSrc, label: img.label })),
                                ...(icons || []).map((ic) => ({ type: 'icon', icon: ic.icon, color: ic.color, label: ic.name }))
                            ]
                                .slice(0, 3)
                                .map((item, index) => (
                                    <Tooltip key={item.src || index} title={item.label} placement='top'>
                                        {item.type === 'image' ? (
                                            <Box
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    borderRadius: '50%',
                                                    backgroundColor: customization.isDarkMode
                                                        ? theme.palette.common.white
                                                        : theme.palette.grey[300] + 75
                                                }}
                                            >
                                                <img
                                                    style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                                    alt=''
                                                    src={item.src}
                                                />
                                            </Box>
                                        ) : (
                                            <div
                                                style={{
                                                    width: 30,
                                                    height: 30,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <item.icon size={25} color={item.color} />
                                            </div>
                                        )}
                                    </Tooltip>
                                ))}

                            {(images?.length || 0) + (icons?.length || 0) > 3 && (
                                <MoreItemsTooltip
                                    images={[
                                        ...(images?.slice(3) || []),
                                        ...(icons?.slice(Math.max(0, 3 - (images?.length || 0))) || []).map((ic) => ({ label: ic.name }))
                                    ]}
                                >
                                    <Typography
                                        sx={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            fontSize: '.9rem',
                                            fontWeight: 200
                                        }}
                                    >
                                        + {(images?.length || 0) + (icons?.length || 0) - 3} More
                                    </Typography>
                                </MoreItemsTooltip>
                            )}
                        </Box>
                    )}
                </Grid>
            </Box>
        </CardWrapper>
    )
}

ItemCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    icons: PropTypes.array,
    onClick: PropTypes.func,
    redesign: PropTypes.bool
}

export default ItemCard
