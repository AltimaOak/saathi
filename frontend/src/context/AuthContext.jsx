import React, { createContext, useContext, useState, useEffect } from 'react';

// Preset merchant accounts for instant testing
export const PRESET_MERCHANTS = [
  {
    id: 'merchant-ramesh',
    name: 'Ramesh Choudhary',
    shopName: 'Ramesh Kirana & Chai',
    city: 'Dadar West, Mumbai',
    category: 'Kirana & Grocery',
    phone: '+91 98201 44910',
    terminalId: 'PTM-MUM-8821',
    soundboxSerial: 'PTM-SB-4019',
    soundboxModel: 'Soundbox 4.0 (4G)',
    soundboxBattery: '86%',
    bankName: 'HDFC Bank',
    accountNumber: '•••• •••• 4091',
    ifsc: 'HDFC0000240',
    qrCollectionsToday: '₹8,450',
    monthlyVolume: '₹1.84 Lakh',
    settlementCycle: 'Next-Day 7:00 AM',
    pendingIssue: 'Settlement delayed (IFSC update pending)',
    loanEligibility: '₹2,50,000 Pre-approved',
    preferredLanguage: 'hi',
    voiceResponseEnabled: true,
    speechRate: 1.0,
    preferredVoiceIdentifier: '',
    recentTransactions: [
      { id: 'TXN-901', time: '17:10', amount: '₹320', mode: 'Paytm UPI QR', customer: 'Sanjay P.', status: 'Success' },
      { id: 'TXN-902', time: '16:45', amount: '₹140', mode: 'PhonePe UPI', customer: 'Deepak M.', status: 'Success' },
      { id: 'TXN-903', time: '15:20', amount: '₹4,850', mode: 'Bulk Settlement', customer: 'Paytm IMPS', status: 'Re-routed' },
      { id: 'TXN-904', time: '14:05', amount: '₹75', mode: 'Google Pay', customer: 'Rohan K.', status: 'Success' },
    ],
    chartData: [
      { day: 'Mon', sales: 4200, transactions: 38 },
      { day: 'Tue', sales: 5100, transactions: 44 },
      { day: 'Wed', sales: 6800, transactions: 52 },
      { day: 'Thu', sales: 4900, transactions: 41 },
      { day: 'Fri', sales: 7400, transactions: 63 },
      { day: 'Sat', sales: 9800, transactions: 88 },
      { day: 'Sun', sales: 8450, transactions: 76 },
    ],
  },
  {
    id: 'merchant-priya',
    name: 'Priya Sharma',
    shopName: 'Sharma Organic Provisions',
    city: 'Indiranagar, Bengaluru',
    category: 'Organic Mart & Gourmet',
    phone: '+91 98450 11920',
    terminalId: 'PTM-BLR-3304',
    soundboxSerial: 'PTM-SB-7740',
    soundboxModel: 'Soundbox Smart Display 4G',
    soundboxBattery: '94%',
    bankName: 'ICICI Bank',
    accountNumber: '•••• •••• 8812',
    ifsc: 'ICIC0000104',
    qrCollectionsToday: '₹24,800',
    monthlyVolume: '₹4.20 Lakh',
    settlementCycle: 'Instant IMPS (Same-day)',
    pendingIssue: 'Customer refund pending (₹1,450)',
    loanEligibility: '₹5,00,000 Working Capital Limit',
    preferredLanguage: 'en',
    voiceResponseEnabled: true,
    speechRate: 1.0,
    preferredVoiceIdentifier: '',
    recentTransactions: [
      { id: 'TXN-801', time: '17:12', amount: '₹1,240', mode: 'Paytm UPI QR', customer: 'Ananya S.', status: 'Success' },
      { id: 'TXN-802', time: '16:50', amount: '₹850', mode: 'CRED UPI', customer: 'Vikrant R.', status: 'Success' },
      { id: 'TXN-803', time: '16:15', amount: '₹1,450', mode: 'Auto-Refund', customer: 'Mrs. Sharma', status: 'Reversed' },
      { id: 'TXN-804', time: '15:30', amount: '₹3,400', mode: 'Paytm Soundbox QR', customer: 'Naveen K.', status: 'Success' },
    ],
    chartData: [
      { day: 'Mon', sales: 18200, transactions: 72 },
      { day: 'Tue', sales: 21500, transactions: 85 },
      { day: 'Wed', sales: 24000, transactions: 96 },
      { day: 'Thu', sales: 19800, transactions: 80 },
      { day: 'Fri', sales: 28400, transactions: 114 },
      { day: 'Sat', sales: 34500, transactions: 142 },
      { day: 'Sun', sales: 24800, transactions: 108 },
    ],
  },
  {
    id: 'merchant-vikram',
    name: 'Vikram Gupta',
    shopName: 'Gupta Sweets & Farsan',
    city: 'Chandni Chowk, Delhi',
    category: 'Sweets & Confectionery',
    phone: '+91 98110 33490',
    terminalId: 'PTM-DEL-9901',
    soundboxSerial: 'PTM-SB-9014',
    soundboxModel: 'Soundbox 4.0 Dual Speaker',
    soundboxBattery: '72%',
    bankName: 'State Bank of India',
    accountNumber: '•••• •••• 9210',
    ifsc: 'SBIN0000691',
    qrCollectionsToday: '₹48,200',
    monthlyVolume: '₹6.80 Lakh',
    settlementCycle: 'Daily Twice (12 PM & 6 PM)',
    pendingIssue: 'High-value festival settlement hold (> ₹45,000)',
    loanEligibility: '₹10,00,000 Festive SME Credit',
    preferredLanguage: 'hi',
    voiceResponseEnabled: true,
    speechRate: 1.0,
    preferredVoiceIdentifier: '',
    recentTransactions: [
      { id: 'TXN-701', time: '17:14', amount: '₹4,500', mode: 'Paytm Card Machine', customer: 'Ashok B.', status: 'Success' },
      { id: 'TXN-702', time: '16:55', amount: '₹2,100', mode: 'Paytm Soundbox QR', customer: 'Suman G.', status: 'Success' },
      { id: 'TXN-703', time: '16:30', amount: '₹45,000', mode: 'Supplier Transfer', customer: 'Kunal S. (Review)', status: 'Escalated' },
      { id: 'TXN-704', time: '15:10', amount: '₹1,800', mode: 'BHIM UPI', customer: 'Harish T.', status: 'Success' },
    ],
    chartData: [
      { day: 'Mon', sales: 38000, transactions: 160 },
      { day: 'Tue', sales: 42000, transactions: 185 },
      { day: 'Wed', sales: 46500, transactions: 204 },
      { day: 'Thu', sales: 41000, transactions: 178 },
      { day: 'Fri', sales: 55000, transactions: 240 },
      { day: 'Sat', sales: 68000, transactions: 310 },
      { day: 'Sun', sales: 48200, transactions: 215 },
    ],
  },
];

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Load saved merchant from localStorage or default to Ramesh
  const [currentMerchant, setCurrentMerchant] = useState(() => {
    try {
      const saved = localStorage.getItem('saathi_current_merchant');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load merchant:', e);
    }
    return PRESET_MERCHANTS[0];
  });

  const [merchantsList, setMerchantsList] = useState(() => {
    try {
      const savedList = localStorage.getItem('saathi_merchants_list');
      if (savedList) return JSON.parse(savedList);
    } catch (e) {
      console.warn('Failed to load merchants list:', e);
    }
    return PRESET_MERCHANTS;
  });

  // Switch merchant
  const switchMerchant = (merchantId) => {
    const found = merchantsList.find((m) => m.id === merchantId);
    if (found) {
      setCurrentMerchant(found);
      localStorage.setItem('saathi_current_merchant', JSON.stringify(found));
    }
  };

  // Sign up / Add custom merchant
  const registerMerchant = (newMerchantData) => {
    const newMerchant = {
      id: `merchant-${Date.now()}`,
      name: newMerchantData.name,
      shopName: newMerchantData.shopName,
      city: newMerchantData.city || 'Mumbai, India',
      category: newMerchantData.category || 'Retail Store',
      phone: newMerchantData.phone || '+91 98000 00000',
      terminalId: `PTM-${newMerchantData.city ? newMerchantData.city.slice(0, 3).toUpperCase() : 'IND'}-${Math.floor(1000 + Math.random() * 9000)}`,
      soundboxSerial: `PTM-SB-${Math.floor(1000 + Math.random() * 9000)}`,
      soundboxModel: 'Soundbox 4.0 (4G)',
      soundboxBattery: '98%',
      bankName: newMerchantData.bankName || 'State Bank of India',
      accountNumber: `•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      ifsc: newMerchantData.ifsc || 'SBIN0001000',
      qrCollectionsToday: '₹3,200',
      monthlyVolume: '₹1.50 Lakh',
      settlementCycle: 'Daily 7:00 AM',
      pendingIssue: 'New terminal linked • All services healthy',
      loanEligibility: '₹1,50,000 Starter Credit',
      recentTransactions: [
        { id: `TXN-${Math.floor(100 + Math.random() * 900)}`, time: '17:15', amount: '₹150', mode: 'Paytm UPI QR', customer: 'Customer A.', status: 'Success' },
        { id: `TXN-${Math.floor(100 + Math.random() * 900)}`, time: '16:30', amount: '₹420', mode: 'Paytm Soundbox QR', customer: 'Customer B.', status: 'Success' },
      ],
      chartData: [
        { day: 'Mon', sales: 2400, transactions: 18 },
        { day: 'Tue', sales: 3100, transactions: 24 },
        { day: 'Wed', sales: 2800, transactions: 22 },
        { day: 'Thu', sales: 3500, transactions: 28 },
        { day: 'Fri', sales: 4200, transactions: 36 },
        { day: 'Sat', sales: 4900, transactions: 42 },
        { day: 'Sun', sales: 3200, transactions: 25 },
      ],
    };

    const updated = [newMerchant, ...merchantsList];
    setMerchantsList(updated);
    setCurrentMerchant(newMerchant);
    localStorage.setItem('saathi_merchants_list', JSON.stringify(updated));
    localStorage.setItem('saathi_current_merchant', JSON.stringify(newMerchant));
    return newMerchant;
  };

  // Update voice & language profile preferences
  const updateMerchantVoiceProfile = (settings) => {
    if (!currentMerchant) return;
    const updatedMerchant = {
      ...currentMerchant,
      preferredLanguage: settings.preferredLanguage ?? currentMerchant.preferredLanguage ?? 'en',
      voiceResponseEnabled: settings.voiceResponseEnabled ?? currentMerchant.voiceResponseEnabled ?? true,
      speechRate: settings.speechRate ?? currentMerchant.speechRate ?? 1.0,
      preferredVoiceIdentifier: settings.preferredVoiceIdentifier ?? currentMerchant.preferredVoiceIdentifier ?? '',
    };
    setCurrentMerchant(updatedMerchant);
    localStorage.setItem('saathi_current_merchant', JSON.stringify(updatedMerchant));

    const updatedList = merchantsList.map((m) =>
      m.id === currentMerchant.id ? updatedMerchant : m
    );
    setMerchantsList(updatedList);
    localStorage.setItem('saathi_merchants_list', JSON.stringify(updatedList));
  };

  // Logout / Reset to Guest
  const logout = () => {
    setCurrentMerchant(null);
    localStorage.removeItem('saathi_current_merchant');
  };

  return (
    <AuthContext.Provider
      value={{
        currentMerchant,
        merchantsList,
        switchMerchant,
        registerMerchant,
        updateMerchantVoiceProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

