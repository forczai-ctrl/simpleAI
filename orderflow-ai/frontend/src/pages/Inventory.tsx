import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { getInventory, replenishInventory } from '../services/api'
import { currency } from '../services/format'
import type { InventoryItem } from '../types'

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [replenishQuantities, setReplenishQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getInventory()
      setItems(data)
      // Initialize replenish quantities to 25
      const initQ: Record<string, number> = {}
      data.forEach((item) => {
        initQ[item.sku] = 25
      })
      setReplenishQuantities(initQ)
      setError(null)
    } catch (err: any) {
      setError('Failed to fetch warehouse inventory catalog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleQtyChange = (sku: string, val: string) => {
    const parsed = parseInt(val) || 0
    setReplenishQuantities({
      ...replenishQuantities,
      [sku]: parsed,
    })
  }

  const handleReplenish = async (sku: string) => {
    const qty = replenishQuantities[sku]
    if (qty <= 0) return
    try {
      const res = await replenishInventory(sku, qty)
      if (res.status === 'success') {
        setSuccessMsg(`Replenished SKU ${sku} by ${qty} units. New quantity: ${res.new_qty}`)
        loadData()
        setTimeout(() => setSuccessMsg(null), 3500)
      } else {
        setError('Error replenishing SKU stock.')
      }
    } catch (err) {
      setError(' replenishment pipeline encountered an error.')
    }
  }

  const totalStock = items.reduce((sum, item) => sum + item.available_qty, 0)
  const lowStockCount = items.filter((item) => item.available_qty < 30).length

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Inventory Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Warehouse catalog levels, stock thresholds, and suppliers replenishment triggers
          </Typography>
        </Box>
        <Button startIcon={<RefreshRoundedIcon />} onClick={loadData} disabled={loading} variant="outlined">
          Refresh Stock
        </Button>
      </Box>

      {/* Top Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Total Items In Warehouse
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {totalStock}
                  </Typography>
                </Box>
                <Inventory2RoundedIcon sx={{ fontSize: 44, opacity: 0.35 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: lowStockCount > 0 ? 'rgba(184,121,25,0.08)' : '#f4f7f4', border: lowStockCount > 0 ? '1px solid rgba(184,121,25,0.2)' : 'none' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Low Stock SKUs
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: lowStockCount > 0 ? 'warning.main' : 'text.primary' }}>
                    {lowStockCount}
                  </Typography>
                </Box>
                <WarningAmberRoundedIcon sx={{ fontSize: 44, color: lowStockCount > 0 ? 'warning.main' : 'text.secondary', opacity: 0.6 }} />
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
                    Active Catalog Items
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {items.filter((i) => i.active).length} / {items.length}
                  </Typography>
                </Box>
                <ShowChartRoundedIcon sx={{ fontSize: 44, color: 'primary.main', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {successMsg && <Alert severity="success">{successMsg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2.25 }}>
        <SectionHeader title="Warehouse Catalog Registry" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Contract Price</TableCell>
                <TableCell>Available Qty</TableCell>
                <TableCell align="right">MOQ</TableCell>
                <TableCell align="center" sx={{ width: 220 }}>
                  Replenish Trigger
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const isLow = item.available_qty < 30
                const progressValue = Math.min((item.available_qty / 180) * 100, 100)

                return (
                  <TableRow key={item.sku} hover>
                    <TableCell sx={{ fontWeight: 760, color: 'primary.main' }}>{item.sku}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{item.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.active ? 'ACTIVE' : 'DISCONTINUED'}
                        size="small"
                        color={item.active ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {currency(item.contract_price)}
                    </TableCell>
                    <TableCell sx={{ width: 200 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 760, color: isLow ? 'error.main' : 'text.primary' }}>
                            {item.available_qty} units
                          </Typography>
                          {isLow && (
                            <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
                              CRITICAL LIMIT
                            </Typography>
                          )}
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={progressValue}
                          color={isLow ? 'error' : 'primary'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {item.minimum_order_qty}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={replenishQuantities[item.sku] ?? 25}
                          onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                          slotProps={{ htmlInput: { min: 1, style: { padding: '5px 8px', width: 45, textAlign: 'center' } } }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleReplenish(item.sku)}
                          sx={{ px: 1.5, textTransform: 'none', fontWeight: 700 }}
                        >
                          Restock
                        </Button>
                      </Stack>
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
