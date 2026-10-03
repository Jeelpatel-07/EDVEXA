// Initial seed data and realistic storage for EDVEXA frontend workflows

export const MOCK_USERS = [
  {
    id: "usr_1",
    name: "Alex Rivera",
    email: "alex.rivera@college.edu",
    studentId: "STU-2024-0891",
    department: "Computer Science & Engineering",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    roles: ["Student", "Volunteer", "Event Manager", "Treasurer", "Administrator"],
    activeRole: "Administrator",
    membership: {
      id: "mem_01",
      planName: "Annual Gold Member",
      status: "ACTIVE",
      tier: "GOLD",
      expiryDate: "2027-05-31",
      memberDiscountPercent: 20,
      autoRenew: true
    }
  },
  {
    id: "usr_2",
    name: "Priya Sharma",
    email: "priya.sharma@college.edu",
    studentId: "STU-2024-1142",
    department: "Information Technology",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    roles: ["Student", "Gate Staff"],
    activeRole: "Gate Staff",
    membership: {
      id: "mem_02",
      planName: "Semester Silver Member",
      status: "ACTIVE",
      tier: "SILVER",
      expiryDate: "2026-12-15",
      memberDiscountPercent: 10,
      autoRenew: false
    }
  },
  {
    id: "usr_3",
    name: "Devon Vance",
    email: "devon.v@college.edu",
    studentId: "STU-2025-0034",
    department: "Business Administration",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    roles: ["Student"],
    activeRole: "Student",
    membership: null
  }
];

export const MOCK_MEMBERSHIP_PLANS = [
  {
    id: "plan_bronze",
    name: "Semester Pass",
    tier: "BRONZE",
    price: 15.00,
    durationMonths: 4,
    discountPercent: 5,
    features: [
      "Access to standard campus workshops",
      "5% discount on all official merchandise",
      "Priority registration 12h before general public",
      "Official digital membership badge"
    ],
    isPopular: false
  },
  {
    id: "plan_gold",
    name: "Annual Gold Membership",
    tier: "GOLD",
    price: 35.00,
    durationMonths: 12,
    discountPercent: 20,
    features: [
      "20% member pricing discount on all event tickets",
      "20% discount on official merchandise & kits",
      "Exclusive VIP access to Hackathons & Keynotes",
      "Voting rights in Student Senate elections",
      "Dedicated fast-track gate check-in line",
      "Complimentary annual student starter package"
    ],
    isPopular: true
  },
  {
    id: "plan_alumni",
    name: "Alumni & Benefactor",
    tier: "PLATINUM",
    price: 75.00,
    durationMonths: 24,
    discountPercent: 25,
    features: [
      "Lifetime membership badge & directory recognition",
      "Invitation to executive dinner and networking galas",
      "Mentorship and advisory privileges",
      "Direct contribution to organization travel grant fund"
    ],
    isPopular: false
  }
];

export const MOCK_EVENTS = [
  {
    id: "evt_101",
    title: "HackEDVEXA 2026: Campus Tech Sprint",
    slug: "hackedvexa-2026",
    category: "Hackathon",
    status: "UPCOMING",
    description: "Our signature 36-hour campus hackathon bringing together engineers, designers, and innovators to solve real-world student lifecycle challenges.",
    venue: "Main Campus Auditorium & Hall C",
    startDate: "2026-10-18T09:00:00",
    endDate: "2026-10-19T21:00:00",
    capacity: 250,
    registeredCount: 198,
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
    ticketTypes: [
      { id: "tt_1", name: "General Student Pass", price: 10.00, memberPrice: 0.00, available: 32, maxPerOrder: 2 },
      { id: "tt_2", name: "Hacker Team Pass (4 pax)", price: 30.00, memberPrice: 20.00, available: 12, maxPerOrder: 1 },
      { id: "tt_3", name: "Observer & Keynote Only", price: 5.00, memberPrice: 0.00, available: 8, maxPerOrder: 4 }
    ]
  },
  {
    id: "evt_102",
    title: "Design Systems & UI Engineering Workshop",
    slug: "design-systems-workshop",
    category: "Workshop",
    status: "UPCOMING",
    description: "Hands-on masterclass building enterprise design components with modern web standards and accessibility patterns.",
    venue: "Engineering Building, Lab 402",
    startDate: "2026-10-24T14:00:00",
    endDate: "2026-10-24T17:30:00",
    capacity: 60,
    registeredCount: 52,
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
    ticketTypes: [
      { id: "tt_4", name: "Standard Entry", price: 12.00, memberPrice: 6.00, available: 8, maxPerOrder: 1 }
    ]
  },
  {
    id: "evt_103",
    title: "Fall Club Orientation & Community Mixer",
    slug: "fall-club-orientation",
    category: "Social",
    status: "UPCOMING",
    description: "Meet your club leaders, discover volunteer committees, enjoy free refreshments, and claim club welcome merchandise.",
    venue: "Student Center Courtyard",
    startDate: "2026-10-10T16:00:00",
    endDate: "2026-10-10T19:00:00",
    capacity: 400,
    registeredCount: 310,
    image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=80",
    ticketTypes: [
      { id: "tt_5", name: "Free Admission RSVP", price: 0.00, memberPrice: 0.00, available: 90, maxPerOrder: 2 }
    ]
  }
];

export const MOCK_TICKETS = [
  {
    id: "tkt_801",
    ticketNumber: "EDV-2026-TKT-801",
    orderId: "ord_501",
    eventId: "evt_101",
    eventTitle: "HackEDVEXA 2026: Campus Tech Sprint",
    ticketTypeName: "General Student Pass",
    holderName: "Alex Rivera",
    holderEmail: "alex.rivera@college.edu",
    holderStudentId: "STU-2024-0891",
    pricePaid: 0.00,
    status: "ISSUED", // ISSUED, CHECKED_IN, CANCELLED, REFUNDED
    qrCode: "EDVEXA-QR-EVT101-TKT801-ALEXRIVERA",
    eventDate: "2026-10-18T09:00:00",
    venue: "Main Campus Auditorium",
    checkedInAt: null,
    checkedInBy: null
  },
  {
    id: "tkt_802",
    ticketNumber: "EDV-2026-TKT-802",
    orderId: "ord_502",
    eventId: "evt_102",
    eventTitle: "Design Systems & UI Engineering Workshop",
    ticketTypeName: "Standard Entry",
    holderName: "Alex Rivera",
    holderEmail: "alex.rivera@college.edu",
    holderStudentId: "STU-2024-0891",
    pricePaid: 6.00,
    status: "ISSUED",
    qrCode: "EDVEXA-QR-EVT102-TKT802-ALEXRIVERA",
    eventDate: "2026-10-24T14:00:00",
    venue: "Engineering Building, Lab 402",
    checkedInAt: null,
    checkedInBy: null
  }
];

export const MOCK_PRODUCTS = [
  {
    id: "prd_201",
    name: "EDVEXA Heavyweight Cotton Hoodie",
    category: "Apparel",
    description: "Premium 380 GSM brushed fleece hoodie embroidered with minimalist teal EDVEXA college crest.",
    price: 36.00,
    memberPrice: 28.80,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    variants: [
      { id: "var_1", size: "S", color: "Teal Green", stock: 15 },
      { id: "var_2", size: "M", color: "Teal Green", stock: 24 },
      { id: "var_3", size: "L", color: "Teal Green", stock: 18 },
      { id: "var_4", size: "XL", color: "Teal Green", stock: 8 },
      { id: "var_5", size: "M", color: "Heather Gray", stock: 12 },
      { id: "var_6", size: "L", color: "Heather Gray", stock: 9 }
    ]
  },
  {
    id: "prd_202",
    name: "HydroFlask Insulated Thermal Bottle",
    category: "Accessories",
    description: "750ml double-wall vacuum insulated stainless steel water bottle. Keeps drinks cold 24h, hot 12h.",
    price: 18.00,
    memberPrice: 14.40,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
    variants: [
      { id: "var_7", size: "750ml", color: "Matte Teal", stock: 35 },
      { id: "var_8", size: "750ml", color: "Polar White", stock: 22 }
    ]
  },
  {
    id: "prd_203",
    name: "EDVEXA Holographic Laptop Sticker Pack",
    category: "Merch",
    description: "Pack of 6 waterproof vinyl holographic stickers featuring tech, design, and student life motifs.",
    price: 6.00,
    memberPrice: 4.80,
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    variants: [
      { id: "var_9", size: "Standard", color: "Holo Prism", stock: 120 }
    ]
  }
];

export const MOCK_ORDERS = [
  {
    id: "ord_501",
    orderNumber: "ORD-2026-0501",
    userId: "usr_1",
    type: "TICKET",
    status: "PAID", // PENDING, PROCESSING, PAID, FAILED, EXPIRED, CANCELLED, REFUNDED
    createdAt: "2026-10-01T14:32:00",
    items: [
      {
        title: "HackEDVEXA 2026: Campus Tech Sprint - General Student Pass",
        quantity: 1,
        unitPrice: 0.00,
        subtotal: 0.00
      }
    ],
    totalAmount: 0.00,
    discountAmount: 10.00,
    paymentMethod: "MEMBER_BENEFIT",
    pickupStatus: "NOT_APPLICABLE"
  },
  {
    id: "ord_502",
    orderNumber: "ORD-2026-0502",
    userId: "usr_1",
    type: "TICKET",
    status: "PAID",
    createdAt: "2026-10-02T10:15:00",
    items: [
      {
        title: "Design Systems Workshop - Standard Entry",
        quantity: 1,
        unitPrice: 6.00,
        subtotal: 6.00
      }
    ],
    totalAmount: 6.00,
    discountAmount: 6.00,
    paymentMethod: "STRIPE_CARD",
    pickupStatus: "NOT_APPLICABLE"
  },
  {
    id: "ord_503",
    orderNumber: "ORD-2026-0503",
    userId: "usr_1",
    type: "MERCHANDISE",
    status: "PAID",
    createdAt: "2026-09-28T18:40:00",
    items: [
      {
        title: "EDVEXA Heavyweight Cotton Hoodie (M / Teal Green)",
        quantity: 1,
        unitPrice: 28.80,
        subtotal: 28.80
      }
    ],
    totalAmount: 28.80,
    discountAmount: 7.20,
    paymentMethod: "CAMPUS_PAY",
    pickupStatus: "READY_FOR_PICKUP", // READY_FOR_PICKUP, PICKED_UP, PENDING
    pickupLocation: "Student Organization Desk, Room 204"
  }
];

export const MOCK_ANNOUNCEMENTS = [
  {
    id: "anc_301",
    title: "Official HackEDVEXA 2026 Team Registrations & Mentorship Open",
    category: "Events",
    priority: "HIGH",
    author: "Alex Rivera (Lead Organizer)",
    publishedAt: "2026-10-02T09:00:00",
    content: "We are thrilled to officially unveil HackEDVEXA 2026! Over 250 hackers will compete across 3 tracks: Smart Campus, FinTech for Students, and Sustainable Learning. Registered members can form teams in the tasks portal.",
    pinned: true
  },
  {
    id: "anc_302",
    title: "Fall Semester Member T-Shirts and Welcome Kits Arrival",
    category: "General",
    priority: "NORMAL",
    author: "Student Senate Secretary",
    publishedAt: "2026-09-29T11:30:00",
    content: "All Gold and Platinum members may drop by Room 204 from 10am-4pm Monday through Thursday to collect your welcome kit and custom hoodie orders.",
    pinned: false
  },
  {
    id: "anc_303",
    title: "Volunteer Committee Roster for Orientation Week Released",
    category: "Volunteers",
    priority: "NORMAL",
    author: "Volunteer Operations",
    publishedAt: "2026-09-25T15:00:00",
    content: "Thank you to the 40+ volunteers who signed up. Please inspect your My Tasks panel to view assigned time slots, check-in gates, and team leads.",
    pinned: false
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "notif_401",
    title: "Ticket Confirmed",
    message: "Your ticket for 'HackEDVEXA 2026' has been generated. View your QR pass in My Tickets.",
    timestamp: "2 hours ago",
    read: false,
    type: "ticket",
    link: "/app/tickets/tkt_801"
  },
  {
    id: "notif_402",
    title: "Merch Ready for Pickup",
    message: "Order ORD-2026-0503 is ready for collection at Student Desk Room 204.",
    timestamp: "1 day ago",
    read: false,
    type: "shop",
    link: "/app/orders/ord_503"
  },
  {
    id: "notif_403",
    title: "Volunteer Task Assigned",
    message: "You have been assigned to Gate Staff Duty for Fall Orientation on Oct 10.",
    timestamp: "2 days ago",
    read: true,
    type: "task",
    link: "/app/tasks/tsk_601"
  }
];

export const MOCK_TASKS = [
  {
    id: "tsk_601",
    title: "Attendee Check-in & Badge Distribution (Gate A)",
    event: "Fall Club Orientation",
    date: "2026-10-10",
    shiftTime: "15:30 - 18:30",
    assignedTo: "Alex Rivera",
    lead: "Priya Sharma",
    status: "IN_PROGRESS", // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    priority: "HIGH",
    description: "Scan attendee QR tickets using the EDVEXA check-in module on your mobile or tablet. Distribute orientation wristbands.",
    requiredItems: ["Charged tablet or smartphone", "Gate lanyard", "Badge stickers"]
  },
  {
    id: "tsk_602",
    title: "Stage AV & Audio Cable Run Inspection",
    event: "HackEDVEXA 2026",
    date: "2026-10-18",
    shiftTime: "07:30 - 09:00",
    assignedTo: "Alex Rivera",
    lead: "Marcus Vance",
    status: "PENDING",
    priority: "MEDIUM",
    description: "Test HDMI inputs on main projector, verify lapel mics and run backup audio cables to judge podium."
  }
];

export const MOCK_CLAIMS = [
  {
    id: "clm_701",
    claimNumber: "CLM-2026-0701",
    claimantId: "usr_1",
    claimantName: "Alex Rivera",
    purpose: "Snacks & Bottled Water for Club Orientation Volunteer Briefing",
    category: "Event Refreshments",
    amount: 45.50,
    status: "APPROVED", // PENDING, UNDER_REVIEW, APPROVED, REJECTED, REIMBURSED
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
    submittedAt: "2026-09-30T16:20:00",
    reviewedAt: "2026-10-01T11:00:00",
    reviewedBy: "Treasurer Council",
    treasurerNotes: "Receipt verified against university grocery card statement. Approved for next payout cycle."
  },
  {
    id: "clm_702",
    claimNumber: "CLM-2026-0702",
    claimantId: "usr_1",
    claimantName: "Alex Rivera",
    purpose: "Print Posters & Gate Signage for HackEDVEXA",
    category: "Marketing & Print",
    amount: 62.00,
    status: "UNDER_REVIEW",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
    submittedAt: "2026-10-02T13:45:00",
    reviewedAt: null,
    reviewedBy: null,
    treasurerNotes: ""
  }
];

export const MOCK_FUNDRAISERS = [
  {
    id: "fnd_1",
    title: "EDVEXA Student Hardware Lab & 3D Printer Drive",
    goalAmount: 3500.00,
    raisedAmount: 2480.00,
    donorsCount: 42,
    status: "ACTIVE",
    category: "Lab Equipment",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    description: "Help us furnish the student open workshop with a Bambu Lab 3D printer, soldering stations, and Arduino prototype kits for all club members to use for free."
  },
  {
    id: "fnd_2",
    title: "Travel Grants for National Collegiate Hackathon Finals",
    goalAmount: 1800.00,
    raisedAmount: 1650.00,
    donorsCount: 29,
    status: "ACTIVE",
    category: "Travel Grant",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop&q=80",
    description: "Funding train tickets and lodging for our 8-student finalist team traveling to represent our university at the National Hackathon."
  }
];

export const MOCK_FINANCE = {
  openingBalance: 4250.00,
  moneyReceived: 5630.00,
  refunds: 120.00,
  reimbursements: 345.50,
  otherExpenses: 680.00,
  closingCash: 8734.50,
  approvedClaimsAwaitingPayment: 45.50,
  incomeBreakdown: {
    memberships: 2850.00,
    tickets: 1420.00,
    merchandise: 860.00,
    fundraisers: 500.00
  },
  ledger: [
    { id: "led_01", date: "2026-10-02", type: "INCOME", source: "Tickets", description: "HackEDVEXA Ticket batch sales", amount: 240.00, ref: "ORD-BATCH-12" },
    { id: "led_02", date: "2026-10-01", type: "INCOME", source: "Memberships", description: "Annual Gold Membership renewals (x4)", amount: 140.00, ref: "MEM-BATCH-08" },
    { id: "led_03", date: "2026-09-30", type: "EXPENSE", source: "Reimbursement", description: "Alex Rivera - CLM-2026-0701 Refreshments", amount: -45.50, ref: "CLM-2026-0701" },
    { id: "led_04", date: "2026-09-28", type: "INCOME", source: "Merchandise", description: "Hoodie & Bottle sales desk", amount: 186.00, ref: "ORD-BATCH-11" },
    { id: "led_05", date: "2026-09-26", type: "EXPENSE", source: "Vendor", description: "Audiovisual cable spares invoice", amount: -128.00, ref: "VND-4991" }
  ]
};
