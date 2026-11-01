/**
 * Official Brand Configuration for Mythree Ladies Hostel
 * Central single-source-of-truth for company name, institutional address, contact numbers, and website.
 */

export const BRAND = {
  name: 'Mythree Ladies Hostel',
  legalName: 'Mythree Ladies Hostel',
  shortName: 'Mythree',
  tagline: 'Safe, Comfortable & Modern Living for Women',
  roomTypesSummary: 'Sharing Rooms · Single Rooms · A/C Rooms · Non - A/C Rooms',
  features: [
    'Sharing Rooms',
    'Single Rooms',
    'A/C Rooms',
    'Non - A/C Rooms'
  ],
  address: {
    landmark: 'Near Almas Hospital',
    area: 'Changuvetty',
    city: 'Kottakkal',
    state: 'Kerala',
    pincode: '676503',
    line1: 'Near Almas Hospital, Changuvetty',
    line2: 'Kottakkal, Kerala - 676503',
    full: 'Near Almas Hospital, Changuvetty, Kottakkal, Kerala - 676503',
  },
  contacts: {
    phone1: '6238 676 455',
    phone2: '8138 024 916',
    phoneRaw1: '6238676455',
    phoneRaw2: '8138024916',
    phoneFormatted: '+91 6238 676 455 / +91 8138 024 916',
    email: 'info@mythreehostels.com',
    supportEmail: 'support@mythreehostels.com',
    website: 'www.mythreehostels.com',
    websiteUrl: 'https://www.mythreehostels.com',
  },
  colors: {
    primary: '#10375C',      // Deep royal navy from Mythree logo
    primaryDark: '#0A2540',  // Dark navy shadow
    primaryLight: '#1B4D7E', // Medium navy
    accent: '#EAF2F8',       // Ice blue background tint
    accentForeground: '#10375C',
    white: '#FFFFFF',
  }
} as const
