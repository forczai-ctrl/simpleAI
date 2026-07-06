import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Paper, Rating, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { getVendors, procureVendor, addVendor } from '../services/api'
import type { Vendor } from '../types'

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // Add vendor dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [newVendor, setNewVendor] = useState({
    id: '',
    name: '',
    category: '',
    contact: '',
    status: 'active',
    rating: 4.5,
    active_pos: 0
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getVendors()
      setVendors(data)
      setError(null)
    } catch (err: any) {
      setError('Failed to fetch supplier registry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleProcure = async (vendorId: string, vendorName: string) => {
    try {
      const res = await procureVendor(vendorId)
      if (res.status === 'success') {
        setSuccessMsg(`Procurement requisition PO submitted to ${vendorName}. Active POs: ${res.active_pos}`)
        loadData()
        setTimeout(() => setSuccessMsg(null), 3500)
      } else {
        setError('Failed to issue purchase order.')
      }
    } catch (err) {
      setError('Procurement engine encountered a network error.')
    }
  }

  const handleOpenDialog = () => {
    const nextIdNum = vendors.length + 1
    setNewVendor({
      id: `VND-00${nextIdNum}`,
      name: '',
      category: 'Ingredients',
      contact: '',
      status: 'active',
      rating: 4.5,
      active_pos: 0
    })
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleSaveVendor = async () => {
    if (!newVendor.id || !newVendor.name || !newVendor.contact) {
      setError('Please fill in all required vendor fields.')
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      await addVendor(newVendor)
      setSuccessMsg(`Vendor ${newVendor.name} successfully registered.`)
      setOpenDialog(false)
      loadData()
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (err: any) {
      setError(err.message || 'Failed to add vendor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Vendor & Supplier Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage contract catalogs, track supplier SLAs, and trigger raw material procurement
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadData} disabled={loading} variant="outlined">
            Refresh Directory
          </Button>
          <Button startIcon={<AddRoundedIcon />} onClick={handleOpenDialog} variant="contained">
            Add Vendor
          </Button>
        </Stack>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: '#f4f7f4' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Registered Vendors
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {vendors.length}
                  </Typography>
                </Box>
                <BusinessRoundedIcon sx={{ fontSize: 44, color: 'primary.main', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Active Procurement POs
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {vendors.reduce((sum, v) => sum + v.active_pos, 0)}
                  </Typography>
                </Box>
                <LocalShippingRoundedIcon sx={{ fontSize: 44, opacity: 0.35 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: '#f4f7f4' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Preferred Suppliers
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {vendors.filter((v) => v.status === 'preferred').length}
                  </Typography>
                </Box>
                <ThumbUpAltRoundedIcon sx={{ fontSize: 44, color: 'primary.main', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {successMsg && <Alert severity="success">{successMsg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 2.25 }}>
        <SectionHeader title="Active Supplier Contracts" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor ID</TableCell>
                <TableCell>Company Name</TableCell>
                <TableCell>Primary Category</TableCell>
                <TableCell>Contact details</TableCell>
                <TableCell>Performance Rating</TableCell>
                <TableCell>Contract Status</TableCell>
                <TableCell align="right">Active POs</TableCell>
                <TableCell align="center" sx={{ width: 180 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => {
                let statusColor: 'success' | 'warning' | 'error' | 'default' = 'default'
                if (vendor.status === 'preferred') statusColor = 'success'
                else if (vendor.status === 'active') statusColor = 'success'
                else if (vendor.status === 'conditional') statusColor = 'warning'

                return (
                  <TableRow key={vendor.id} hover>
                    <TableCell sx={{ fontWeight: 760, color: 'primary.main' }}>{vendor.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{vendor.name}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{vendor.category}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {vendor.contact}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Rating
                          value={vendor.rating}
                          readOnly
                          precision={0.1}
                          size="small"
                          emptyIcon={<StarRoundedIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 760 }}>
                          {vendor.rating}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      <Chip
                        label={vendor.status}
                        size="small"
                        color={statusColor}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 760 }}>
                      {vendor.active_pos}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleProcure(vendor.id, vendor.name)}
                        sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}
                      >
                        Issue PO
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Vendor Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Register New Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <TextField
                  fullWidth
                  label="Vendor ID"
                  value={newVendor.id}
                  onChange={(e) => setNewVendor({ ...newVendor, id: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 8 }}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="vendor-cat-select">Category</InputLabel>
                  <Select
                    labelId="vendor-cat-select"
                    value={newVendor.category}
                    label="Category"
                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                  >
                    <MenuItem value="Ingredients">Ingredients</MenuItem>
                    <MenuItem value="Packaging">Packaging</MenuItem>
                    <MenuItem value="Logistics">Logistics</MenuItem>
                    <MenuItem value="Services">Services</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="vendor-status-select">Status</InputLabel>
                  <Select
                    labelId="vendor-status-select"
                    value={newVendor.status}
                    label="Status"
                    onChange={(e) => setNewVendor({ ...newVendor, status: e.target.value })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="preferred">Preferred</MenuItem>
                    <MenuItem value="conditional">Conditional</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Contact Details (Email / Phone)"
              value={newVendor.contact}
              onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Vendor Rating ({newVendor.rating} stars)
              </Typography>
              <Rating
                value={newVendor.rating}
                precision={0.5}
                onChange={(_, val) => setNewVendor({ ...newVendor, rating: val || 4.5 })}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveVendor}>Save Vendor</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
