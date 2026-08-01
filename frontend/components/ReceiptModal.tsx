'use client'

import { useState } from 'react'

export default function ReceiptModal({ 
  bill, 
  settings, 
  patient, 
  doctorName, 
  onClose 
}: { 
  bill: any, 
  settings: any, 
  patient: any, 
  doctorName: string,
  onClose: () => void 
}) {
  if (!bill) return null

  const totalAmount = parseFloat(bill.amount)
  const registrationFee = 50
  const consultationFee = totalAmount > registrationFee ? totalAmount - registrationFee : totalAmount

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F8F9FA] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-gray-200 border-dashed">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{settings?.hospital_name || 'Hospital Name'}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {settings?.address || 'Hospital Address'}<br/>
            Ph: {settings?.phone || 'N/A'} · GSTIN: {settings?.gstin || 'N/A'}
          </p>
        </div>

        {/* Receipt Info */}
        <div className="px-8 py-6 bg-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">Receipt no</p>
              <p className="font-semibold text-gray-900">{bill.receipt_no || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">Date and time</p>
              <p className="font-semibold text-gray-900">
                {bill.paid_at ? new Date(bill.paid_at).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(bill.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Patient</span>
              <span className="font-semibold text-gray-900">{patient?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Patient ID</span>
              <span className="font-semibold text-gray-900">HMS-{patient?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Doctor</span>
              <span className="font-semibold text-gray-900">Dr {doctorName}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium border-b border-gray-100 pb-2">
              <span className="text-gray-400 uppercase tracking-wider text-xs">Description</span>
              <span className="text-gray-400 uppercase tracking-wider text-xs">Amount</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-800 font-medium">Consultation fee</span>
              <span className="font-medium">₹{consultationFee.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-800 font-medium">Registration charge</span>
              <span className="font-medium">₹{registrationFee.toFixed(0)}</span>
            </div>
            
            <div className="border-t border-gray-200 border-dashed pt-4 mt-2">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-900 text-base">Total paid</span>
                <span className="font-bold text-gray-900 text-lg">₹{totalAmount.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Payment method</span>
                <span className="font-semibold text-gray-900 capitalize">{bill.payment_method || 'Cash'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-10 pt-6 bg-[#F8F9FA] text-center border-t border-gray-200 border-dashed relative">
          <p className="text-xs text-gray-500 font-medium">
            Thank you for visiting {settings?.hospital_name?.split(' ')[0] || 'our'} hospital<br/>
            Collected by: Reception desk {bill.collected_by || '1'}
          </p>
          
          <button 
            onClick={onClose}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-gray-600 hover:bg-gray-800 text-white rounded-full p-2.5 shadow-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </button>
        </div>
        
      </div>
    </div>
  )
}
