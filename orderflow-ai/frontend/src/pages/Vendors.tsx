import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Paper, Rating, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { getVendors, procureVendor } from '../services/api'
import type { Vendor } from '../types'

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
        <Button startIcon={<RefreshRoundedIcon />} onClick={loadData} disabled={loading} variant="outlined">
          Refresh Directory
        </Button>
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
      {error && <Alert severity="error">{error}</Alert>}

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
    </Stack>
  )
}
