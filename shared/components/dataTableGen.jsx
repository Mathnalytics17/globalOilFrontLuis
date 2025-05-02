import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Collapse,
  Box,
  Typography,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const DataTable = ({
  columns,
  data,
  nestedDataKey = null,
  nestedColumns = null,
  actions = [],
  selectable = false,
  pagination = true,
  searchable = false,
  defaultSort = { field: 'id', order: 'asc' },
  sx = {}
}) => {
  const [order, setOrder] = useState(defaultSort.order);
  const [orderBy, setOrderBy] = useState(defaultSort.field);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);
  const [filters, setFilters] = useState({});

  // Función para manejar el ordenamiento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Función para manejar la selección de filas
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = data.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  // Función para manejar la paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Función para manejar filas expandibles
  const handleExpandRow = (id) => {
    const currentExpanded = expandedRows.includes(id);
    const newExpanded = currentExpanded
      ? expandedRows.filter((rowId) => rowId !== id)
      : [...expandedRows, id];
    setExpandedRows(newExpanded);
  };

  // Función para manejar búsqueda
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Función para manejar filtros
  const handleFilterChange = (columnId, value) => {
    setFilters({ ...filters, [columnId]: value });
    setPage(0);
  };

  // Filtrar y ordenar los datos
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Búsqueda global
      const matchesSearch = searchTerm === '' || 
        columns.some((column) => {
          const value = row[column.id];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });

      // Filtros por columna
      const matchesFilters = Object.keys(filters).every((key) => {
        if (!filters[key]) return true;
        const value = row[key];
        return value && value.toString().toLowerCase().includes(filters[key].toLowerCase());
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, filters, columns]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, orderBy, order]);

  // Datos paginados
  const paginatedData = pagination
    ? sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sortedData;

  const isSelected = (id) => selected.indexOf(id) !== -1;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', ...sx }}>
      {searchable && (
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      <TableContainer>
        <Table aria-labelledby="tableTitle" size="medium">
          <TableHead>
            <TableRow>
              {nestedDataKey && <TableCell padding="checkbox" />}
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{ minWidth: column.minWidth }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                    {column.filterable && (
                      <Box component="span" sx={{ ml: 1 }}>
                        <TextField
                          size="small"
                          placeholder={`Filtrar ${column.label}`}
                          value={filters[column.id] || ''}
                          onChange={(e) => handleFilterChange(column.id, e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <FilterListIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ width: 150 }}
                        />
                      </Box>
                    )}
                  </TableSortLabel>
                </TableCell>
              ))}
              {actions.length > 0 && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const isItemSelected = isSelected(row.id);
              const isExpanded = expandedRows.includes(row.id);

              return (
                <React.Fragment key={row.id}>
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    selected={isItemSelected}
                  >
                    {nestedDataKey && (
                      <TableCell>
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => handleExpandRow(row.id)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    )}
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onChange={(event) => handleClick(event, row.id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {column.render ? column.render(row) : row[column.id]}
                      </TableCell>
                    ))}
                    {actions.length > 0 && (
                       <TableCell 
                       align="right"
                       sx={{
                         position: 'sticky',
                         right: 0,
                         backgroundColor: 'background.paper',
                         borderLeft: '1px solid',
                         borderLeftColor: 'divider'
                       }}
                     >
                         <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'flex-end', 
                          gap: '4px',
                          '& .MuiIconButton-root': {
                            padding: '6px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            },
                            '& svg': {
                              fontSize: '1.2rem'
                            }
                          }
                        }}>
                        {actions.map((action) => {
        const isDisabled = action.disabled && action.disabled(row);
        return (
          <Tooltip 
            key={action.id} 
            title={isDisabled ? 'Acción no disponible' : action.tooltip}
          >
            <span> {/* Wrap para tooltip con elemento deshabilitado */}
              <IconButton
                size="small"
                color={action.color || 'primary'}
                onClick={() => !isDisabled && action.handler(row)}
                disabled={isDisabled}
                sx={{
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                  ...action.buttonSx
                }}
              >
                {React.cloneElement(action.icon, {
                  sx: { 
                    fontSize: '1.2rem',
                    color: isDisabled ? 'text.disabled' : (action.color || 'inherit')
                  }
                })}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                  {nestedDataKey && row[nestedDataKey] && (
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6 + columns.length}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Detalles
                            </Typography>
                            <Table size="small" aria-label="nested table">
                              <TableHead>
                                <TableRow>
                                  {nestedColumns.map((column) => (
                                    <TableCell key={column.id}>{column.label}</TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row[nestedDataKey].map((nestedRow, index) => (
                                  <TableRow key={index}>
                                    {nestedColumns.map((column) => (
                                      <TableCell key={column.id}>
                                        {column.render ? column.render(nestedRow) : nestedRow[column.id]}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Paper>
  );
};

export default DataTable;