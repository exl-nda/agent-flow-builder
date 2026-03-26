export const redesignColors = {
    bg: '#f4f6f9',
    surface: '#ffffff',
    surface2: '#f0f3f8',
    surface3: '#e8edf5',
    border: '#dde3ed',
    border2: '#c8d2e3',
    text: '#0f172a',
    textDim: '#475569',
    textMuted: '#94a3b8',
    coral: '#e8633a',
    coralGlow: 'rgba(232, 99, 58, 0.1)',
    teal: '#1b5e8e',
    tealLight: '#2272aa',
    tealGlow: 'rgba(27, 94, 142, 0.1)',
    green: '#16a34a',
    greenBg: '#dcfce7',
    amber: '#d97706',
    amberBg: '#fef3c7',
    red: '#dc2626',
    redBg: '#fee2e2',
    blue: '#2563eb',
    blueBg: '#dbeafe',
    purple: '#7c3aed',
    purpleBg: '#ede9fe'
}

export const redesignShadows = {
    sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
    lg: '0 10px 32px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)'
}

export const redesignRadii = {
    sm: 1.5,
    md: 2,
    lg: 3
}

export const redesignTypography = {
    pageTitle: {
        fontSize: '1.375rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.2
    },
    pageSubtitle: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.4
    },
    sectionTitle: {
        fontSize: '0.875rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        lineHeight: 1.2
    },
    eyebrow: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        lineHeight: 1.2,
        textTransform: 'uppercase'
    }
}

export const getRedesignPalette = (theme, isDarkMode) => ({
    pageBg: isDarkMode ? theme.palette.background.default : redesignColors.bg,
    surface: isDarkMode ? theme.palette.background.paper : redesignColors.surface,
    surface2: isDarkMode ? theme.palette.background.default : redesignColors.surface2,
    border: isDarkMode ? theme.palette.grey[700] : redesignColors.border,
    border2: isDarkMode ? theme.palette.grey[600] : redesignColors.border2,
    text: isDarkMode ? theme.palette.text.primary : redesignColors.text,
    textDim: isDarkMode ? theme.palette.text.secondary : redesignColors.textDim,
    textMuted: isDarkMode ? theme.palette.text.disabled : redesignColors.textMuted,
    primary: isDarkMode ? theme.palette.primary.light : redesignColors.teal,
    primaryHover: isDarkMode ? theme.palette.primary.main : redesignColors.tealLight,
    primaryGlow: isDarkMode ? 'rgba(144, 202, 249, 0.15)' : redesignColors.tealGlow,
    accent: isDarkMode ? theme.palette.warning.light : redesignColors.coral,
    accentGlow: isDarkMode ? 'rgba(255, 183, 77, 0.18)' : redesignColors.coralGlow
})
