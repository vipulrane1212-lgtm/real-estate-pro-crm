export interface DemoLeadSeed {
  fullName: string;
  phone: string;
  email: string;
  source: 'meta_ads' | 'housing' | 'whatsapp' | 'google' | 'instagram' | 'website' | 'manual';
  sourceDetail: string;
  leadType: 'buy' | 'sell' | 'rent' | 'commercial';
  status: 'new' | 'contacted' | 'follow_up' | 'site_visit' | 'negotiation' | 'closed_won' | 'closed_lost';
  budgetMin: number;
  budgetMax: number;
  propertyType: string;
  location: string;
  requirement: string;
  remarks: string;
  assignTarget: 'unassigned' | 'rohan' | 'admin';
}

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Dhruv', 'Kabir', 'Rudra', 'Aryan', 'Atharv', 'Rohan', 'Ananya', 'Diya', 'Gauri', 'Isha',
  'Kavya', 'Khushi', 'Myra', 'Navya', 'Pooja', 'Riya', 'Saanvi', 'Tanvi', 'Vanya', 'Meera',
  'Priya', 'Neha', 'Sneha', 'Swati', 'Rajesh', 'Suresh', 'Ramesh', 'Alok', 'Manoj', 'Deepak',
  'Sunil', 'Anil', 'Amit', 'Sumit', 'Vikas', 'Naveen', 'Pradeep', 'Pankaj', 'Sanjay', 'Ashok'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Srivastava', 'Mishra', 'Pandey', 'Tiwari', 'Yadav', 'Singh', 'Chauhan',
  'Saxena', 'Tripathi', 'Dubey', 'Shukla', 'Dixit', 'Awasthi', 'Pathak', 'Rathore', 'Chandra', 'Agarwal',
  'Joshi', 'Malhotra', 'Bhatnagar', 'Kapoor', 'Seth', 'Chaturvedi', 'Upadhyay', 'Bhardwaj', 'Nigam', 'Rastogi'
];

const LUCKNOW_LOCATIONS = [
  'Gomti Nagar Extension',
  'Hazratganj',
  'Indira Nagar',
  'Aliganj',
  'Amar Shaheed Path',
  'Vibhuti Khand',
  'Sushant Golf City',
  'Jankipuram',
  'Mahanagar',
  'Raebareli Road',
  'Faizabad Road',
  'Ashiyana',
  'Vikas Nagar',
  'Omaxe City',
  'Eldeco Udyan',
];

const REQUIREMENTS = [
  '2 BHK Flat',
  '3 BHK Luxury Flat',
  '4 BHK Penthouse',
  'Residential Villa',
  'Gated Community Plot',
  'Commercial Shop',
  'Commercial Office Space',
  'Ready to Move 3 BHK',
  'Corner Plot 2000 sqft',
];

export function generate100DemoLeads(): DemoLeadSeed[] {
  const leads: DemoLeadSeed[] = [];

  // Distribution specification:
  // Meta Ads: 30
  // Housing: 25
  // WhatsApp: 15
  // Google: 12
  // Instagram: 10
  // Website: 5
  // Manual: 3
  // Total = 100
  const sourcesConfig: Array<{
    source: DemoLeadSeed['source'];
    detailPrefix: string;
    count: number;
  }> = [
    { source: 'meta_ads', detailPrefix: 'FB Lead Gen - Gomti Riverfront Campaign', count: 30 },
    { source: 'housing', detailPrefix: 'Housing.com - Omaxe Heights Project', count: 25 },
    { source: 'whatsapp', detailPrefix: 'WhatsApp Click-to-Chat QR Code', count: 15 },
    { source: 'google', detailPrefix: 'Google Search - Luxury Flats Lucknow', count: 12 },
    { source: 'instagram', detailPrefix: 'IG Story Video Ad - Shalimar Grand', count: 10 },
    { source: 'website', detailPrefix: 'diksharealestate.com Web Portal Form', count: 5 },
    { source: 'manual', detailPrefix: 'Walk-in Office Enquiry', count: 3 },
  ];

  let currentLeadIndex = 1;

  for (const src of sourcesConfig) {
    for (let i = 0; i < src.count; i++) {
      const idx = currentLeadIndex; // 1 to 100

      // Phones ONLY in 90000 00001 - 90000 00100
      const phoneDigits = String(idx).padStart(5, '0');
      const phone = `+91 90000 ${phoneDigits}`;

      // Assignment spread:
      // 1..40: unassigned (40 leads)
      // 41..70: rohan (30 leads)
      // 71..100: admin (30 leads)
      let assignTarget: DemoLeadSeed['assignTarget'] = 'unassigned';
      if (idx > 40 && idx <= 70) {
        assignTarget = 'rohan';
      } else if (idx > 70) {
        assignTarget = 'admin';
      }

      // Name generator
      const fName = INDIAN_FIRST_NAMES[(idx * 7) % INDIAN_FIRST_NAMES.length];
      const lName = INDIAN_LAST_NAMES[(idx * 11) % INDIAN_LAST_NAMES.length];
      const fullName = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${idx}@demo-client.com`;

      // Location & Requirement
      const location = LUCKNOW_LOCATIONS[(idx * 3) % LUCKNOW_LOCATIONS.length];
      const req = REQUIREMENTS[(idx * 5) % REQUIREMENTS.length];

      // Type & Status
      const leadTypes: DemoLeadSeed['leadType'][] = ['buy', 'buy', 'buy', 'rent', 'commercial', 'sell'];
      const leadType = leadTypes[idx % leadTypes.length];

      const statuses: DemoLeadSeed['status'][] = ['new', 'contacted', 'follow_up', 'site_visit', 'negotiation'];
      const status = statuses[idx % statuses.length];

      // Budget (realistic Lucknow property market)
      const budgetBase = 2500000 + ((idx * 350000) % 25000000); // 25L to 2.75Cr
      const budgetMin = Math.round(budgetBase / 100000) * 100000;
      const budgetMax = budgetMin + 1500000;

      leads.push({
        fullName,
        phone,
        email,
        source: src.source,
        sourceDetail: `${src.detailPrefix} (Batch ${Math.floor(i / 5) + 1})`,
        leadType,
        status,
        budgetMin,
        budgetMax,
        propertyType: req.includes('Plot') ? 'plot_land' : req.includes('Commercial') ? 'commercial' : 'new_project',
        location,
        requirement: req,
        remarks: `[DEMO RECORD #${idx}] Interested in ${req} near ${location}.`,
        assignTarget,
      });

      currentLeadIndex++;
    }
  }

  return leads;
}
