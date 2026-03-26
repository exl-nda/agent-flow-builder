import { Box, FormControl, MenuItem, Pagination, Select, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { getRedesignPalette, redesignShadows } from '@/views/redesign/styles'

export const DEFAULT_ITEMS_PER_PAGE = 12

const TablePagination = ({ currentPage, limit, total, onChange, redesign = false }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const borderColor = theme.palette.grey[900] + 25
    const palette = getRedesignPalette(theme, customization.isDarkMode)

    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [activePage, setActivePage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    useEffect(() => {
        setTotalItems(total)
    }, [total])

    useEffect(() => {
        setItemsPerPage(limit)
    }, [limit])

    useEffect(() => {
        setActivePage(currentPage)
    }, [currentPage])

    const handlePageChange = (event, value) => {
        setActivePage(value)
        onChange(value, itemsPerPage)
    }

    const handleLimitChange = (event) => {
        const itemsPerPage = parseInt(event.target.value, 10)
        setItemsPerPage(itemsPerPage)
        setActivePage(1)
        onChange(1, itemsPerPage)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
                ...(redesign
                    ? {
                          gap: 2,
                          '& .MuiPagination-ul': { gap: 0.5 },
                          '& .MuiPaginationItem-root': {
                              borderRadius: 2,
                              border: `1px solid ${palette.border}`,
                              color: palette.textDim,
                              minWidth: 30,
                              height: 30,
                              fontSize: '0.75rem'
                          },
                          '& .MuiPaginationItem-root.Mui-selected': {
                              backgroundColor: palette.primary,
                              color: '#fff',
                              borderColor: palette.primary,
                              boxShadow: redesignShadows.sm
                          }
                      }
                    : {})
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant='body2' sx={redesign ? { fontSize: '0.8rem', color: palette.textDim } : {}}>
                    Items per page:
                </Typography>
                <FormControl
                    variant='outlined'
                    size='small'
                    sx={{
                        minWidth: 80,
                        ...(redesign
                            ? {
                                  '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                      backgroundColor: palette.surface,
                                      boxShadow: redesignShadows.sm
                                  },
                                  '& .MuiSelect-select': { fontSize: '0.8rem', fontWeight: 600 }
                              }
                            : {}),
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: redesign ? palette.border : borderColor
                        },
                        '& .MuiSvgIcon-root': {
                            color: customization.isDarkMode ? '#fff' : 'inherit'
                        }
                    }}
                >
                    <Select value={itemsPerPage} onChange={handleLimitChange} displayEmpty>
                        <MenuItem value={12}>12</MenuItem>
                        <MenuItem value={24}>24</MenuItem>
                        <MenuItem value={48}>48</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            {totalItems > 0 && (
                <Typography variant='body2' sx={redesign ? { fontSize: '0.8rem', color: palette.textMuted } : {}}>
                    Items {activePage * itemsPerPage - itemsPerPage + 1} to{' '}
                    {activePage * itemsPerPage > totalItems ? totalItems : activePage * itemsPerPage} of {totalItems}
                </Typography>
            )}
            <Pagination count={Math.ceil(totalItems / itemsPerPage)} onChange={handlePageChange} page={activePage} color='primary' />
        </Box>
    )
}

TablePagination.propTypes = {
    onChange: PropTypes.func.isRequired,
    currentPage: PropTypes.number,
    limit: PropTypes.number,
    total: PropTypes.number,
    redesign: PropTypes.bool
}

export default TablePagination
