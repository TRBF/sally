import type { EmergencyAlert, Contact } from '../types';

// All contact coordinates are around Cluj-Napoca (Romania).
// Real incidents / safe zones / aid zones come from the backend.

export const MOCK_ALERTS: EmergencyAlert[] = [
  {
    id: 'alert-1',
    title: 'EMERGENCY ALERT',
    message:
      'Multiple incidents detected nearby. Follow the blue route to the nearest safe zone immediately.',
    severity: 'critical',
    timestamp: new Date(),
    incidentId: 'inc-1',
  },
];

// ─── Friends & Family ───

export const CURRENT_USER_CODE = 'SALLY-7X3K';

/** All known contacts that can be looked up by code. Coordinates are in Cluj-Napoca. */
export const ALL_CONTACTS: Contact[] = [
  {
    id: 'contact-1',
    name: 'Maria Pop',
    code: 'SALLY-A2BF',
    // Piața Unirii (city centre)
    coordinate: { latitude: 46.7702, longitude: 23.5898 },
    phone: '+40 721 123 456',
    relationship: 'family',
  },
  {
    id: 'contact-2',
    name: 'Andrei Ionescu',
    code: 'SALLY-K9MZ',
    // Mănăștur (residential, west)
    coordinate: { latitude: 46.7530, longitude: 23.5560 },
    phone: '+40 733 987 654',
    relationship: 'friend',
  },
  {
    id: 'contact-3',
    name: 'Elena Dumitrescu',
    code: 'SALLY-P4QW',
    // Hasdeu campus / Observatorului (south)
    coordinate: { latitude: 46.7548, longitude: 23.5878 },
    relationship: 'family',
  },
  {
    id: 'contact-4',
    name: 'Radu Stănescu',
    code: 'SALLY-T8VN',
    // Iulius Mall / Gheorgheni (east)
    coordinate: { latitude: 46.7700, longitude: 23.6193 },
    phone: '+40 745 555 321',
    relationship: 'colleague',
  },
  {
    id: 'contact-5',
    name: 'Ioana Mureșan',
    code: 'SALLY-H6YL',
    // Mărăști (north-east)
    coordinate: { latitude: 46.7763, longitude: 23.6125 },
    phone: '+40 728 444 110',
    relationship: 'friend',
  },
];

/** Contacts the user has already added (pre-seeded for demo) */
export const MOCK_CONTACTS: Contact[] = ALL_CONTACTS.slice(0, 3);

/** People who have added the user to their list (followers) */
export const MOCK_FOLLOWERS: Contact[] = [
  ALL_CONTACTS[0], // Maria Pop
  ALL_CONTACTS[2], // Elena Dumitrescu
  {
    id: 'contact-6',
    name: 'George Ilarion',
    code: 'SALLY-X9BN',
    // Grigorescu (west of centre)
    coordinate: { latitude: 46.7708, longitude: 23.5660 },
    relationship: 'friend',
  },
];
