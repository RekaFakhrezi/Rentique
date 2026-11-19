import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import {Toaster} from 'sonner'
import '@fontsource-variable/inter'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/playfair-display/wght-italic.css'
import './base.css'
import {Providers} from './shared.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<BrowserRouter><Providers><App/><Toaster position="bottom-right" closeButton/></Providers></BrowserRouter>)
