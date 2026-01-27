import { Box, Stack, Typography, useTheme } from '@mui/material'
import logoExl from '@/assets/images/exl.png'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const theme = useTheme()

    return (
        <Stack direction='row' alignItems='center' spacing={1.5} sx={{ ml: 1.25 }}>
            <Box
                component='img'
                src={logoExl}
                alt='EXL Logo'
                sx={{
                    height: 36,
                    width: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                }}
            />
            <Stack direction='column' spacing={0}>
                <Typography
                    variant='h4'
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: theme.palette.text.primary,
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    AgentHub
                </Typography>
                <Typography
                    variant='caption'
                    sx={{
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: theme.palette.text.secondary,
                        fontSize: '0.8rem',
                        opacity: 1,
                        whiteSpace: 'nowrap'
                    }}
                >
                    Powered by Auxora.AI
                </Typography>
            </Stack>
        </Stack>
    )
}

export default Logo
