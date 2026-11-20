const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'uploads', 'property-photos');
const VIDEOS_DIR = path.join(process.cwd(), 'public', 'uploads', 'property-videos');

fs.mkdirSync(PHOTOS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
      resolve(true);
      return;
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) {
        req.destroy();
        generateFallbackSvg(destPath);
        resolve(false);
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on('error', () => {
        generateFallbackSvg(destPath);
        resolve(false);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      generateFallbackSvg(destPath);
      resolve(false);
    });

    req.on('error', () => {
      generateFallbackSvg(destPath);
      resolve(false);
    });
  });
}

function generateFallbackSvg(destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 200) return;
  const baseName = path.basename(destPath, path.extname(destPath));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <circle cx="400" cy="250" r="80" fill="#d97706" opacity="0.2"/>
    <path d="M 340 320 L 400 240 L 460 320 Z" fill="#f59e0b"/>
    <rect x="360" y="320" width="80" height="70" fill="#fbbf24"/>
    <text x="400" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">DIKSHA REAL ESTATE</text>
    <text x="400" y="480" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">${baseName.toUpperCase()}</text>
  </svg>`;
  try {
    fs.writeFileSync(destPath, Buffer.from(svg));
  } catch (err) {
    console.error('Failed writing fallback svg:', err.message);
  }
}

// 12 Realistic Properties with multiple room mockups
const PROPERTIES_DATA = [
  {
    title: 'Omaxe Waterscapes 3 BHK Luxury Flat',
    property_code: 'DK-FLAT-1001',
    property_type: 'resale',
    listing_type: 'sale',
    price: 9500000,
    size_sqft: 1750,
    bhk: '3 BHK',
    bedrooms: 3,
    bathrooms: 3,
    location: 'Gomti Nagar Extension',
    address: 'Tower 4, Omaxe Waterscapes, Sector 7, Gomti Nagar Extension',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Spacious 3 BHK east-facing luxury flat overlooking green landscaped gardens in Omaxe Waterscapes. Features modular Italian kitchen, wooden flooring in master suite, and double balconies.',
    owner_name: 'Dr. Alok Srivastava',
    owner_phone: '+91 98390 12345',
    amenities: ['Swimming Pool', 'Clubhouse', '24x7 Security', 'Power Backup', 'Gymnasium', 'Reserved Parking', 'Intercom'],
    view_360_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-1-ext.jpg', room: 'Exterior', caption: 'High-rise Tower Façade & Entrance' },
      { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-1-living.jpg', room: 'Living Room', caption: 'Spacious Hall with Italian Marble Flooring' },
      { url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-1-bed.jpg', room: 'Master Bedroom', caption: 'Master Bedroom with Attached Balcony' },
      { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-1-kitchen.jpg', room: 'Kitchen', caption: 'Modular Italian Kitchen with Hob & Chimney' },
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-1-balcony.jpg', room: 'Balcony', caption: 'Panoramic Garden & Skyline View' }
    ],
    videos: [
      { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', title: 'Full Walkthrough Video Tour', room: 'Full Property', type: 'direct' }
    ]
  },
  {
    title: 'Rishita Manhattan 2 BHK Smart Apartment',
    property_code: 'DK-FLAT-1002',
    property_type: 'new_project',
    listing_type: 'sale',
    price: 6200000,
    size_sqft: 1180,
    bhk: '2 BHK',
    bedrooms: 2,
    bathrooms: 2,
    location: 'Amar Shaheed Path',
    address: 'Block B, Rishita Manhattan, Sector 7, Amar Shaheed Path',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226002',
    status: 'available',
    description: 'Modern 2 BHK apartment designed for working professionals. Located directly on Amar Shaheed Path with quick connectivity to airport and Ekana Stadium.',
    owner_name: 'Manish Tandon',
    owner_phone: '+91 94150 23456',
    amenities: ['Gym', 'Clubhouse', "Children's Play Area", 'Jogging Track', 'EV Charging Point', '24x7 Security'],
    view_360_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-2-living.jpg', room: 'Living Room', caption: 'Contemporary Living & Dining Space' },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-2-bed.jpg', room: 'Bedroom', caption: 'Cozy Bedroom with Large Windows' },
      { url: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-2-kitchen.jpg', room: 'Kitchen', caption: 'Compact Modular Kitchen with Granite Counter' },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-2-bath.jpg', room: 'Bathroom', caption: 'Designer Bathroom with Kohler Fixtures' }
    ],
    videos: [
      { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', title: 'Apartment Tour & Balcony View', room: 'Living Room', type: 'direct' }
    ]
  },
  {
    title: 'Eldeco Greens 4 BHK Ultra-Luxury Penthouse',
    property_code: 'DK-PENT-1003',
    property_type: 'resale',
    listing_type: 'sale',
    price: 24000000,
    size_sqft: 3400,
    bhk: '4 BHK',
    bedrooms: 4,
    bathrooms: 5,
    location: 'Gomti Nagar',
    address: 'Penthouse 1401, Eldeco Greens, Vipul Khand, Gomti Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Sky villa duplex penthouse with 360-degree panoramic skyline views. High ceilings, expansive private deck, imported marble flooring, and smart climate control.',
    owner_name: 'Rajeev Singhania',
    owner_phone: '+91 99350 34567',
    amenities: ['Private Terrace', 'Jacuzzi', 'Home Automation', 'Private Elevator Access', 'Concierge Service', '3 Covered Parkings'],
    view_360_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-3-living.jpg', room: 'Living Room', caption: 'Grand Double-Height Living Room' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-3-terrace.jpg', room: 'Balcony', caption: 'Private Rooftop Deck & Jacuzzi' },
      { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-3-bed.jpg', room: 'Master Bedroom', caption: 'Presidential Master Suite with Walk-in Wardrobe' },
      { url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-3-kitchen.jpg', room: 'Kitchen', caption: 'Designer Island Kitchen with Wine Chiller' }
    ],
    videos: [
      { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', title: 'Duplex Penthouse Drone & Walkthrough', room: 'Full Property', type: 'direct' }
    ]
  },
  {
    title: 'Ansal Sushant Golf City Independent Villa',
    property_code: 'DK-VILL-1004',
    property_type: 'resale',
    listing_type: 'sale',
    price: 18500000,
    size_sqft: 2650,
    bhk: '4 BHK',
    bedrooms: 4,
    bathrooms: 4,
    location: 'Sushant Golf City',
    address: 'Villa No. 42, Celebrity Greens, Sushant Golf City',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226030',
    status: 'available',
    description: 'Contemporary 4 BHK duplex villa with landscaped lawn, open courtyard, and golf view. Walking distance to Medanta Hospital and Lulu Mall.',
    owner_name: 'Col. Sanjeev Mehrotra',
    owner_phone: '+91 98110 45678',
    amenities: ['Private Garden', 'Gated Community', 'Golf Course Access', 'Solar Water Heating', 'Servant Room', 'CCTV Security'],
    view_360_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-4-ext.jpg', room: 'Exterior', caption: 'Villa Façade with Landscaped Lawn' },
      { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-4-living.jpg', room: 'Living Room', caption: 'Spacious Villa Lounge with Garden View' },
      { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-4-bed.jpg', room: 'Bedroom', caption: 'Airy First-Floor Bedroom with Terrace' },
      { url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-4-dining.jpg', room: 'Dining Area', caption: 'Family Dining Space next to Kitchen' }
    ],
    videos: [
      { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', title: 'Independent Villa Walkthrough', room: 'Full Property', type: 'direct' }
    ]
  },
  {
    title: 'Shalimar Titanium Prime Commercial Office',
    property_code: 'DK-COMM-1005',
    property_type: 'commercial',
    listing_type: 'sale',
    price: 17500000,
    size_sqft: 2100,
    bhk: 'Commercial Office',
    bedrooms: 0,
    bathrooms: 2,
    location: 'Vibhuti Khand',
    address: 'Office 604, Shalimar Titanium, Vibhuti Khand, Gomti Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Grade-A furnished commercial office space in Lucknow premier financial hub. Ideal for corporate headquarters, IT firms, and legal consultants.',
    owner_name: 'Apex Infotech Ltd',
    owner_phone: '+91 97920 56789',
    amenities: ['High Speed Elevators', 'Centrally Air Conditioned', '100% Power Backup', 'Multi-tier Security', 'Ample Visitor Parking'],
    view_360_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-5-ext.jpg', room: 'Exterior', caption: 'Glass Façade Commercial Tower' },
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-5-office.jpg', room: 'Office Area', caption: 'Furnished Workstation Bay for 20+ Seats' },
      { url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-5-conf.jpg', room: 'Conference Room', caption: '12-Seater Boardroom with Projector Setup' }
    ],
    videos: []
  },
  {
    title: 'Cyber Heights Furnished IT Office Suite',
    property_code: 'DK-RENT-1006',
    property_type: 'rental',
    listing_type: 'rent',
    price: 85000,
    size_sqft: 1450,
    bhk: 'Commercial Space',
    bedrooms: 0,
    bathrooms: 2,
    location: 'Vibhuti Khand',
    address: 'Suite 302, Cyber Heights, Vibhuti Khand, Gomti Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Ready-to-move plug-and-play furnished office suite with 25 workstations, 2 director cabins, and a 10-seater conference room.',
    owner_name: 'Prakash Saxena',
    owner_phone: '+91 94500 67890',
    amenities: ['High Speed Internet Ready', 'Cafeteria', 'Conference Room', 'Server Room Access', '24x7 Entry', 'Biometric Access'],
    view_360_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-6-work.jpg', room: 'Office Area', caption: 'Plug & Play Ergonomic Workstations' },
      { url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-6-cabin.jpg', room: 'Director Cabin', caption: 'Executive Director Cabin with Wooden Decor' }
    ],
    videos: []
  },
  {
    title: 'Sushant Golf City East-Facing Residential Plot',
    property_code: 'DK-PLOT-1007',
    property_type: 'plot_land',
    listing_type: 'sale',
    price: 7200000,
    size_sqft: 2152,
    bhk: 'Residential Plot',
    bedrooms: 0,
    bathrooms: 0,
    location: 'Sushant Golf City',
    address: 'Plot No. C-184, Sector C, Pocket 3, Sushant Golf City',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226030',
    status: 'available',
    description: 'LDA-approved freehold corner plot with 50 ft frontage. Immediate registry and mutation, ready for building independent bungalow or duplex.',
    owner_name: 'Anand Mishra',
    owner_phone: '+91 98890 78901',
    amenities: ['Corner Plot', 'Wide 40ft Road', 'Underground Drainage', 'Electricity Line Connected', 'LDA Approved'],
    view_360_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-7-plot.jpg', room: 'Plot View', caption: 'East-Facing Levelled Corner Plot' },
      { url: 'https://images.unsplash.com/photo-1524813686514-a57563d77d66?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-7-road.jpg', room: 'Road Frontage', caption: '40ft Wide Bitumen Road with Street Lights' }
    ],
    videos: []
  },
  {
    title: 'Rohtas Presidential 3 BHK Garden Flat',
    property_code: 'DK-FLAT-1008',
    property_type: 'resale',
    listing_type: 'sale',
    price: 8800000,
    size_sqft: 1620,
    bhk: '3 BHK',
    bedrooms: 3,
    bathrooms: 3,
    location: 'Vibhuti Khand',
    address: 'Flat 802, Rohtas Presidential Towers, Vibhuti Khand',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Prime 3 BHK flat with uninterrupted views of Lohia Park. Marble flooring, spacious bedrooms with wooden wardrobes, and modern fittings.',
    owner_name: 'Smt. Vandana Gupta',
    owner_phone: '+91 93350 89012',
    amenities: ['Lohia Park View', 'Swimming Pool', 'Covered Parking', 'Visitor Parking', 'CCTV Security', 'High Speed Lifts'],
    view_360_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-8-living.jpg', room: 'Living Room', caption: 'Sunlit Living Hall with Park View' },
      { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-8-bed.jpg', room: 'Master Bedroom', caption: 'Spacious Master Bedroom with Wooden Wardrobe' },
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-8-kitchen.jpg', room: 'Kitchen', caption: 'Fully Fitted Kitchen with Utility Balcony' }
    ],
    videos: []
  },
  {
    title: 'Paarth Republic 2 BHK Affordable Flat',
    property_code: 'DK-FLAT-1009',
    property_type: 'new_project',
    listing_type: 'sale',
    price: 4500000,
    size_sqft: 980,
    bhk: '2 BHK',
    bedrooms: 2,
    bathrooms: 2,
    location: 'Sarojini Nagar',
    address: 'Tower C, Paarth Republic, Kanpur Road, Sarojini Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226008',
    status: 'available',
    description: 'Budget-friendly 2 BHK apartment inside mega integrated township. Close to Transport Nagar Metro Station and Airport.',
    owner_name: 'Rohit Agrawal',
    owner_phone: '+91 99190 90123',
    amenities: ['Metro Connectivity', 'School Inside Campus', 'Shopping Complex', 'Parks & Play Areas', '24x7 Security'],
    view_360_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-9-living.jpg', room: 'Living Room', caption: 'Well-Lit Hall with Modern Lighting' },
      { url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-9-bed.jpg', room: 'Bedroom', caption: 'Comfortable Bedroom with Garden View' }
    ],
    videos: []
  },
  {
    title: 'Hazratganj Prime Retail Showroom',
    property_code: 'DK-COMM-1010',
    property_type: 'commercial',
    listing_type: 'sale',
    price: 32000000,
    size_sqft: 1800,
    bhk: 'Commercial Retail',
    bedrooms: 0,
    bathrooms: 1,
    location: 'Hazratganj',
    address: 'Shop 12, Ground Floor, Mahatma Gandhi Marg, Hazratganj',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226001',
    status: 'available',
    description: 'High footfall ground floor commercial showroom located in Lucknow heritage retail corridor. Ideal for fashion brands, jewellery showrooms, or bank branches.',
    owner_name: 'Verma Brothers Jewellers',
    owner_phone: '+91 94150 01234',
    amenities: ['Ground Floor Prime Location', 'Heritage Arcade Frontage', 'Heavy Footfall', 'High Ceiling', 'Direct Main Road Access'],
    view_360_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-10-shop.jpg', room: 'Showroom', caption: 'Ground Floor Glass-Fronted Showroom' },
      { url: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-10-street.jpg', room: 'Exterior', caption: 'High-Footfall Hazratganj Promenade' }
    ],
    videos: []
  },
  {
    title: 'Gomti Nagar Sector 4 Independent Duplex',
    property_code: 'DK-HOUS-1011',
    property_type: 'resale',
    listing_type: 'sale',
    price: 16500000,
    size_sqft: 2200,
    bhk: '3 BHK',
    bedrooms: 3,
    bathrooms: 3,
    location: 'Gomti Nagar',
    address: 'House 4/128, Sector 4, Vikas Khand, Gomti Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    status: 'available',
    description: 'Beautifully built 3 BHK independent duplex house on 2150 sqft land. Features teakwood woodwork, portico parking for 2 SUVs, and a spacious terrace garden.',
    owner_name: 'Er. Satish Verma',
    owner_phone: '+91 98380 12340',
    amenities: ['Independent House', 'Double SUV Parking', 'Terrace Garden', 'LDA Approved', 'Submersible Pump', 'Teakwood Doors'],
    view_360_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-11-ext.jpg', room: 'Exterior', caption: 'Independent House Front Elevation & Portico' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-11-living.jpg', room: 'Living Room', caption: 'L-Shaped Drawing & Dining Room' },
      { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-11-terrace.jpg', room: 'Balcony', caption: 'Open Rooftop Terrace Garden' }
    ],
    videos: []
  },
  {
    title: 'MI Rustle Court 3 BHK Lake-Facing Flat',
    property_code: 'DK-FLAT-1012',
    property_type: 'rental',
    listing_type: 'rent',
    price: 38000,
    size_sqft: 1850,
    bhk: '3 BHK',
    bedrooms: 3,
    bathrooms: 3,
    location: 'Amar Shaheed Path',
    address: 'Tower 2, Flat 1104, MI Rustle Court, Shaheed Path',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226002',
    status: 'available',
    description: 'Fully furnished 3 BHK lake-facing apartment for rent. Comes with complete woodwork, 4 ACs, double door refrigerator, smart TV, and modular kitchen.',
    owner_name: 'Priyanka Chopra Kapoor',
    owner_phone: '+91 97110 23456',
    amenities: ['Lake Facing', 'Fully Furnished', 'All Appliances Included', 'Tennis Court', 'Clubhouse & Pool', '24x7 Security'],
    view_360_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80',
    video_url: null,
    mediaItems: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-12-living.jpg', room: 'Living Room', caption: 'Furnished Living Room with Lake View Balcony' },
      { url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-12-bed.jpg', room: 'Bedroom', caption: 'Furnished Bedroom with King Size Bed & AC' },
      { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1000&auto=format&fit=crop&q=80', fileName: 'prop-12-kitchen.jpg', room: 'Kitchen', caption: 'Modular Kitchen with Double Door Fridge' }
    ],
    videos: []
  }
];

async function seed() {
  console.log('Seeding 12 properties with multiple room mockups and videos...');

  // Get admin employee ID
  const empRes = await pool.query(`
    SELECT e.id FROM public.employees e 
    JOIN public.profiles p ON e.user_id = p.id 
    WHERE p.role IN ('super_admin', 'admin') 
    LIMIT 1
  `);
  const assignedAgentId = empRes.rows[0]?.id || null;

  for (const p of PROPERTIES_DATA) {
    console.log(`\nProcessing: ${p.property_code} - ${p.title}`);

    // Download/create all media mockup images
    const photosList = [];
    for (const item of p.mediaItems) {
      const destPath = path.join(PHOTOS_DIR, item.fileName);
      console.log(`  Downloading/Checking room photo: ${item.fileName} (${item.room})`);
      await downloadFile(item.url, destPath);
      const localUrl = `/uploads/property-photos/${item.fileName}`;
      photosList.push({
        url: localUrl,
        room: item.room,
        caption: item.caption,
      });
    }

    const photosJson = JSON.stringify(photosList);
    const videosJson = JSON.stringify(p.videos || []);
    const amenitiesJson = JSON.stringify(p.amenities || []);

    // Check if property exists by property_code
    const existing = await pool.query('SELECT id FROM public.properties WHERE property_code = $1', [p.property_code]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE public.properties SET
          title = $1,
          description = $2,
          property_type = $3,
          listing_type = $4,
          price = $5,
          size_sqft = $6,
          bhk = $7,
          bedrooms = $8,
          bathrooms = $9,
          location = $10,
          address = $11,
          city = $12,
          state = $13,
          pincode = $14,
          status = $15,
          photos = $16,
          videos = $17,
          video_url = $18,
          view_360_url = $19,
          owner_name = $20,
          owner_phone = $21,
          amenities = $22,
          assigned_agent_id = $23,
          updated_at = now()
        WHERE property_code = $24`,
        [
          p.title,
          p.description,
          p.property_type,
          p.listing_type,
          p.price,
          p.size_sqft,
          p.bhk,
          p.bedrooms,
          p.bathrooms,
          p.location,
          p.address,
          p.city,
          p.state,
          p.pincode,
          p.status,
          photosJson,
          videosJson,
          p.video_url,
          p.view_360_url,
          p.owner_name,
          p.owner_phone,
          amenitiesJson,
          assignedAgentId,
          p.property_code,
        ]
      );
      console.log(`✓ Updated property: ${p.property_code}`);
    } else {
      await pool.query(
        `INSERT INTO public.properties (
          property_code,
          title,
          description,
          property_type,
          listing_type,
          price,
          size_sqft,
          bhk,
          bedrooms,
          bathrooms,
          location,
          address,
          city,
          state,
          pincode,
          status,
          photos,
          videos,
          video_url,
          view_360_url,
          owner_name,
          owner_phone,
          amenities,
          assigned_agent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          p.property_code,
          p.title,
          p.description,
          p.property_type,
          p.listing_type,
          p.price,
          p.size_sqft,
          p.bhk,
          p.bedrooms,
          p.bathrooms,
          p.location,
          p.address,
          p.city,
          p.state,
          p.pincode,
          p.status,
          photosJson,
          videosJson,
          p.video_url,
          p.view_360_url,
          p.owner_name,
          p.owner_phone,
          amenitiesJson,
          assignedAgentId,
        ]
      );
      console.log(`✓ Inserted property: ${p.property_code}`);
    }
  }

  const countRes = await pool.query('SELECT COUNT(*)::text as count FROM public.properties');
  console.log('\n======================================================');
  console.log(`Total properties in database: ${countRes.rows[0].count}`);
  console.log('Each property has multiple room mockups and local photos!');
  console.log('======================================================');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed properties failed:', err);
  process.exit(1);
});
