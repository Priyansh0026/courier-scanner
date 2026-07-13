// Default config of supported courier partners with detection rules
const DEFAULT_COURIER_PARTNERS = [
  {
    id: 'srinternational',
    name: 'S R International',
    logo: '✈️',
    color: '#319795',
    regex: /^\d{8}$/,
    placeholder: 'e.g. 12345678'
  },
  {
    id: 'shreemaruti',
    name: 'Shree Maruti',
    logo: '<img src="shree_maruti_logo.jpg" style="width: 18px; height: 18px; border-radius: 2px; object-fit: contain; vertical-align: middle; margin-right: 4px;">',
    color: '#D4111D',
    regex: /^\d{14}$/,
    placeholder: 'e.g. 26016100025983'
  },
  {
    id: 'mrinternational',
    name: 'M R International',
    logo: '🌍',
    color: '#2C7A7B',
    regex: /^\d{5}$/,
    placeholder: 'e.g. 12345'
  },
  {
    id: 'skyking',
    name: 'Sky King',
    logo: '<img src="skyking_logo.svg" style="width: 18px; height: 18px; border-radius: 2px; object-fit: contain; vertical-align: middle; margin-right: 4px;">',
    color: '#E31E24',
    regex: /^\d{9}$/,
    placeholder: 'e.g. 918840062'
  },
  {
    id: 'professional',
    name: 'The Professional',
    logo: '<img src="professional_logo.svg" style="width: 18px; height: 18px; border-radius: 2px; object-fit: contain; vertical-align: middle; margin-right: 4px;">',
    color: '#0F75BC',
    regex: /^[A-Z]{3}\d{9}$/i,
    placeholder: 'e.g. KNP250001196'
  },
  {
    id: 'airways',
    name: 'Airways',
    logo: '💨',
    color: '#2B6CB0',
    regex: /^\d{11}$/,
    placeholder: 'e.g. 10293847291'
  },
  {
    id: 'anjani',
    name: 'Shree Anjani',
    logo: '✈️',
    color: '#0066B2',
    regex: /^\d{10}$/,
    placeholder: 'e.g. 1293847291'
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    logo: '🚚',
    color: '#0D5CA4',
    regex: /^\d{12}$/,
    placeholder: 'e.g. 109283748291'
  }
];

let COURIER_PARTNERS = [];

// Initialize courier partners from localStorage or fallback to defaults
function initCourierPartners() {
  const stored = localStorage.getItem('jcms_couriers');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      COURIER_PARTNERS = parsed.map(p => {
        // Re-hydrate regex string to RegExp object
        let regObj;
        if (typeof p.regex === 'string') {
          const match = p.regex.match(/^\/(.*?)\/([gimy]*)$/);
          if (match) {
            regObj = new RegExp(match[1], match[2]);
          } else {
            regObj = new RegExp(p.regex);
          }
        } else {
          regObj = p.regex;
        }
        return { ...p, regex: regObj };
      });

      // Auto-migrate: add any missing defaults or upgrade outdated entries (like shreemaruti) to local storage
      let updated = false;
      DEFAULT_COURIER_PARTNERS.forEach(def => {
        const existingIdx = COURIER_PARTNERS.findIndex(p => p.id === def.id);
        if (existingIdx === -1) {
          COURIER_PARTNERS.push(def);
          updated = true;
        } else {
          // Force upgrade shreemaruti if using old logo or regex pattern
          const existing = COURIER_PARTNERS[existingIdx];
          const isOutdatedMaruti = def.id === 'shreemaruti' && 
            (existing.logo === '🏎️' || !existing.regex.toString().includes('14'));
          
          if (isOutdatedMaruti) {
            COURIER_PARTNERS[existingIdx] = def;
            updated = true;
          }
        }
      });
      
      // Auto-remove any active couriers that were deleted from DEFAULT_COURIER_PARTNERS
      const beforeFilterCount = COURIER_PARTNERS.length;
      COURIER_PARTNERS = COURIER_PARTNERS.filter(p => DEFAULT_COURIER_PARTNERS.some(def => def.id === p.id));
      if (COURIER_PARTNERS.length !== beforeFilterCount) {
        updated = true;
      }

      if (updated) {
        saveCourierPartners();
      }
    } catch (e) {
      console.error('Failed to parse jcms_couriers from localStorage', e);
      COURIER_PARTNERS = [...DEFAULT_COURIER_PARTNERS];
    }
  } else {
    COURIER_PARTNERS = [...DEFAULT_COURIER_PARTNERS];
    saveCourierPartners();
  }
}

// Save active courier partners list to storage
function saveCourierPartners() {
  const serialized = COURIER_PARTNERS.map(p => ({
    ...p,
    regex: p.regex.toString() // Convert RegExp to regex string /pattern/flags
  }));
  localStorage.setItem('jcms_couriers', JSON.stringify(serialized));
}

// Detect courier brand from Tracking ID
function detectCourier(trackingId) {
  const cleanedId = trackingId.trim();
  for (const partner of COURIER_PARTNERS) {
    if (partner.regex && partner.regex.test(cleanedId)) {
      return partner.id;
    }
  }
  return 'other'; // Falls back if no rules match
}

const INITIAL_SCANS = [];

// Automatically run initialization when script is loaded
initCourierPartners();

if (typeof module !== 'undefined') {
  module.exports = { COURIER_PARTNERS, detectCourier, INITIAL_SCANS, initCourierPartners, saveCourierPartners };
}
