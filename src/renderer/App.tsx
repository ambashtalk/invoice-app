import { HashRouter, Routes, Route } from 'react-router-dom'
import { NetworkProvider } from './contexts/NetworkContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import InvoiceList from './pages/InvoiceList'
import InvoiceEditor from './pages/InvoiceEditor'
import InvoicePDF from './pages/InvoicePDF'
import ClientList from './pages/ClientList'
import Settings from './pages/Settings'

export default function App() {
    return (
        <NetworkProvider>
            <ToastProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<InvoiceList />} />
                            <Route path="invoices/new" element={<InvoiceEditor />} />
                            <Route path="invoices/:id" element={<InvoiceEditor />} />
                            <Route path="invoices/:id/edit" element={<InvoiceEditor />} />
                            <Route path="invoices/:id/preview" element={<InvoicePDF />} />
                            <Route path="clients" element={<ClientList />} />
                            <Route path="settings/:tab?" element={<Settings />} />
                        </Route>
                    </Routes>
                </HashRouter>
            </ToastProvider>
        </NetworkProvider>
    )
}
