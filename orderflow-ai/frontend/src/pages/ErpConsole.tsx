import { useEffect, useState } from 'react'
import { Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography, Alert, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { SectionHeader } from '../components/SectionHeader'
import { currency } from '../services/format'
import { getErpLogs, runPipeline, syncGmailOrders, syncToErp, uploadPipelineFile, getSettings, saveSettings } from '../services/api'
import type { DashboardResponse, ErpSyncLog, PipelineRun } from '../types'

interface Props {
  dashboard: DashboardResponse
  onRefresh: () => Promise<void>
}

const ERP_SYSTEMS = [
  'SAP Business One',
  'NetSuite',
  'Microsoft Dynamics',
  'QuickBooks Online',
  'ALO (Zoho ERP)',
]

export function ErpConsole({ dashboard, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [logs, setLogs] = useState<ErpSyncLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)
  
  // File Upload Ingest State
  const [fileLoading, setFileLoading] = useState(false)
  const [fileResult, setFileResult] = useState<PipelineRun | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileStage, setFileStage] = useState<string | null>(null)

  // Gmail Ingest State
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailFeedback, setGmailFeedback] = useState<string | null>(null)

  // API Playground State
  const [apiText, setApiText] = useState(`Purchase Order PO-8002
Customer: Summit Distributors
Ship To Region: CA
Delivery Date: 2026-08-01
Payment Terms: NET 30
Item SKU-TEA-24 Qty 12 Price 36.00`)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiResponse, setApiResponse] = useState<string | null>(null)

  // System Configurations State
  const [settings, setSettings] = useState({
    gmail_email: '',
    gmail_app_password: '',
    gmail_smtp_host: 'smtp.gmail.com',
    gmail_smtp_port: 465,
    erp_system: 'SAP Business One',
    erp_host_url: '',
    erp_client_id: '',
    erp_client_secret: '',
    erp_sync_active: true,
    // Zoho ERP ("ALO" system) specific fields
    zoho_erp: {
      refresh_token: '',
      organization_id: '',
      region: 'com'
    }
  })
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const data = await getErpLogs()
      setLogs(data)
    } catch (err) {
      console.error('Failed to load ERP sync logs', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const fetchSettings = async () => {
    setLoadingSettings(true)
    try {
      const data = await getSettings()
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (err) {
      console.error('Failed to load system settings', err)
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchSettings()
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileLoading(true)
    setFileResult(null)
    setFileError(null)
    
    setFileStage('Uploading document...')
    await new Promise(r => setTimeout(r, 600))
    
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (['png', 'jpg', 'jpeg', 'tiff', 'tif'].includes(ext || '')) {
      setFileStage('Running simulated OCR extraction (Fax/Scan layout detection)...')
    } else {
      setFileStage('Extracting file text characters...')
    }
    await new Promise(r => setTimeout(r, 800))
    
    setFileStage('Executing O2C Pipeline validation rules...')
    
    try {
      const result = await uploadPipelineFile(file)
      setFileResult(result)
      setFileStage('Syncing extracted document to ERP...')
      await onRefresh()
      await fetchLogs()
      setFileStage(null)
    } catch (err: any) {
      setFileError(err.message || String(err))
      setFileStage(null)
    } finally {
      setFileLoading(false)
    }
  }

  const handleGmailSync = async () => {
    setGmailLoading(true)
    setGmailFeedback(null)
    try {
      const res = await syncGmailOrders()
      setGmailFeedback(res.message)
      await onRefresh()
      await fetchLogs()
    } catch (err: any) {
      setGmailFeedback(`Gmail sync failed: ${err.message || err}`)
    } finally {
      setGmailLoading(false)
    }
  }

  const handleManualErpSync = async (type: 'order' | 'invoice', poNumber: string, customerName: string, payload: any) => {
    setSyncFeedback(null)
    try {
      const res = await syncToErp(type, poNumber, customerName, payload)
      setSyncFeedback(res.message)
      await fetchLogs()
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message || err}`)
    }
  }

  const handleSaveSettings = async () => {
    setSaveStatus(null)
    try {
      const res = await saveSettings(settings)
      if (res.status === 'success') {
        setSaveStatus('Settings successfully saved and persisted to app_config.json!')
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus(`Error: ${res.message}`)
      }
    } catch (err: any) {
      setSaveStatus(`Failed to save settings: ${err.message || err}`)
    }
  }

  const handleTestApi = async () => {
    setApiLoading(true)
    setApiResponse(null)
    try {
      const res = await runPipeline(apiText)
      setApiResponse(JSON.stringify(res, null, 2))
      await onRefresh()
      await fetchLogs()
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message || err }, null, 2))
    } finally {
      setApiLoading(false)
    }
  }

  const isSynced = (poNumber: string, type: 'order' | 'invoice') => {
    return logs.some(log => log.po_number === poNumber && log.type === type && log.status === 'synced')
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Integrations Hub & API Console
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure, sync, and ingest data from ERP, Fax, Email, PDF, Excel, CSV, and Web API channels
        </Typography>
      </Box>

      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab icon={<UploadFileRoundedIcon />} label="File & Fax Ingest" iconPosition="start" />
          <Tab icon={<MailOutlineRoundedIcon />} label="Gmail API Ingest" iconPosition="start" />
          <Tab icon={<CloudDoneRoundedIcon />} label="ERP Sync & Ledger" iconPosition="start" />
          <Tab icon={<CodeRoundedIcon />} label="Web API Sandbox" iconPosition="start" />
          <Tab icon={<SettingsRoundedIcon />} label="System Configurations" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TAB 1: FILE & FAX INGESTION */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <SectionHeader title="Ingest Order File or Scanned Fax" />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Select or drop a purchase order document. The system supports PDFs (text-extract), Excel sheets, CSV records, and scanned images/faxes (runs simulated OCR).
              </Typography>
              
              <Box sx={{
                p: 4.5,
                border: '2px dashed rgba(36,95,90,0.3)',
                borderRadius: 3,
                textAlign: 'center',
                bgcolor: 'rgba(36,95,90,0.02)',
                mb: 3
              }}>
                <UploadFileRoundedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Upload Document or Fax Scan
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
                  Supports PDF, XLSX, CSV, TXT, and JPG/PNG (Fax)
                </Typography>
                
                <Button
                  variant="contained"
                  component="label"
                  disabled={fileLoading}
                >
                  Choose Document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.tiff,.tif"
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>

              {fileStage && (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, bgcolor: '#f4f7f4', borderRadius: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {fileStage}
                  </Typography>
                </Stack>
              )}

              {fileError && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  Failed to process file: {fileError}
                </Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <SectionHeader title="Ingestion Output" />
              
              {!fileResult && !fileLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', py: 8, color: 'text.secondary', textAlign: 'center' }}>
                  <UploadFileRoundedIcon sx={{ fontSize: 64, mb: 2, color: 'action.disabled' }} />
                  <Typography variant="body1">No file parsed yet.</Typography>
                  <Typography variant="caption">Select a document on the left to run through the extraction pipeline.</Typography>
                </Box>
              )}

              {fileLoading && !fileResult && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', py: 8, textAlign: 'center' }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body1">Extracting structured fields...</Typography>
                </Box>
              )}

              {fileResult && (
                <Stack spacing={2.5}>
                  {fileResult.validation.approved ? (
                    <Alert icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />} severity="success" sx={{ borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Extraction & Validation Approved!</Typography>
                      <Typography variant="caption">Order PO number {fileResult.extraction.po_number} successfully ingested into the ledger.</Typography>
                    </Alert>
                  ) : (
                    <Alert icon={<ErrorOutlineRoundedIcon fontSize="inherit" />} severity="warning" sx={{ borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Exception Triggered!</Typography>
                      <Typography variant="caption">Verification constraints failed. Logged as exception.</Typography>
                    </Alert>
                  )}

                  <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2 }}>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                          <TableCell>{fileResult.extraction.customer_name}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                          <TableCell>{fileResult.extraction.po_number}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Total Value</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {currency(fileResult.extraction.total_amount ?? 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Delivery Date</TableCell>
                          <TableCell>{fileResult.extraction.delivery_date}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>
                            {fileResult.extraction.channel}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items Extracted</Typography>
                  <Stack spacing={1}>
                    {fileResult.extraction.items.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.25, bgcolor: '#fbfdfa', border: '1px solid rgba(0,0,0,0.04)', borderRadius: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.sku}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.quantity} x {currency(item.unit_price)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: GMAIL SYNC */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <SectionHeader title="Gmail Automation Sync" />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect order flow straight to your operational mailbox. Triggering Gmail sync fetches purchase order email threads using search filters, parses them using LLMs, and updates registries automatically.
          </Typography>

          <Stack spacing={2} sx={{ maxWidth: 500 }}>
            {settings.gmail_email ? (
              <Box sx={{ p: 2, bgcolor: 'rgba(36,95,90,0.06)', borderRadius: 2, border: '1px solid rgba(36,95,90,0.15)', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Active Gmail Connection:
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {settings.gmail_email}
                </Typography>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Gmail email address not configured. Proceeding with default environment credentials.
              </Alert>
            )}

            <Button
              startIcon={<SyncRoundedIcon />}
              variant="contained"
              disabled={gmailLoading}
              onClick={handleGmailSync}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              {gmailLoading ? 'Syncing mail inbox...' : 'Sync Gmail Purchase Orders'}
            </Button>

            {gmailFeedback && (
              <Alert severity={gmailFeedback.includes('failed') ? 'error' : 'success'} sx={{ mt: 2, borderRadius: 2 }}>
                {gmailFeedback}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      {/* TAB 3: ERP SYNC LEDGER */}
      {activeTab === 2 && (
        <Stack spacing={3}>
          {/* Active Documents State */}
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Registry Sync Status" />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Manual check and push documents from OrderFlow AI to the ERP backend system.
            </Typography>

            {syncFeedback && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSyncFeedback(null)}>
                {syncFeedback}
              </Alert>
            )}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Customer Account</TableCell>
                    <TableCell>Order Ingestion</TableCell>
                    <TableCell>Invoice Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.orders.map((order) => {
                    const orderSynced = isSynced(order.po_number, 'order')
                    const invoiceSynced = isSynced(order.po_number, 'invoice')
                    
                    return (
                      <TableRow key={order.po_number} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{order.po_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Chip
                              label={orderSynced ? 'SYNCED' : 'UNSYNCED'}
                              size="small"
                              color={orderSynced ? 'success' : 'warning'}
                              sx={{ fontWeight: 700, height: 20 }}
                            />
                            {!orderSynced && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleManualErpSync('order', order.po_number, order.customer_name, order)}
                              >
                                Push
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Chip
                              label={invoiceSynced ? 'SYNCED' : 'UNSYNCED'}
                              size="small"
                              color={invoiceSynced ? 'success' : 'warning'}
                              sx={{ fontWeight: 700, height: 20 }}
                            />
                            {!invoiceSynced && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleManualErpSync('invoice', order.po_number, order.customer_name, { po_number: order.po_number })}
                              >
                                Push
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Sync History Logs */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader title="ERP Sync Ledger Logs" />
              <Button
                startIcon={<RefreshRoundedIcon />}
                onClick={fetchLogs}
                disabled={loadingLogs}
                variant="outlined"
                size="small"
              >
                Refresh Log
              </Button>
            </Box>

            {loadingLogs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : logs.length === 0 ? (
              <Box sx={{ py: 6, textStyle: 'center', color: 'text.secondary', textAlign: 'center' }}>
                <Typography variant="body2">No ERP logs generated.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sync Timestamp</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Doc Type</TableCell>
                      <TableCell>PO Number</TableCell>
                      <TableCell>Customer Account</TableCell>
                      <TableCell align="right">Payload</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.status.toUpperCase()}
                            size="small"
                            color={log.status === 'synced' ? 'success' : 'error'}
                            sx={{ fontWeight: 700, height: 18, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {log.type}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {log.po_number}
                        </TableCell>
                        <TableCell>{log.customer_name}</TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => setSelectedPayload(log.payload)}>
                            View JSON
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      )}

      {/* TAB 4: WEB API PLAYGROUND */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <SectionHeader title="API Request specs" />
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    1. Order Webhook Endpoint
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Accepts text payloads to trigger the AI-led parsing, validation, acknowledgement email creation, and invoice generation.
                  </Typography>
                  <Box sx={{ bgcolor: '#f4f5f7', p: 1.5, borderRadius: 2, mt: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    POST /api/pipeline/run
                  </Box>
                </Box>
                
                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    2. ERP Document Sync Endpoint
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Pushes a payload (Order/Invoice) directly to the target ERP sync ledger database.
                  </Typography>
                  <Box sx={{ bgcolor: '#f4f5f7', p: 1.5, borderRadius: 2, mt: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    POST /api/erp/sync
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Example Webhook curl Command
                  </Typography>
                  <Box sx={{
                    bgcolor: '#1e293b',
                    color: '#f8fafc',
                    p: 2,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    mt: 1
                  }}>
                    {`curl -X POST http://localhost:8002/api/pipeline/run \\
  -H "Content-Type: application/json" \\
  -d '{"raw_text": "PO-1100\\nCustomer: Summit Distributors\\nSKU-COFFEE-12 Qty 5", "channel": "api"}'`}
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <SectionHeader title="API Request Playground" />
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Trigger a live webhook call using raw order text payload:
                </Typography>
                
                <TextField
                  multiline
                  minRows={6}
                  fullWidth
                  value={apiText}
                  onChange={(e) => setApiText(e.target.value)}
                  sx={{ fontFamily: 'monospace' }}
                />

                <Button
                  variant="contained"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={handleTestApi}
                  disabled={apiLoading}
                >
                  {apiLoading ? 'Executing Webhook...' : 'Fire POST /api/pipeline/run'}
                </Button>

                {apiResponse && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
                      HTTP Response Payload
                    </Typography>
                    <Box sx={{
                      bgcolor: '#1e293b',
                      color: '#f8fafc',
                      p: 2,
                      borderRadius: 2,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 250,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {apiResponse}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 5: SYSTEM CONFIGURATION SETTINGS */}
      {activeTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <SectionHeader title="System Configuration Settings" />
            <Button
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              onClick={handleSaveSettings}
              disabled={loadingSettings}
              sx={{ borderRadius: 2 }}
            >
              Save Configuration
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure environment parameters, email server logins, Gmail app passwords, and target ERP integration settings. These changes are saved in `app_config.json`.
          </Typography>

          {saveStatus && (
            <Alert severity={saveStatus.includes('Error') || saveStatus.includes('Failed') ? 'error' : 'success'} sx={{ mb: 3, borderRadius: 2 }}>
              {saveStatus}
            </Alert>
          )}

          {loadingSettings ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={4}>
              {/* Mail Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Gmail / Email Server Login
                  </Typography>
                  <TextField
                    fullWidth
                    label="Gmail Address"
                    value={settings.gmail_email}
                    onChange={(e) => setSettings({ ...settings, gmail_email: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Gmail App Password"
                    type="password"
                    value={settings.gmail_app_password}
                    onChange={(e) => setSettings({ ...settings, gmail_app_password: e.target.value })}
                  />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 8 }}>
                      <TextField
                        fullWidth
                        label="SMTP Host Address"
                        value={settings.gmail_smtp_host}
                        onChange={(e) => setSettings({ ...settings, gmail_smtp_host: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="SMTP Port"
                        type="number"
                        value={settings.gmail_smtp_port}
                        onChange={(e) => setSettings({ ...settings, gmail_smtp_port: parseInt(e.target.value) || 465 })}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>

              {/* ERP Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    ERP Connection Details
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel id="erp-select-label">ERP System</InputLabel>
                    <Select
                      labelId="erp-select-label"
                      value={settings.erp_system}
                      label="ERP System"
                      onChange={(e) => setSettings({ ...settings, erp_system: e.target.value })}
                    >
                      {ERP_SYSTEMS.map(sys => (
                        <MenuItem key={sys} value={sys}>{sys}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {settings.erp_system === 'ALO (Zoho ERP)' ? (
                    <>
                      {/* Zoho ERP ("ALO" system) specific fields */}
                      <Box sx={{ p: 2, bgcolor: 'rgba(36,95,90,0.04)', borderRadius: 2, border: '1px solid rgba(36,95,90,0.12)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5, display: 'block' }}>
                          Zoho ERP (ALO System) Configuration
                        </Typography>
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            label="Zoho Client ID"
                            value={settings.erp_client_id}
                            onChange={(e) => setSettings({ ...settings, erp_client_id: e.target.value })}
                            size="small"
                          />
                          <TextField
                            fullWidth
                            label="Zoho Client Secret"
                            type="password"
                            value={settings.erp_client_secret}
                            onChange={(e) => setSettings({ ...settings, erp_client_secret: e.target.value })}
                            size="small"
                          />
                          <TextField
                            fullWidth
                            label="Zoho Refresh Token"
                            type="password"
                            value={settings.zoho_erp?.refresh_token || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              zoho_erp: { ...settings.zoho_erp, refresh_token: e.target.value }
                            })}
                            size="small"
                          />
                          <TextField
                            fullWidth
                            label="Zoho Organization ID"
                            value={settings.zoho_erp?.organization_id || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              zoho_erp: { ...settings.zoho_erp, organization_id: e.target.value }
                            })}
                            size="small"
                          />
                          <FormControl fullWidth size="small">
                            <InputLabel id="zoho-region-label">Zoho Region / Data Center</InputLabel>
                            <Select
                              labelId="zoho-region-label"
                              value={settings.zoho_erp?.region || 'com'}
                              label="Zoho Region / Data Center"
                              onChange={(e) => setSettings({
                                ...settings,
                                zoho_erp: { ...settings.zoho_erp, region: e.target.value }
                              })}
                            >
                              <MenuItem value="com">Zoho.com (US / Global)</MenuItem>
                              <MenuItem value="eu">Zoho.eu (Europe)</MenuItem>
                              <MenuItem value="in">Zoho.in (India)</MenuItem>
                              <MenuItem value="com.au">Zoho.com.au (Australia)</MenuItem>
                              <MenuItem value="jp">Zoho.jp (Japan)</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Orders and invoices will be synced to Zoho Books (invoices) and Zoho Inventory (sales orders) via the ALO integration.
                      </Typography>
                    </>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        label="ERP Endpoint URL"
                        value={settings.erp_host_url}
                        onChange={(e) => setSettings({ ...settings, erp_host_url: e.target.value })}
                      />
                      <TextField
                        fullWidth
                        label="Client ID / Username"
                        value={settings.erp_client_id}
                        onChange={(e) => setSettings({ ...settings, erp_client_id: e.target.value })}
                      />
                      <TextField
                        fullWidth
                        label="Client Secret / Password"
                        type="password"
                        value={settings.erp_client_secret}
                        onChange={(e) => setSettings({ ...settings, erp_client_secret: e.target.value })}
                      />
                    </>
                  )}
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.erp_sync_active}
                        onChange={(e) => setSettings({ ...settings, erp_sync_active: e.target.checked })}
                      />
                    }
                    label="Sync automatically on Order Approval"
                  />
                </Stack>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* Payload Modal */}
      <Dialog open={selectedPayload !== null} onClose={() => setSelectedPayload(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>ERP Synced JSON Payload</DialogTitle>
        <DialogContent>
          {selectedPayload && (
            <Box sx={{
              bgcolor: '#1e293b',
              color: '#f8fafc',
              p: 2,
              borderRadius: 2,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap'
            }}>
              {JSON.stringify(JSON.parse(selectedPayload), null, 2)}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
