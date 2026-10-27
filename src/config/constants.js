export const DEPTH_SLABS_DEFINITION = [
    { start: 1,    end: 300,  span: 300, inc: 0,    defaultRate: 90,   rangeStr: '001-300 ft' },
    { start: 301,  end: 400,  span: 100, inc: 10,   defaultRate: 100,  rangeStr: '301-400 ft' },
    { start: 401,  end: 500,  span: 100, inc: 30,   defaultRate: 120,  rangeStr: '401-500 ft' },
    { start: 501,  end: 600,  span: 100, inc: 60,   defaultRate: 150,  rangeStr: '501-600 ft' },
    { start: 601,  end: 700,  span: 100, inc: 100,  defaultRate: 190,  rangeStr: '601-700 ft' },
    { start: 701,  end: 800,  span: 100, inc: 150,  defaultRate: 240,  rangeStr: '701-800 ft' },
    { start: 801,  end: 900,  span: 100, inc: 210,  defaultRate: 300,  rangeStr: '801-900 ft' },
    { start: 901,  end: 1000, span: 100, inc: 280,  defaultRate: 370,  rangeStr: '901-1000 ft' },
    { start: 1001, end: 1100, span: 100, inc: 380,  defaultRate: 470,  rangeStr: '1001-1100 ft' },
    { start: 1101, end: 1200, span: 100, inc: 480,  defaultRate: 570,  rangeStr: '1101-1200 ft' },
    { start: 1201, end: 1300, span: 100, inc: 580,  defaultRate: 670,  rangeStr: '1201-1300 ft' },
    { start: 1301, end: 1400, span: 100, inc: 680,  defaultRate: 770,  rangeStr: '1301-1400 ft' },
    { start: 1401, end: 1500, span: 100, inc: 780,  defaultRate: 870,  rangeStr: '1401-1500 ft' },
    { start: 1501, end: 1600, span: 100, inc: 880,  defaultRate: 970,  rangeStr: '1501-1600 ft' },
    { start: 1601, end: 1700, span: 100, inc: 980,  defaultRate: 1070, rangeStr: '1601-1700 ft' },
    { start: 1701, end: 1800, span: 100, inc: 1080, defaultRate: 1170, rangeStr: '1701-1800 ft' },
    { start: 1801, end: 1900, span: 100, inc: 1180, defaultRate: 1270, rangeStr: '1801-1900 ft' },
    { start: 1901, end: 2000, span: 100, inc: 1280, defaultRate: 1370, rangeStr: '1901-2000 ft' },
    { start: 2001, end: 2200, span: 200, inc: 1480, defaultRate: 1570, rangeStr: '2001-2200 ft' }
];

export const COUNTRY_DIAL_CODES = [
    { code: '+91',  dial: '91',  iso: 'IN', flag: '🇮🇳', name: 'India',        minLen: 10, maxLen: 10, indiaRule: true },
    { code: '+65',  dial: '65',  iso: 'SG', flag: '🇸🇬', name: 'Singapore',    minLen: 8,  maxLen: 8  },
    { code: '+971', dial: '971', iso: 'AE', flag: '🇦🇪', name: 'UAE',          minLen: 9,  maxLen: 9  },
    { code: '+60',  dial: '60',  iso: 'MY', flag: '🇲🇾', name: 'Malaysia',     minLen: 9,  maxLen: 10 },
    { code: '+94',  dial: '94',  iso: 'LK', flag: '🇱🇰', name: 'Sri Lanka',    minLen: 9,  maxLen: 9  },
    { code: '+966', dial: '966', iso: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', minLen: 9,  maxLen: 9  },
    { code: '+974', dial: '974', iso: 'QA', flag: '🇶🇦', name: 'Qatar',        minLen: 8,  maxLen: 8  },
    { code: '+965', dial: '965', iso: 'KW', flag: '🇰🇼', name: 'Kuwait',       minLen: 8,  maxLen: 8  },
    { code: '+968', dial: '968', iso: 'OM', flag: '🇴🇲', name: 'Oman',         minLen: 8,  maxLen: 8  },
    { code: '+973', dial: '973', iso: 'BH', flag: '🇧🇭', name: 'Bahrain',      minLen: 8,  maxLen: 8  },
    { code: '+1',   dial: '1',   iso: 'US', flag: '🇺🇸', name: 'USA / Canada', minLen: 10, maxLen: 10 },
    { code: '+44',  dial: '44',  iso: 'GB', flag: '🇬🇧', name: 'UK',           minLen: 10, maxLen: 10 },
    { code: '+61',  dial: '61',  iso: 'AU', flag: '🇦🇺', name: 'Australia',    minLen: 9,  maxLen: 9  },
    { code: '+27',  dial: '27',  iso: 'ZA', flag: '🇿🇦', name: 'South Africa', minLen: 9,  maxLen: 9  },
    { code: '+977', dial: '977', iso: 'NP', flag: '🇳🇵', name: 'Nepal',        minLen: 10, maxLen: 10 }
];
