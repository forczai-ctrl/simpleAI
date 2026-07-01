import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { AppShell, type PageKey } from './layouts/AppShell'
import { Collections } from './pages/Collections'
import { Dashboard } from './pages/Dashboard'
import { Fulfillment } from './pages/Fulfillment'
import { Invoices } from './pages/Invoices'
import { Orders } from './pages/Orders'
import { Payments } from './pages/Payments'
import { Reports } from './pages/Reports'
import { Validation } from './pages/Validation'
import { Inventory } from './pages/Inventory'
import { Vendors } from './pages/Vendors'
import { ExceptionManagement } from './pages/ExceptionManagement'
import { Authentication } from './pages/Authentication'
import { generateReminder, getDashboard, getUseCases, reconcilePayment, runPipeline, sampleRawOrder } from './services/api'
import type { CollectionReminder, DashboardResponse, PipelineRun, ReconciliationResult, UseCase, Invoice, FulfillmentTask, Payment } from './types'

function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [rawText, setRawText] = useState(sampleRawOrder)
  const [pipeline, setPipeline] = useState<PipelineRun | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null)
  const [reminder, setReminder] = useState<CollectionReminder | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [apiReady, setApiReady] = useState(false)

  useEffect(() => {
    Promise.all([
      getDashboard().catch(() => null),
      getUseCases().catch(() => [])
    ]).then(([dashboardData, useCasesData]) => {
      if (dashboardData) setDashboard(dashboardData)
      if (useCasesData) setUseCases(useCasesData)
      setApiReady(true)
    })
  }, [])

  async function handleRunPipeline() {
    setLoading(true)
    try {
      const result = await runPipeline(rawText)
      setPipeline(result)
      
      // Update local state so the new order shows up immediately in the registry
      if (dashboard) {
        setDashboard({
          ...dashboard,
          orders: [result.extraction, ...dashboard.orders],
          invoices: [result.invoice, ...dashboard.invoices],
          fulfillment: [
            {
              order_id: `ord-${result.extraction.po_number}`,
              po_number: result.extraction.po_number,
              customer_name: result.extraction.customer_name,
              stage: 'pending',
              owner: 'Ops Team A',
              committed_date: result.extraction.delivery_date,
              risk: 'low',
            },
            ...dashboard.fulfillment,
          ]
        })
      }
      
      setActivePage('orders')
      setNotice('Order extracted, validated, acknowledged, and invoiced.')
    } catch (err) {
      setNotice('Pipeline error: Failed to parse and extract the order.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReconcile(payment: Payment) {
    const result = await reconcilePayment(payment)
    setReconciliation(result)
    setNotice(`Reconciliation result generated for payment ${payment.payment_id}.`)
  }

  async function handleReminder(invoice: Invoice) {
    const result = await generateReminder(invoice)
    setReminder(result)
    setNotice(`Collections reminder generated for invoice ${invoice.invoice_no}.`)
  }

  function handleUpdateFulfillment(updatedTask: FulfillmentTask) {
    if (!dashboard) return
    const newFulfillment = dashboard.fulfillment.map((t) =>
      t.order_id === updatedTask.order_id ? updatedTask : t
    )
    setDashboard({
      ...dashboard,
      fulfillment: newFulfillment,
    })
    setNotice(`Fulfillment board updated for PO ${updatedTask.po_number}.`)
  }

  function handleUpdateInvoice(updatedInvoice: Invoice) {
    if (pipeline && pipeline.invoice_validation.invoice?.invoice_no === updatedInvoice.invoice_no) {
      setPipeline({
        ...pipeline,
        invoice_validation: {
          ...pipeline.invoice_validation,
          invoice: updatedInvoice,
        },
      })
    }
    if (!dashboard) return
    const newInvoices = dashboard.invoices.map((inv) =>
      inv.invoice_no === updatedInvoice.invoice_no ? updatedInvoice : inv
    )
    setDashboard({
      ...dashboard,
      invoices: newInvoices,
    })
    setNotice(`Invoice ${updatedInvoice.invoice_no} updated.`)
  }

  if (!apiReady || !dashboard) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2, bgcolor: 'background.default' }}>
        <Typography variant="body1" color="text.secondary">Loading OrderFlow AI...</Typography>
      </Box>
    )
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'dashboard' ? <Dashboard dashboard={dashboard} onNavigate={setActivePage} /> : null}
      {activePage === 'orders' ? (
        <Orders 
          orders={dashboard.orders} 
          rawText={rawText} 
          pipeline={pipeline} 
          loading={loading} 
          onRawTextChange={setRawText} 
          onRunPipeline={handleRunPipeline} 
        />
      ) : null}
      {activePage === 'validation' ? <Validation pipeline={pipeline} /> : null}
      {activePage === 'fulfillment' ? <Fulfillment dashboard={dashboard} onUpdateFulfillment={handleUpdateFulfillment} /> : null}
      {activePage === 'inventory' ? <Inventory /> : null}
      {activePage === 'vendors' ? <Vendors /> : null}
      {activePage === 'invoices' ? <Invoices dashboard={dashboard} pipeline={pipeline} onUpdateInvoice={handleUpdateInvoice} /> : null}
      {activePage === 'payments' ? <Payments dashboard={dashboard} reconciliation={reconciliation} onReconcile={handleReconcile} /> : null}
      {activePage === 'collections' ? <Collections dashboard={dashboard} reminder={reminder} onGenerateReminder={handleReminder} /> : null}
      {activePage === 'reports' ? <Reports useCases={useCases} /> : null}
      {activePage === 'exceptions' ? <ExceptionManagement /> : null}
      {activePage === 'auth' ? <Authentication /> : null}
      
      <Snackbar open={Boolean(notice)} autoHideDuration={3200} onClose={() => setNotice(null)}>
        <Alert severity={notice?.includes('error') || notice?.includes('Failed') ? 'error' : 'success'} variant="filled" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      </Snackbar>
    </AppShell>
  )
}

export default App


