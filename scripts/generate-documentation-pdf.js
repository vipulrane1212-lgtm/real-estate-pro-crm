// Generator script for Diksha Real Estate CRM Complete Documentation
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Diksha Real Estate CRM — Complete System Manual & User Documentation</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page);
        font-size: 9pt;
        color: #64748b;
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    
    .cover-page {
      height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 3px solid #0f172a;
      border-radius: 8px;
      padding: 40px 36px;
      page-break-after: always;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }
    
    .cover-header {
      border-bottom: 2px solid #d97706;
      padding-bottom: 24px;
    }
    
    .cover-brand {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0;
    }
    
    .cover-tagline {
      font-size: 13pt;
      font-weight: 600;
      color: #d97706;
      margin: 6px 0 0 0;
    }
    
    .cover-body {
      margin: 60px 0;
    }
    
    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    
    .cover-desc {
      font-size: 12pt;
      color: #475569;
      line-height: 1.6;
      max-width: 650px;
    }
    
    .cover-meta {
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      color: #64748b;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 20px;
      margin-bottom: 8px;
      border-left: 4px solid #d97706;
      padding-left: 10px;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    
    p {
      margin: 0 0 10px 0;
      color: #334155;
    }
    
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 22px;
      color: #334155;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 18px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #0f172a;
    }
    
    td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #1e293b;
    }
    
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .badge-req {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
    
    .badge-opt {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    
    .badge-gold {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    
    .badge-navy {
      background: #0f172a;
      color: #ffffff;
    }
    
    .box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 12px 14px;
      margin: 12px 0;
    }
    
    .box-info {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
    }
    
    .box-warning {
      border-left: 4px solid #d97706;
      background: #fffbeb;
    }
    
    .box-success {
      border-left: 4px solid #16a34a;
      background: #f0fdf4;
    }
    
    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding: 6px 0;
      font-size: 9.5pt;
      color: #0f172a;
    }
    
    .toc-item span:first-child {
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-brand">DIKSHA REAL ESTATE</div>
      <div class="cover-tagline">Real Estate CRM & Agency Operations System</div>
    </div>
    
    <div class="cover-body">
      <div class="cover-title">Complete User Guide & System Documentation</div>
      <div class="cover-desc">
        A comprehensive, plain-English reference manual covering every module, screen, action, filter, and input form of the Diksha Real Estate CRM. Written for Super Admins, Branch Managers, and Sales Executives without technical jargon.
      </div>
      
      <div style="margin-top: 30px;">
        <span class="badge badge-navy" style="font-size: 9pt; padding: 5px 12px;">Local-First Architecture</span>
        <span class="badge badge-gold" style="font-size: 9pt; padding: 5px 12px; margin-left: 6px;">PostgreSQL 16 & Next.js</span>
        <span class="badge badge-req" style="font-size: 9pt; padding: 5px 12px; margin-left: 6px;">Strict RLS Security</span>
      </div>
    </div>
    
    <div class="cover-meta">
      <div>
        <strong>System Version:</strong> Production Release (Phases 1–7 Active)<br>
        <strong>Access URL:</strong> http://localhost:3000<br>
        <strong>Headquarters:</strong> Vibhuti Khand, Gomti Nagar, Lucknow, UP
      </div>
      <div style="text-align: right;">
        <strong>Authorized User:</strong> Diksha Super Admin<br>
        <strong>Publication Date:</strong> November 20, 2026<br>
        <strong>Confidentiality:</strong> Internal Agency Operations Manual
      </div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div>
    <h1>Table of Contents</h1>
    <div class="toc-item"><span>1. System Architecture & Core Concept</span><span>Section 1</span></div>
    <div class="toc-item"><span>2. User Roles & Access Boundaries (Super Admin, Admin, Employee)</span><span>Section 2</span></div>
    <div class="toc-item"><span>3. Demo Data System & Safety Switch</span><span>Section 3</span></div>
    <div class="toc-item"><span>4. Inflow Channels (Meta, Housing, WhatsApp, Google, Instagram, Website)</span><span>Section 4</span></div>
    <div class="toc-item"><span>5. Loud Follow-up Alarms & Voice Alerts System</span><span>Section 5</span></div>
    <div class="toc-item"><span>6. Operations Dashboard</span><span>Section 6</span></div>
    <div class="toc-item"><span>7. Unified Lead Inbox (Kanban & List Table Views)</span><span>Section 7</span></div>
    <div class="toc-item"><span>8. Property Inventory & Room Explorer Gallery</span><span>Section 8</span></div>
    <div class="toc-item"><span>9. Rentals & Tenancy Management</span><span>Section 9</span></div>
    <div class="toc-item"><span>10. Client-Added Projects & Review Queue</span><span>Section 10</span></div>
    <div class="toc-item"><span>11. Employee Management & Daily Performance Telemetry</span><span>Section 11</span></div>
    <div class="toc-item"><span>12. Attendance Terminal (Live Selfie + GPS Geolocation)</span><span>Section 12</span></div>
    <div class="toc-item"><span>13. Document Repository & KYC Compliance</span><span>Section 13</span></div>
    <div class="toc-item"><span>14. Office Expenses & 30-Day Daily Spend Ledger</span><span>Section 14</span></div>
    <div class="toc-item"><span>15. Deals & Brokerage Accounting</span><span>Section 15</span></div>
    <div class="toc-item"><span>16. Telephony & Click-to-Call Logs</span><span>Section 16</span></div>
    <div class="toc-item"><span>17. WhatsApp Direct Hub</span><span>Section 17</span></div>
    <div class="toc-item"><span>18. Analytics & Business Intelligence Reports</span><span>Section 18</span></div>
    <div class="toc-item"><span>19. Lead Channel Integrations (Webhook Endpoints & Security)</span><span>Section 19</span></div>
    <div class="toc-item"><span>20. Company Profile & System Settings</span><span>Section 20</span></div>
  </div>

  <!-- SECTION 1 & 2 -->
  <div class="page-break">
    <h1>1. System Architecture & Core Concept</h1>
    <p>
      <strong>Diksha Real Estate CRM</strong> is a local-first enterprise management portal built specifically for Indian real estate agencies, property brokerages, and developer marketing firms. Unlike generic cloud tools, the entire application, database, file storage, and phone/message logs run on the agency's local infrastructure.
    </p>
    <div class="box box-info">
      <strong>Core Architectural Pillars:</strong>
      <ul>
        <li><strong>Local-First Database:</strong> Direct PostgreSQL 16 database (port 5432) on the local host with strict Row Level Security (RLS) on every table.</li>
        <li><strong>Local Media Storage:</strong> All property photos, room mockups, inspection videos, selfie punches, receipts, and KYC documents are saved on the local disk (inside <code>public/uploads/</code>), avoiding third-party cloud hosting fees or privacy leaks.</li>
        <li><strong>Direct WhatsApp & Click-to-Call:</strong> Client interactions trigger direct <code>wa.me</code> browser conversations with pre-filled message templates and instant telephone links without requiring paid telephony PBX gateways.</li>
      </ul>
    </div>

    <h1>2. User Roles & Access Boundaries</h1>
    <p>The system enforces three distinct user roles with strict database isolation:</p>

    <table>
      <thead>
        <tr>
          <th style="width: 18%;">Role</th>
          <th style="width: 42%;">What They CAN Do</th>
          <th style="width: 40%;">What They CANNOT Do</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Super Admin</strong></td>
          <td>
            • Full access across every module, record, lead, and financial report.<br>
            • Add, edit, or deactivate any employee or administrator.<br>
            • Configure granular module permissions (View, Create, Edit, Delete).<br>
            • Delete records, approve client projects, and manage company profile.<br>
            • Access commission ledgers, audit logs, and system settings.
          </td>
          <td>
            • None. Super Admin has unrestricted governance authority.
          </td>
        </tr>
        <tr>
          <td><strong>Admin</strong></td>
          <td>
            • Manage all leads, inventory properties, rentals, and expenses.<br>
            • Assign leads and properties to employees.<br>
            • View agency-wide analytics, daily reports, and team leaderboards.<br>
            • Close deals and record brokerage commissions.<br>
            • Review attendance logs and uploaded customer KYC files.
          </td>
          <td>
            • Cannot deactivate or alter Super Admin accounts.<br>
            • Cannot disable database security or change core system architecture.<br>
            • Cannot delete audit logs.
          </td>
        </tr>
        <tr>
          <td><strong>Employee</strong></td>
          <td>
            • View and manage ONLY leads and properties assigned directly to them.<br>
            • Update lead status, schedule site visits, and record follow-ups.<br>
            • Log call notes and dispatch WhatsApp templates.<br>
            • Punch attendance using live camera selfie and GPS location.<br>
            • Upload client documents and request expense reimbursements.
          </td>
          <td>
            • Cannot view other employees' leads or client contact numbers.<br>
            • Cannot view company financial margins or total brokerage ledger.<br>
            • Cannot delete leads, properties, or transactions.<br>
            • Cannot access employee management or system settings.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 3, 4, 5 -->
  <div class="page-break">
    <h1>3. Demo Data System & Safety Switch</h1>
    <p>
      The CRM includes an isolated Demo Data Engine designed for testing, training new agents, and demonstrating features to stakeholders without contaminating actual company records.
    </p>
    <ul>
      <li><strong>100 Pre-Loaded Leads:</strong> Exactly 100 leads across Lucknow localities (Gomti Nagar, Sushant Golf City, Hazratganj, Shaheed Path, Vibhuti Khand, Aliganj) with standard phone numbers in the <code>90000 00001 – 90000 00100</code> range.</li>
      <li><strong>Visible DEMO Badge:</strong> Every demo lead displays a bright orange <code>DEMO</code> badge on its Kanban card, table row, and details drawer.</li>
      <li><strong>Show Demo Data Switch:</strong> Located in the top header of the Dashboard and Leads inbox. When turned OFF, all demo leads are automatically filtered out from counts, conversion charts, and reports. When turned ON, demo leads are included for demonstration.</li>
      <li><strong>Reset Demo Data Button:</strong> One-click safety reset that deletes <em>only</em> rows where <code>is_demo = true</code>. It will NEVER touch, edit, or delete a real customer lead.</li>
      <li><strong>Re-seed 100 Demo Button:</strong> Restores the complete set of 100 demo leads across all stages and sources in 1 second.</li>
    </ul>

    <h1>4. Inflow Channels & Source Tracking</h1>
    <p>Every lead in the CRM has a mandatory <strong>Inflow Source</strong> and optional <strong>Source Detail</strong> tag. This ensures that the agency knows exactly where every inquiry originated:</p>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Channel</th>
          <th style="width: 35%;">How Inquiries Arrive</th>
          <th style="width: 45%;">Example Source Detail</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Meta Ads</strong></td>
          <td>Facebook & Instagram Lead Generation Forms via webhook.</td>
          <td>Campaign: <em>"Omaxe_Diwali_3BHK_Offer"</em>, Form: <em>"Instant_Quote_V2"</em></td>
        </tr>
        <tr>
          <td><strong>Housing.com</strong></td>
          <td>Builder & Broker Lead API direct webhook sync.</td>
          <td>Project: <em>"Rishita Manhattan"</em>, City: <em>"Lucknow"</em></td>
        </tr>
        <tr>
          <td><strong>Google Ads</strong></td>
          <td>Google Search & Performance Max Lead Form Extensions.</td>
          <td>Keyword: <em>"luxury flats gomti nagar"</em>, AdGroup: <em>"Search_3BHK"</em></td>
        </tr>
        <tr>
          <td><strong>WhatsApp</strong></td>
          <td>Direct incoming messages on official business helpline.</td>
          <td>Keyword: <em>"Interested in Villa brochure"</em></td>
        </tr>
        <tr>
          <td><strong>Instagram</strong></td>
          <td>Direct messages and story ad click-throughs.</td>
          <td>Reel: <em>"Penthouse Tour Ekana"</em></td>
        </tr>
        <tr>
          <td><strong>Website</strong></td>
          <td>Agency website contact, inquiry, and property schedule forms.</td>
          <td>URL: <em>"https://diksharealestate.com/properties/omaxe-waterscapes"</em></td>
        </tr>
        <tr>
          <td><strong>Manual Entry</strong></td>
          <td>Walk-ins, reference calls, and direct office inquiries.</td>
          <td>Entered by: <em>"Walk-in client introduced by Col. Mehrotra"</em></td>
        </tr>
        <tr>
          <td><strong>CSV Import</strong></td>
          <td>Bulk imported lists from property expos or developer databases.</td>
          <td>File: <em>"Lucknow_Property_Expo_Nov2026.csv"</em></td>
        </tr>
      </tbody>
    </table>

    <h1>5. Loud Follow-up Alarms & Voice Alerts</h1>
    <p>
      To prevent missed sales callbacks and overdue lease renewals, the CRM features a background audio reminder engine:
    </p>
    <ul>
      <li><strong>High-Pitch Alarm:</strong> Plays an audible synth chime directly in the browser when a scheduled follow-up becomes due.</li>
      <li><strong>Spoken Voice Alerts:</strong> The browser reads aloud the client name and task: <em>"Attention: Follow-up call with Ramesh Nigam is due now."</em></li>
      <li><strong>Agreement Expiry Voice Alerts:</strong> For documents and rental agreements ending in the next 30 days, the voice alert sounds: <em>"Warning: Rental agreement for Flat 1104 is expiring in 25 days."</em></li>
      <li><strong>Alarm Actions:</strong>
        <ul>
          <li><strong>Complete:</strong> Opens the outcome window, records call discussion notes, and silences the alarm.</li>
          <li><strong>Snooze:</strong> Postpones the alarm by 15 minutes, 1 hour, or 24 hours.</li>
          <li><strong>Acknowledge:</strong> Stops the sound immediately while leaving the item highlighted in red as pending.</li>
        </ul>
      </li>
    </ul>
  </div>

  <!-- SECTION 6: DASHBOARD -->
  <div class="page-break">
    <h1>6. Operations Dashboard</h1>
    <p>The centralized mission control screen for agency leadership and executives.</p>

    <h2>What You Can SEE</h2>
    <ul>
      <li><strong>Executive Welcome Banner:</strong> User full name, active phase status badge, and role identifier.</li>
      <li><strong>6 Real-Count KPI Cards:</strong>
        <ol>
          <li><em>Total Leads:</em> All inquiries registered in the CRM.</li>
          <li><em>New Leads:</em> Fresh inquiries requiring initial contact.</li>
          <li><em>Pending Follow-ups:</em> Scheduled callbacks and customer tasks due.</li>
          <li><em>Site Visits Today:</em> Property inspections confirmed for today.</li>
          <li><em>Closed Deals:</em> Finalized sales transactions.</li>
          <li><em>Available Properties:</em> Active residential and commercial listings.</li>
        </ol>
      </li>
      <li><strong>30-Day Daily Expenses Chart:</strong> Bar chart showing daily operational spending (tea, petrol, travel, bills) for the past 30 days with today's spend and month total highlighted.</li>
      <li><strong>Agreements & Renewals Expiring Soon:</strong> Registry of leases, agreements, and civic certificates reaching expiry within the next 30 days (ordered nearest first).</li>
      <li><strong>Leads by Inflow Source Breakdown:</strong> Graphical distribution showing percentage and exact lead count for Meta, Housing, WhatsApp, Google, Instagram, Website, and Manual entries.</li>
      <li><strong>Recent Activity Audit Stream:</strong> Timestamped log of actions taken across the CRM.</li>
    </ul>

    <h2>What You Can DO</h2>
    <ul>
      <li><strong>Toggle "Show Demo Data":</strong> Switch on or off to include or hide the 100 demo leads from all cards and charts.</li>
      <li><strong>Refresh Counts:</strong> Instantly fetch fresh database counts without reloading the whole browser.</li>
      <li><strong>Click "View" on any KPI card:</strong> Jumps directly to the filtered section (Leads, Follow-ups, Site Visits, Properties, Brokerage).</li>
      <li><strong>Interactive 30-Day Expense Bars:</strong> Click any day's bar to inspect that specific day's expense items below the chart.</li>
      <li><strong>Click Inflow Source Links:</strong> Filter the Leads inbox by that specific channel (e.g. clicking <em>"Meta Ads (30)"</em> opens the inbox showing only Meta leads).</li>
    </ul>
  </div>

  <!-- SECTION 7: LEADS INBOX -->
  <div class="page-break">
    <h1>7. Unified Lead Inbox</h1>
    <p>The single inbox for all customer inquiries across all marketing channels.</p>

    <h2>What You Can SEE</h2>
    <ul>
      <li><strong>Kanban Pipeline Board:</strong> 5 columns representing stages:
        <ol>
          <li><em>New (Requires Attention):</em> Fresh untouched leads.</li>
          <li><em>Contacted:</em> Initial phone call or WhatsApp dispatched.</li>
          <li><em>Follow-Up:</em> Active prospect discussing options or awaiting callbacks.</li>
          <li><em>Site Visit:</em> Scheduled or completed physical property visits.</li>
          <li><em>Negotiation:</em> Offer submitted, pricing discussions in progress.</li>
        </ol>
      </li>
      <li><strong>Lead Cards:</strong> Client name, DEMO badge (if demo), Inflow Source pill, Lead Type (Buy/Sell/Rent/Commercial), Budget range, Preferred locality, Phone number, and Assigned agent name or assignment dropdown.</li>
      <li><strong>List Table View:</strong> Compact multi-row tabular view with multi-select checkboxes for bulk agent reassignment.</li>
      <li><strong>Inflow Filter Ribbon:</strong> Buttons for Meta Ads, Housing, WhatsApp, Google, Instagram, Website, Manual, CSV, and Unassigned.</li>
      <li><strong>Team Workload Pills:</strong> Shows count of leads currently assigned to each employee (e.g. Unassigned: 40, Super Admin: 29, Rohan: 31).</li>
    </ul>

    <h2>What You Can DO</h2>
    <ul>
      <li><strong>Switch View Modes:</strong> Toggle between Kanban Board view and List Table view with one click.</li>
      <li><strong>Drag or Scroll Kanban Stages:</strong> Use the left and right navigation buttons to pan across all pipeline stages.</li>
      <li><strong>Search Leads:</strong> Instant search by name, mobile number, locality, or requirement.</li>
      <li><strong>Filter by Type & Stage:</strong> Select Buy, Sell, Rent, or Commercial; filter by specific pipeline stage.</li>
      <li><strong>Quick Assign Agent:</strong> Click <em>"+ Assign Agent"</em> on any card to assign an employee directly without opening details.</li>
      <li><strong>Bulk Select & Assign (List View):</strong> Tick multiple checkboxes to reveal the floating action bar; assign 20+ leads to an agent at once.</li>
      <li><strong>Open Lead Drawer:</strong> Click any card or row to open the complete customer dossier, timeline, matched properties, and documents.</li>
      <li><strong>Import & Export CSV:</strong> Download all leads to Excel/CSV or upload bulk external CSV lists.</li>
      <li><strong>Reset / Re-seed Demo Data:</strong> Safety buttons to purge or reload the 100 demo records.</li>
    </ul>

    <h2>Form: Add / Edit Lead</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Full Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Client's full name (e.g. <em>Dr. Alok Srivastava</em>).</td>
        </tr>
        <tr>
          <td><strong>Primary Mobile Phone</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>10-digit mobile number. Real-time duplicate phone checking warns if already in CRM.</td>
        </tr>
        <tr>
          <td><strong>Alternate / WhatsApp Phone</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Secondary contact or WhatsApp number.</td>
        </tr>
        <tr>
          <td><strong>Email Address</strong></td>
          <td>Email</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Client email address for quotations and formal contracts.</td>
        </tr>
        <tr>
          <td><strong>Lead Type</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pick intent: <strong>Buy</strong>, <strong>Sell</strong>, <strong>Rent</strong>, or <strong>Commercial</strong>.</td>
        </tr>
        <tr>
          <td><strong>Pipeline Stage</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Initial stage (defaults to <strong>New</strong>).</td>
        </tr>
        <tr>
          <td><strong>Inflow Source</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Where lead came from: Meta Ads, Housing.com, Google, WhatsApp, Instagram, Website, Manual, CSV, Other.</td>
        </tr>
        <tr>
          <td><strong>Source Detail</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Specific campaign name, ad form name, or reference person.</td>
        </tr>
        <tr>
          <td><strong>Preferred Locality / Area</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Target sector or neighborhood (e.g. <em>Gomti Nagar Extension</em>).</td>
        </tr>
        <tr>
          <td><strong>Property Requirement</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Brief property specifications (e.g. <em>3 BHK Park Facing, High Floor</em>).</td>
        </tr>
        <tr>
          <td><strong>Minimum Budget (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Lower price boundary in rupees (e.g. <em>8000000</em>).</td>
        </tr>
        <tr>
          <td><strong>Maximum Budget (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upper price limit in rupees (e.g. <em>11000000</em>).</td>
        </tr>
        <tr>
          <td><strong>Assign to Agent</strong></td>
          <td>Select</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Pick executive responsible for following up (Admin/Super Admin only).</td>
        </tr>
        <tr>
          <td><strong>Internal Notes / Remarks</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Background notes, client timeline, or financing status.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 8: PROPERTIES -->
  <div class="page-break">
    <h1>8. Property Inventory & Room Explorer</h1>
    <p>Complete property catalog with multi-room photo tagging, video walkthroughs, and 360° virtual tours.</p>

    <h2>What You Can SEE</h2>
    <ul>
      <li><strong>Property Cards (Grid View):</strong> Cover photo, property title, formatted price (e.g. <em>₹95.00 Lakh</em>, <em>₹2.40 Cr</em>), BHK badge, property category (Resale, New Project, Commercial, Rental, Plot), locality, description snippet, agent assigned.</li>
      <li><strong>Media Count Badges:</strong> Photo count badge (e.g. <code>📷 5 Photos</code>), video badge (e.g. <code>🎥 1 Video</code>), and <code>🧭 360° Tour</code> button.</li>
      <li><strong>Room Tags Snippet:</strong> Tags on each card showing rooms photographed (e.g. <em>[Living Room] [Master Bedroom] [Kitchen] [Balcony]</em>).</li>
      <li><strong>Table View:</strong> Compact row view with thumbnail, BHK/size, price, status badge, owner contact info, and quick action icons.</li>
      <li><strong>Interactive Room Explorer Modal:</strong>
        <ul>
          <li><em>Room Filter Tabs:</em> "All Media", "Living Room", "Bedrooms", "Kitchen", "Balcony", "Videos", "360° Tour".</li>
          <li><em>Main Stage:</em> High-resolution viewer with Room Tag badge and caption overlay. Supports HTML5 video player with playback controls and 360° panorama tour.</li>
          <li><em>Thumbnail Strip:</em> Scrollable ribbon of all rooms with room label pills over each thumbnail.</li>
          <li><em>Keyboard Arrows:</em> Left/Right arrow keys navigate from room to room smoothly.</li>
        </ul>
      </li>
    </ul>

    <h2>What You Can DO</h2>
    <ul>
      <li><strong>Search & Filter:</strong> Search by title, code, BHK, or locality; filter by category (Resale, New Project, Rental, Commercial, Plot) and status (Available, Hold, Sold, Rented).</li>
      <li><strong>View Room Gallery:</strong> Click any property card image to launch the Room Explorer.</li>
      <li><strong>Launch 360° Tour:</strong> Click the 360° Tour button for interactive virtual walkthrough.</li>
      <li><strong>Upload Property Documents:</strong> Click the document icon to link Index 2, OC, CC, or RERA certificates directly to the property.</li>
      <li><strong>Edit / Delete:</strong> Update specs or delete outdated listings (admin only).</li>
    </ul>

    <h2>Form: Add / Edit Property</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Property Title</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Marketing headline (e.g. <em>Omaxe Waterscapes 3 BHK Luxury Flat</em>).</td>
        </tr>
        <tr>
          <td><strong>Property Category</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Category: <strong>New Project</strong>, <strong>Resale</strong>, <strong>Rental</strong>, <strong>Commercial</strong>, or <strong>Plot / Land</strong>.</td>
        </tr>
        <tr>
          <td><strong>Listing Intent</strong></td>
          <td>Select</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td><strong>For Sale</strong>, <strong>For Rent</strong>, or <strong>Commercial Lease</strong>.</td>
        </tr>
        <tr>
          <td><strong>Current Status</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td><strong>Available</strong>, <strong>Hold</strong>, <strong>Sold</strong>, or <strong>Rented</strong>.</td>
        </tr>
        <tr>
          <td><strong>Expected Price / Rent (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Total asking price or monthly rental amount (e.g. <em>9500000</em>).</td>
        </tr>
        <tr>
          <td><strong>BHK Configuration</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>e.g. <em>2 BHK</em>, <em>3 BHK</em>, <em>4 BHK Penthouse</em>, <em>Office Suite</em>.</td>
        </tr>
        <tr>
          <td><strong>Super Area (Sq.Ft)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Total built-up/super area in square feet (e.g. <em>1750</em>).</td>
        </tr>
        <tr>
          <td><strong>Bedrooms / Bathrooms</strong></td>
          <td>Number</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Number of bedrooms and washrooms.</td>
        </tr>
        <tr>
          <td><strong>Locality / Sector</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Neighborhood name (e.g. <em>Gomti Nagar Extension</em>).</td>
        </tr>
        <tr>
          <td><strong>City & Pincode</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>City name (e.g. <em>Lucknow</em>) and postal code (e.g. <em>226010</em>).</td>
        </tr>
        <tr>
          <td><strong>Full Address</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Complete street address, tower number, and sector.</td>
        </tr>
        <tr>
          <td><strong>Owner / Seller Name & Phone</strong></td>
          <td>Text/Tel</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Landlord or seller contact info (hidden from general public).</td>
        </tr>
        <tr>
          <td><strong>Assigned Agent</strong></td>
          <td>Select</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Staff member managing inquiries for this property.</td>
        </tr>
        <tr>
          <td><strong>Multiple Room Photos</strong></td>
          <td>File / URL</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upload multiple images at once. Tag each with a room (Living Room, Bedroom, Kitchen, Balcony, etc.), caption, and set primary cover.</td>
        </tr>
        <tr>
          <td><strong>Property Walkthrough Videos</strong></td>
          <td>File / URL</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upload local <code>.mp4</code> video files or attach YouTube / Vimeo walkthrough links with area tags.</td>
        </tr>
        <tr>
          <td><strong>360° Panorama Tour URL</strong></td>
          <td>URL</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Link to an equirectangular panorama image for interactive 360° virtual touring.</td>
        </tr>
        <tr>
          <td><strong>Key Amenities</strong></td>
          <td>Checkboxes</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Select: Covered Parking, Lift, 24x7 Security, Clubhouse, Pool, Gym, Power Backup, Gated Community, Gas, etc.</td>
        </tr>
        <tr>
          <td><strong>Detailed Description</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Full marketing description highlighting features, vastu compliance, views, and furnishings.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 9: RENTALS -->
  <div class="page-break">
    <h1>9. Rentals & Tenancy Management</h1>
    <p>Lease agreement tracking, monthly rent collection, 11-month expiry alerts, and tenant management.</p>

    <h2>What You Can SEE</h2>
    <ul>
      <li><strong>Rental KPI Cards:</strong>
        <ol>
          <li><em>Active Rentals:</em> Total properties currently leased out.</li>
          <li><em>Expected Rent:</em> Total gross rent due this current month.</li>
          <li><em>Collected Rent:</em> Total rent collected so far this month.</li>
          <li><em>Pending Collections:</em> Count of tenants whose rent is unpaid or overdue.</li>
        </ol>
      </li>
      <li><strong>Lease Status Filter Tabs:</strong> All, Active, Pending Booking, Notice Period, Completed, Terminated.</li>
      <li><strong>Rental Agreements Registry:</strong> Table showing Property title, Tenant name & contact, Monthly Rent, Security Deposit, Rent Due Day, Agreement Start & End Dates, Rent Collection status for current month (Paid / Pending / Overdue), and Action buttons.</li>
    </ul>

    <h2>What You Can DO</h2>
    <ul>
      <li><strong>Register New Lease:</strong> Click <em>"New Rental Agreement"</em> to record a tenant contract.</li>
      <li><strong>Record Monthly Rent Payment:</strong> Click the rupee icon on any tenant row to log this month's rent payment with payment mode and receipt reference.</li>
      <li><strong>30-Day Expiry Voice Reminders:</strong> Any rental ending within 30 days triggers the voice alert: <em>"Rental agreement expiring soon"</em> and surfaces in the dashboard expiry widget.</li>
      <li><strong>Terminate or Renew:</strong> Update agreement dates or mark completed when tenancy concludes.</li>
    </ul>

    <h2>Form: New Rental Agreement</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Select Property</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Choose property from inventory. Auto-fills landlord details and suggested rent.</td>
        </tr>
        <tr>
          <td><strong>Tenant Full Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Tenant legal name (e.g. <em>Priyanka Chopra Kapoor</em>).</td>
        </tr>
        <tr>
          <td><strong>Tenant Mobile Phone</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>10-digit mobile number for rent reminders and calls.</td>
        </tr>
        <tr>
          <td><strong>Tenant Email Address</strong></td>
          <td>Email</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Email for digital rent receipts.</td>
        </tr>
        <tr>
          <td><strong>Landlord / Owner Name & Phone</strong></td>
          <td>Text/Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Property owner details (auto-populated from property record).</td>
        </tr>
        <tr>
          <td><strong>Monthly Rent (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Agreed monthly rent amount (e.g. <em>38000</em>).</td>
        </tr>
        <tr>
          <td><strong>Security Deposit (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Refundable security deposit held (e.g. <em>76000</em>).</td>
        </tr>
        <tr>
          <td><strong>Rent Due Day of Month</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Day of month rent is due (1 to 31, default: <em>1st</em>).</td>
        </tr>
        <tr>
          <td><strong>Agreement Start Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Lease commencement date.</td>
        </tr>
        <tr>
          <td><strong>Agreement End Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Auto-calculated to exactly 11 months minus 1 day (standard Indian lease).</td>
        </tr>
        <tr>
          <td><strong>Brokerage Rate (%)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Commission rate (defaults to 2.0% or 1 month rent).</td>
        </tr>
        <tr>
          <td><strong>Advance Booking Amount (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Token advance received to reserve the property.</td>
        </tr>
        <tr>
          <td><strong>Agreement Notes</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Maintenance terms, lock-in period, or pet policies.</td>
        </tr>
      </tbody>
    </table>

    <h2>Form: Record Rent Payment</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Payment Month</strong></td>
          <td>Month</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Billing month (e.g. <em>November 2026</em>).</td>
        </tr>
        <tr>
          <td><strong>Amount Received (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Actual rent amount collected.</td>
        </tr>
        <tr>
          <td><strong>Payment Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Date payment was received (defaults to today).</td>
        </tr>
        <tr>
          <td><strong>Payment Mode</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pick: <strong>UPI / GPay / PhonePe</strong>, <strong>Net Banking (NEFT/RTGS)</strong>, <strong>Cheque</strong>, or <strong>Cash</strong>.</td>
        </tr>
        <tr>
          <td><strong>Transaction Reference Number</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>UPI UTR number, bank transfer reference, or cheque number.</td>
        </tr>
        <tr>
          <td><strong>Payment Remarks</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>e.g. <em>"Includes ₹2,000 society maintenance"</em>.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 10: CLIENT PROJECTS & SECTION 11: EMPLOYEES -->
  <div class="page-break">
    <h1>10. Client-Added Projects & Review Queue</h1>
    <p>Incoming project proposals submitted by builders, developers, or clients for agency verification.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Filter Tabs:</strong> All Submissions, Pending Review, Approved, Rejected.</li>
      <li><strong>Review Queue:</strong> Cards showing Project Name, Type (Apartments, Villas, Commercial, Township), Submitting Client/Builder Name & Phone, Price range, Location, and photos.</li>
      <li><strong>Approve into Active Inventory:</strong> Clicking <em>"Approve"</em> immediately converts the project proposal into a verified listing in the Properties inventory.</li>
      <li><strong>Reject Proposal:</strong> Moves rejected or duplicate proposals out of the review queue with optional reason notes.</li>
    </ul>

    <h2>Form: Submit New Project</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Project Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Official project name (e.g. <em>Paarth Republic</em>).</td>
        </tr>
        <tr>
          <td><strong>Project Type</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Residential Apartment, Luxury Villa, Commercial Office, Retail Shops, Plot, or Township.</td>
        </tr>
        <tr>
          <td><strong>Project Location / City</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Address and locality (e.g. <em>Kanpur Road, Sarojini Nagar, Lucknow</em>).</td>
        </tr>
        <tr>
          <td><strong>Price Range (Min & Max ₹)</strong></td>
          <td>Numbers</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Starting and maximum unit pricing (e.g. <em>4500000</em> to <em>8500000</em>).</td>
        </tr>
        <tr>
          <td><strong>Submitting Client Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Builder, developer, or authorized owner name.</td>
        </tr>
        <tr>
          <td><strong>Contact Mobile Number</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>10-digit phone number for verification calls.</td>
        </tr>
        <tr>
          <td><strong>Contact Email Address</strong></td>
          <td>Email</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Corporate email for correspondence.</td>
        </tr>
        <tr>
          <td><strong>Project Photos (up to 5 URLs)</strong></td>
          <td>URLs</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Brochure cover images or elevation photos.</td>
        </tr>
        <tr>
          <td><strong>Project Description</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Master plan highlights, amenities, and delivery timeline.</td>
        </tr>
      </tbody>
    </table>

    <h1>11. Employee Management & Daily Reports</h1>
    <p>Staff directory, granular module permissions, daily activity telemetry, and agent leaderboards (Admin/Super Admin only).</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Daily Telemetry Banner:</strong> Real-time counts of actions performed across the team <em>today</em>:
        <ol>
          <li><em>Leads Assigned Today</em> (e.g. 60 assigned).</li>
          <li><em>Calls Logged Today</em>.</li>
          <li><em>Visits Done Today</em>.</li>
          <li><em>Follow-ups Completed Today</em>.</li>
        </ol>
      </li>
      <li><strong>Team Roster:</strong> Lists every employee with Name, Email, Mobile, Designation, Joining Date, Role, and Status (Active / Deactivated).</li>
      <li><strong>Daily & Monthly Activity Reports:</strong> Performance breakdown per employee showing calls made, visits completed, follow-ups closed, and deals finalized.</li>
      <li><strong>Agent Leaderboard:</strong> Real-time ranking of sales consultants based on gross deal volume and brokerage revenue generated.</li>
      <li><strong>Configure Granular Permissions:</strong> Click <em>"Configure Modules"</em> to open the permission matrix. Toggle View, Create, Edit, and Delete access independently for all 10 CRM modules.</li>
      <li><strong>Deactivate / Re-activate Employee:</strong> Click <em>"Deactivate"</em> to block login access immediately while preserving all their historical leads, call logs, and customer records.</li>
    </ul>

    <h2>Form: Add Employee</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Full Legal Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Employee's name (e.g. <em>Rohan Sharma</em>).</td>
        </tr>
        <tr>
          <td><strong>Corporate Email</strong></td>
          <td>Email</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Login email address (e.g. <em>rohan@diksharealestate.com</em>).</td>
        </tr>
        <tr>
          <td><strong>Initial Password</strong></td>
          <td>Password</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Login password (minimum 6 characters).</td>
        </tr>
        <tr>
          <td><strong>Mobile Phone Number</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>10-digit mobile number for communication.</td>
        </tr>
        <tr>
          <td><strong>Job Designation</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Title (e.g. <em>Senior Sales Executive</em>, <em>Field Agent</em>).</td>
        </tr>
        <tr>
          <td><strong>Date of Joining</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Employment start date.</td>
        </tr>
        <tr>
          <td><strong>System Role</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pick <strong>Employee</strong> (restricted) or <strong>Admin</strong> (management).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 12: ATTENDANCE & SECTION 13: DOCUMENTS -->
  <div class="page-break">
    <h1>12. Attendance Terminal (Live Selfie + GPS)</h1>
    <p>Field and office attendance verification with live camera selfies and tamper-resistant GPS positioning.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Personal Attendance Terminal:</strong> Shows today's date, Check-in status, Check-out status, duration on duty, verification photos, and GPS address.</li>
      <li><strong>Live Selfie Camera Punch:</strong> Click <em>"Check-In (Live Selfie)"</em> or <em>"Check-Out"</em> to launch the camera punch modal:
        <ul>
          <li>Accesses device camera directly (gallery/file uploads are strictly disabled to prevent uploading old photos).</li>
          <li>Acquires live browser GPS latitude and longitude (punch is rejected if location is blocked).</li>
          <li>Employee clicks <em>"Capture Selfie"</em> and submits.</li>
        </ul>
      </li>
      <li><strong>Monthly Attendance Audit Table (Admin View):</strong> Daily calendar grid showing check-in/out timestamps, photo proofs, and physical GPS addresses for each employee.</li>
    </ul>

    <h1>13. Document Repository & KYC Compliance</h1>
    <p>Centralized document management for client identity, property titles, civic approvals, and sale contracts.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>All Documents Registry:</strong> List of uploaded files with Document Title, Category, File Type (PDF/Image), Linked CRM Record, Uploaded By whom, Upload Date, and Expiry Date.</li>
      <li><strong>Category Filters:</strong> Filter by Aadhaar, PAN, Agreement, Index 2, Occupancy Certificate (OC), Completion Certificate (CC), RERA, or Other.</li>
      <li><strong>"Expiring in 30 Days" Quick Filter:</strong> Filters the view to show only contracts or certificates approaching their expiration date.</li>
      <li><strong>Download & View:</strong> Click any document row to view or download the high-resolution file.</li>
      <li><strong>Audit-Logged Deletion:</strong> Admin-only document deletion; any file removal is recorded in the permanent audit log.</li>
    </ul>

    <h2>Form: Upload Document</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Document Title / Label</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Descriptive name (e.g. <em>Dr. Srivastava Aadhaar Card</em> or <em>Waterscapes OC</em>).</td>
        </tr>
        <tr>
          <td><strong>Document Category</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Aadhaar Card, PAN Card, Agreement / Sale Deed, Index 2 / Title Deed, OC, CC, RERA, Other.</td>
        </tr>
        <tr>
          <td><strong>Select File</strong></td>
          <td>File</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Select PDF, JPG, PNG, or WEBP file from device (stored in <code>public/uploads/documents/</code>).</td>
        </tr>
        <tr>
          <td><strong>Link to CRM Record</strong></td>
          <td>Radio</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Choose association: <strong>Client / Lead</strong>, <strong>Property</strong>, <strong>Closed Deal</strong>, or <strong>General</strong>.</td>
        </tr>
        <tr>
          <td><strong>Record Selector</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Picks the specific lead, property, or deal to link this document to.</td>
        </tr>
        <tr>
          <td><strong>Expiry / Validity Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Expiration date for time-limited certificates or lease agreements (triggers 30-day voice alerts).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 14: EXPENSES & SECTION 15: DEALS -->
  <div class="page-break">
    <h1>14. Office Expenses & 30-Day Spend Ledger</h1>
    <p>Free-form tracking of operational expenses with a 30-day daily spend bar chart and Excel export.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Free-Form Headline Logging:</strong> No fixed dropdown forcing a category. Users can type any headline (e.g. <em>Chai / snacks</em>, <em>Kharcha pani</em>, <em>Petrol for site visit</em>, <em>Office electricity bill</em>, <em>Broadband rent</em>).</li>
      <li><strong>Interactive 30-Day Daily Spend Bar Chart:</strong>
        <ul>
          <li>One vertical bar for each day over the past 30 days. Bar height equals total amount spent on that day.</li>
          <li>Displays Month Total spend and Today's spend above the chart.</li>
          <li>Clicking or tapping any day's bar filters the expense table below to display only receipts from that date.</li>
        </ul>
      </li>
      <li><strong>Search & Date Filter:</strong> Search by headline text or notes; filter by month or custom date range.</li>
      <li><strong>Export to Excel (.xlsx):</strong> Download complete expense ledger including headline, amount, date, vendor, notes, and employee name.</li>
    </ul>

    <h2>Form: Record Office Expense</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Expense Headline</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Free text description (e.g. <em>Chai & Samosa for Client Meeting</em>, <em>Petrol</em>, <em>Office Rent</em>).</td>
        </tr>
        <tr>
          <td><strong>Total Amount (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Amount spent in rupees (e.g. <em>450</em>).</td>
        </tr>
        <tr>
          <td><strong>Date of Expense</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Date expense occurred (defaults to today).</td>
        </tr>
        <tr>
          <td><strong>Paid To / Vendor</strong></td>
          <td>Text</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Recipient or store name (e.g. <em>Sharma Tea Stall</em>, <em>HP Petrol Pump</em>).</td>
        </tr>
        <tr>
          <td><strong>Notes / Description</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Specific purpose or meeting details.</td>
        </tr>
        <tr>
          <td><strong>Receipt / Bill Photo Upload</strong></td>
          <td>File</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upload image of cash receipt or invoice (stored in <code>public/uploads/expenses/</code>).</td>
        </tr>
      </tbody>
    </table>

    <h1>15. Deals & Brokerage Accounting</h1>
    <p>Closing sales transactions, automatic 2% commission calculations, and agent brokerage disbursement ledgers.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Brokerage Summary KPIs:</strong> All-Time Brokerage Earned, This Month's Brokerage, Disbursed to Agents, and Pending Payouts awaiting client settlement.</li>
      <li><strong>Closed Deals Registry:</strong> Table of finalized sales showing Deal #, Buyer/Client, Property, Closing Agent, Deal Value (e.g. <em>₹95.00 Lakh</em>), Brokerage % (default 2%), Agency Commission (e.g. <em>₹1,90,000</em>), and Closing Date.</li>
      <li><strong>Brokerage Disbursement Ledger:</strong> Tracks payouts and commission shares owed or disbursed to agents.</li>
    </ul>

    <h2>Form: Close Deal / Record Transaction</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Buyer / Client</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Choose lead from CRM. Automatically marks lead stage as Won.</td>
        </tr>
        <tr>
          <td><strong>Property Sold</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Choose property from inventory. Auto-fills asking price into deal value.</td>
        </tr>
        <tr>
          <td><strong>Closing Agent</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Sales executive credited with the transaction.</td>
        </tr>
        <tr>
          <td><strong>Total Transaction Value (₹)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Final agreed sale price in rupees (e.g. <em>9500000</em>).</td>
        </tr>
        <tr>
          <td><strong>Brokerage Percentage (%)</strong></td>
          <td>Number</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Commission percentage (defaults to standard <strong>2.0%</strong>).</td>
        </tr>
        <tr>
          <td><strong>Deal Status</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td><strong>Closed Won</strong>, <strong>In Progress</strong>, or <strong>Cancelled</strong>.</td>
        </tr>
        <tr>
          <td><strong>Closing Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Registry or contract signing date.</td>
        </tr>
        <tr>
          <td><strong>Agreement Expiry Date</strong></td>
          <td>Date</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Contract validity end date (surfaces in 30-day voice alert reminders).</td>
        </tr>
        <tr>
          <td><strong>Transaction Notes</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Payment milestones, bank loan status, or commission sharing splits.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 16: CALLS & SECTION 17: WHATSAPP -->
  <div class="page-break">
    <h1>16. Telephony & Click-to-Call Logs</h1>
    <p>Click-to-call dialing, discussion outcome logging, and local audio recording playback.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Call History Log:</strong> Table showing Date/Time, Client Name & Mobile, Agent Name, Call Duration (minutes & seconds), Outcome badge, Discussion Notes, and Audio Recording Player.</li>
      <li><strong>Click-to-Call:</strong> Clicking any phone number in the CRM initiates a call via the connected softphone, mobile app, or desktop telephony handler.</li>
      <li><strong>Audio Playback:</strong> In-browser HTML5 audio player to listen to call recordings saved in <code>public/uploads/call-recordings/</code>.</li>
      <li><strong>Filter by Outcome:</strong> Connected / Answered, Not Answered / Ringing, Busy / Line In Use, Wrong Number / Invalid.</li>
    </ul>

    <h2>Form: Log Call</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Client Name & Phone</strong></td>
          <td>Auto/Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pre-filled from lead profile or picked from dropdown.</td>
        </tr>
        <tr>
          <td><strong>Call Outcome</strong></td>
          <td>Select/Radio</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pick: <strong>Connected</strong>, <strong>Not Answered</strong>, <strong>Busy</strong>, or <strong>Wrong Number</strong>.</td>
        </tr>
        <tr>
          <td><strong>Duration (Minutes & Seconds)</strong></td>
          <td>Numbers</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Talk time (e.g. <em>3 minutes 45 seconds</em>).</td>
        </tr>
        <tr>
          <td><strong>Discussion Notes</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Client reactions, budget preferences, or scheduled next steps.</td>
        </tr>
        <tr>
          <td><strong>Upload Audio Recording</strong></td>
          <td>File</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upload call recording (<code>.mp3</code>, <code>.wav</code>, <code>.m4a</code>) for in-CRM playback.</td>
        </tr>
      </tbody>
    </table>

    <h1>17. WhatsApp Direct Hub</h1>
    <p>One-click direct WhatsApp communication using pre-approved real estate message templates.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Message Dispatch Log:</strong> History of WhatsApp messages sent across the agency with recipient, template used, message text, agent name, and timestamp.</li>
      <li><strong>One-Click wa.me Dispatch:</strong> Bypasses costly WhatsApp Business messaging fees by launching direct <code>https://wa.me/91XXXXXXXXXX?text=...</code> web chats with pre-formatted text.</li>
    </ul>

    <h2>Form: Send WhatsApp Message</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Client Name & Mobile</strong></td>
          <td>Auto/Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pre-filled recipient details.</td>
        </tr>
        <tr>
          <td><strong>Message Template</strong></td>
          <td>Select</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Choose from 6 templates:
            <br>1. <em>Initial Introduction</em> (Welcome greeting)
            <br>2. <em>Property Recommendation</em> (Matched property specs)
            <br>3. <em>Site Visit Confirmation</em> (Time and directions reminder)
            <br>4. <em>Quick Follow-up</em> (Re-engaging inactive leads)
            <br>5. <em>Festive Greeting</em> (Diwali/New Year warm wishes)
            <br>6. <em>Custom Message</em> (Open free-text composer)
          </td>
        </tr>
        <tr>
          <td><strong>Message Body</strong></td>
          <td>Textarea</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Pre-populated based on template and client name. Fully editable before sending. Supports WhatsApp bold (<code>*text*</code>) and italics (<code>_text_</code>).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 18: REPORTS & SECTION 19: INTEGRATIONS -->
  <div class="page-break">
    <h1>18. Analytics & Business Intelligence Reports</h1>
    <p>Comprehensive telemetry on pipeline conversions, channel efficiency, and agent performance.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Top Level KPIs:</strong> Total Deal Volume (₹), Gross Brokerage Earned (₹), Site Visit Success Rate (%), and Active Inquiries.</li>
      <li><strong>Lead Status Distribution:</strong> Percentage breakdown of prospects across Negotiation (20%), Follow Up (20%), Site Visit (20%), New (19%), Contacted (20%), and Won (1%).</li>
      <li><strong>Operational Performance Metrics:</strong> Total Follow-ups scheduled, completed, pending, overdue; Total site visits planned, completed, cancelled.</li>
      <li><strong>Channel Contribution Leaderboard:</strong> Compares inquiry volume from Meta Ads (30%), Housing.com (25%), WhatsApp (15%), Google Search (12%), Instagram (10%), Website (5%), and Manual (3%).</li>
      <li><strong>Agent Performance Leaderboard:</strong> Ranked table of agents comparing Leads Managed, Calls Made, Visits Done, Deals Closed, and Gross Brokerage Generated.</li>
      <li><strong>Export to Excel (.xlsx):</strong> Download complete agency analytics in spreadsheet format with one click.</li>
    </ul>

    <h1>19. Lead Channel Integrations & Webhooks</h1>
    <p>Code-ready automated webhook endpoints for hands-free lead capture from third-party advertising platforms.</p>

    <h2>Webhook Endpoints & Security Specs</h2>
    <div class="box box-warning">
      <strong>Webhook Security Enforcement:</strong> All inbound webhooks enforce SHA256 HMAC signature verification to prevent spoofed payloads. Configure credentials in your local <code>.env.local</code> file.
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Channel Platform</th>
          <th style="width: 45%;">Local Webhook Endpoint URL</th>
          <th style="width: 30%;">Required Environment Variables</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Meta Lead Ads</strong><br>(Facebook & Instagram)</td>
          <td><code>http://localhost:3000/api/webhooks/meta-leads</code></td>
          <td><code>META_APP_SECRET</code><br><code>META_PAGE_ACCESS_TOKEN</code><br><code>META_VERIFY_TOKEN</code></td>
        </tr>
        <tr>
          <td><strong>Housing.com</strong><br>(Builder Lead API)</td>
          <td><code>http://localhost:3000/api/integrations/housing/sync</code></td>
          <td><code>HOUSING_API_ID</code><br><code>HOUSING_API_KEY</code></td>
        </tr>
        <tr>
          <td><strong>Google Ads</strong><br>(Lead Form Extensions)</td>
          <td><code>http://localhost:3000/api/webhooks/google-leads</code></td>
          <td><code>GOOGLE_ADS_WEBHOOK_KEY</code></td>
        </tr>
        <tr>
          <td><strong>WhatsApp Business</strong><br>(Cloud API Webhooks)</td>
          <td><code>http://localhost:3000/api/webhooks/whatsapp</code></td>
          <td><code>WHATSAPP_PHONE_NUMBER_ID</code><br><code>WHATSAPP_ACCESS_TOKEN</code><br><code>WHATSAPP_VERIFY_TOKEN</code></td>
        </tr>
        <tr>
          <td><strong>Instagram Direct</strong><br>(DMs & Story Ads)</td>
          <td><code>http://localhost:3000/api/webhooks/instagram</code></td>
          <td><code>INSTAGRAM_PAGE_ID</code><br><code>INSTAGRAM_ACCESS_TOKEN</code></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 20: COMPANY PROFILE SETTINGS -->
  <div class="page-break">
    <h1>20. Company Profile & System Settings</h1>
    <p>Global agency profile, branding assets, headquarters address, and security disclosures.</p>

    <h2>What You Can SEE & DO</h2>
    <ul>
      <li><strong>Company Branding:</strong> View and update official company logo and trade name.</li>
      <li><strong>Corporate Contacts:</strong> Primary office phone, official WhatsApp helpline, and support email.</li>
      <li><strong>Headquarters Address:</strong> Registered physical office address.</li>
      <li><strong>System & RLS Disclosures:</strong> Verifies PostgreSQL 16 connection, local storage directory paths, and active Next.js version.</li>
    </ul>

    <h2>Form: Company Profile Settings</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 24%;">Field Name</th>
          <th style="width: 14%;">Type</th>
          <th style="width: 14%;">Required?</th>
          <th style="width: 48%;">What to Type or Pick</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Agency Legal Name</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Registered agency name (e.g. <em>Diksha Real Estate</em>).</td>
        </tr>
        <tr>
          <td><strong>Company Brand Logo</strong></td>
          <td>File / URL</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Upload company logo image (saved to <code>public/uploads/company-assets/</code>).</td>
        </tr>
        <tr>
          <td><strong>Primary Agency Telephone</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Main office phone line (e.g. <em>+91 98765 43210</em>).</td>
        </tr>
        <tr>
          <td><strong>Official WhatsApp Helpline</strong></td>
          <td>Tel</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>WhatsApp business number for client inquiries.</td>
        </tr>
        <tr>
          <td><strong>Registered Office Address</strong></td>
          <td>Text</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Office location (e.g. <em>Tower B, Cyber Heights, Vibhuti Khand, Gomti Nagar, Lucknow</em>).</td>
        </tr>
        <tr>
          <td><strong>Corporate Support Email</strong></td>
          <td>Email</td>
          <td><span class="badge badge-req">Required</span></td>
          <td>Email address for correspondence (e.g. <em>admin@diksharealestate.com</em>).</td>
        </tr>
        <tr>
          <td><strong>Official Website URL</strong></td>
          <td>URL</td>
          <td><span class="badge badge-opt">Optional</span></td>
          <td>Agency domain (e.g. <em>https://diksharealestate.com</em>).</td>
        </tr>
      </tbody>
    </table>

    <div class="box box-success" style="margin-top: 30px;">
      <strong>Summary of System Verification:</strong> All 20 sections reflect the live CRM configuration running on <code>http://localhost:3000</code>. All modules, fields, and permissions are enforced by PostgreSQL Row Level Security (RLS) and verified for production reliability.
    </div>
  </div>

</body>
</html>
`;

const htmlPath = path.join(__dirname, '..', 'documentation.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('✓ Written HTML documentation to:', htmlPath);

const pdfPath = path.join(__dirname, '..', 'diksha-crm-full-documentation.pdf');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('Rendering PDF via Headless Edge...');
const edgeHtmlUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
const cmd = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${edgeHtmlUrl}"`;
execSync(cmd, { stdio: 'inherit' });

console.log('✓ Generated PDF at:', pdfPath);
const stats = fs.statSync(pdfPath);
console.log(`PDF File Size: ${(stats.size / 1024).toFixed(1)} KB`);
