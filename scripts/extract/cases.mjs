// The twelve simulation cases, and the vocabulary they are described in.
// Measure names follow the 2019 I2SL presentation (slide 29), which is the
// authority where the workbooks disagree with themselves.

export const CLIMATE_WORKBOOK = 'STEM Lab Zoned EUI Tool_Climate Zones_SHARED.xlsx';
export const MEASURE_WORKBOOK = 'STEM Lab Zoned EUI Tool_ECM_SHARED.xlsx';

/** Sheet name -> stable id. Sheet names carry trailing spaces; ids never do. */
export const ZONES = [
  { id: 'auditorium', sheetName: 'Auditorium', label: 'Auditorium' },
  { id: 'atrium', sheetName: 'Atrium', label: 'Atrium' },
  { id: 'boh', sheetName: 'BOH', label: 'Back of house' },
  { id: 'cafe-kitchen', sheetName: 'Café Kitchen', label: 'Café kitchen' },
  { id: 'computational', sheetName: 'Computational', label: 'Computational' },
  { id: 'office', sheetName: 'Office', label: 'Office' },
  { id: 'restroom', sheetName: 'Restroom', label: 'Restroom' },
  { id: 'classroom', sheetName: 'Classroom', label: 'Classroom' },
  { id: 'corridor', sheetName: 'Corridor', label: 'Corridor' },
  { id: 'mri-lab', sheetName: 'MRI Lab', label: 'MRI lab' },
  { id: 'nmr-lab', sheetName: 'NMR Lab', label: 'NMR lab' },
  { id: 'core-lab', sheetName: 'Core Lab', label: 'Core lab' },
  { id: 'instruction-lab', sheetName: 'Instruction Lab', label: 'Instruction lab' },
  { id: 'open-lab-bio', sheetName: 'Open Lab Bio', label: 'Open lab — biology' },
  { id: 'open-lab-chem', sheetName: 'Open Lab Chem', label: 'Open lab — chemistry' },
  { id: 'open-lab-general', sheetName: 'Open Lab General', label: 'Open lab — general' },
  { id: 'support-lab-bio', sheetName: 'Support Lab Bio', label: 'Support lab — biology' },
  { id: 'support-lab-chem', sheetName: 'Support Lab Chem', label: 'Support lab — chemistry' },
  { id: 'support-lab-general', sheetName: 'Support Lab General', label: 'Support lab — general' },
  { id: 'write-up', sheetName: 'Write Up', label: 'Write-up' },
  { id: 'vivarium', sheetName: 'Vivarium', label: 'Vivarium' },
];

/** The five air systems the prototype was zoned into. */
export const FAN_GROUPS = {
  'Auditorium': { id: 'auditorium', label: 'Auditorium' },
  'General/Low Energy': { id: 'general', label: 'General / low energy' },
  'Lab/High Energy': { id: 'lab', label: 'Lab / high energy' },
  'Special Lab Energy': { id: 'special-lab', label: 'Special lab' },
  'Vivarium': { id: 'vivarium', label: 'Vivarium' },
};

/**
 * California 3C appears on the Conversions sheet but was never simulated, so it
 * is deliberately absent: five locations, all with zone data behind them.
 * Rates are 2017 EIA and are labelled as such wherever they surface.
 */
export const RATE_VINTAGE = { year: 2017, source: 'U.S. Energy Information Administration' };

export const LOCATIONS = [
  { id: 'boston-5a', label: 'Boston, MA', state: 'Massachusetts', climateZone: '5A', conversionRow: 'Massachusetts, 5A' },
  { id: 'minneapolis-6a', label: 'Minneapolis, MN', state: 'Minnesota', climateZone: '6A', conversionRow: 'Minneapolis, 6A' },
  { id: 'washington-4a', label: 'Washington, DC', state: 'District of Columbia', climateZone: '4A', conversionRow: 'Washington DC, 4A' },
  { id: 'atlanta-3a', label: 'Atlanta, GA', state: 'Georgia', climateZone: '3A', conversionRow: 'Atlanta, 3A' },
  { id: 'denver-5b', label: 'Denver, CO', state: 'Colorado', climateZone: '5B', conversionRow: 'Denver, 5B' },
];

/**
 * Twelve cases. `baseline` is shared by both studies — it is the 5A entry in the
 * climate comparison and the reference in the measure study — so it is extracted
 * once and cross-checked against the other workbook rather than stored twice.
 */
/**
 * The Climate Zones workbook also carries hidden "ECM 5 - Cascade" and
 * "ECM 6 - Shade" sheets whose numbers differ from the measure workbook's — the
 * special-lab fan total reads 262 MBtu there against 216 here, and the NMR lab
 * lands at 555 kBtu/sf/yr against 289. They are orphans: nothing in that
 * workbook's summaries references them, and the measure workbook's values are
 * the ones that were published on the 2019 poster. The measure workbook wins.
 */
const SUPERSEDED_NOTE =
  'The Climate Zones workbook holds a hidden sheet of the same name with different ' +
  'figures. It feeds nothing and disagrees with the published results, so the measure ' +
  'workbook is treated as authoritative.';

export const CASES = [
  {
    id: 'baseline', kind: 'baseline', label: 'Baseline', locationId: 'boston-5a',
    workbook: CLIMATE_WORKBOOK, sheet: '5A - Boston',
    crossCheck: { workbook: MEASURE_WORKBOOK, sheet: 'Baseline' },
    description: '60% window-to-wall, labs at 6 ACH day and 2 ACH night, open-lab receptacles at 8 W/sf, night turndown to one third flow.',
  },
  { id: 'climate-6a', kind: 'climate', label: 'Minneapolis, 6A', locationId: 'minneapolis-6a', workbook: CLIMATE_WORKBOOK, sheet: '6A - Minneapolis' },
  { id: 'climate-4a', kind: 'climate', label: 'Washington DC, 4A', locationId: 'washington-4a', workbook: CLIMATE_WORKBOOK, sheet: '4A - Washington DC' },
  {
    id: 'climate-3a', kind: 'climate', label: 'Atlanta, 3A', locationId: 'atlanta-3a',
    workbook: CLIMATE_WORKBOOK, sheet: '3A - Atlanta',
    /**
     * Write-up rejoins the lab air system, and the fan allocation is rederived.
     *
     * The 3A sheet labels write-up `General/Low Energy` while paying its fan
     * energy from `High_Energy_Fan`, and divides its share by a range that
     * excludes itself. Every other sheet — including the four other climate
     * zones, which are the same building in different weather — puts write-up on
     * the lab system with the denominator including it. ECM 3 is the case that
     * deliberately moves it to the general AHU, and this is not that case.
     *
     * So the label is the error and the multiplier records the intent. Repairing
     * it is not a judgement call about the building: it restores the arithmetic
     * the sheet was already trying to perform.
     */
    regroup: { 'write-up': 'lab' },
  },
  { id: 'climate-5b', kind: 'climate', label: 'Denver, 5B', locationId: 'denver-5b', workbook: CLIMATE_WORKBOOK, sheet: '5B - Denver' },

  {
    id: 'ecm-1-plugs', kind: 'measure', label: 'Plug load reduction', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 1 - Plugs', measureNumber: 1,
    description: 'Open lab receptacle load reduced from 8 to 4 W/sf.',
  },
  {
    id: 'ecm-2-ach', kind: 'measure', label: 'Air change rate reduction', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 2 - ACH', measureNumber: 2,
    description: 'Lab peak air change rate reduced from 6 to 4 ACH; vivarium reduced to 8 ACH.',
  },
  {
    id: 'ecm-3-writeup', kind: 'measure', label: 'Separate write-up space', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 3 - WriteUp', measureNumber: 3,
    description: 'Write-up space moved off the lab air handler onto the general one.',
  },
  {
    id: 'ecm-4-glazing', kind: 'measure', label: 'Glazing reduced', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 4 - Windows', measureNumber: 4,
    description: 'Office window-to-wall ratio reduced from 60% to under 40%.',
    note: 'The workbook Read Me states this measure the other way round. The 2019 presentation sets the baseline at 60% (slide 21) and names the measure "Glazing Reduced to <40%" (slide 29); the presentation governs.',
  },
  {
    id: 'ecm-5-cascade', kind: 'measure', label: 'Cascade air system', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 5 - Cascade', measureNumber: 5,
    description: 'Office return air cascaded to serve the labs.',
    note: SUPERSEDED_NOTE,
  },
  {
    id: 'ecm-6-shading', kind: 'measure', label: 'External shading', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'ECM 6 - Shade', measureNumber: 6,
    description: 'External shading added to the office facade.',
    note: 'The sheet title duplicates ECM 4’s. Slide 29 of the 2019 presentation names this measure External Shading. ' + SUPERSEDED_NOTE,
  },
  {
    id: 'recm-1-no-turndown', kind: 'reverse-measure', label: 'Night turndown removed', locationId: 'boston-5a',
    workbook: MEASURE_WORKBOOK, sheet: 'No Night Turndown',
    description: 'Unoccupied setback removed — labs held at 6 ACH overnight instead of 2.',
    note: 'A reverse measure. It raises energy use, and is included to show what the baseline control is worth.',
  },
];

/**
 * Which plant item pays for each air system's fans. This is the mapping the
 * workbook performs through named ranges, and rederiving an allocation from it
 * reproduces every clean sheet exactly — which is what makes it safe to use as
 * a repair.
 */
export const FAN_PLANT = {
  lab: 'labFans',
  general: 'generalFans',
  vivarium: 'vivariumFans',
  'special-lab': 'specialLabFans',
  auditorium: 'auditoriumFans',
};

/** Building-wide plant totals, MBtu/yr, as labelled in column B of each case sheet. */
export const PLANT_ITEMS = [
  { id: 'chillers', label: 'Chillers + Heat Rejection', service: 'cooling', fuel: 'electricity' },
  { id: 'chwPumps', label: 'CHW Pumps', service: 'cooling', fuel: 'electricity' },
  { id: 'hhwPumps', label: 'HHW Pumps', service: 'heating', fuel: 'electricity' },
  { id: 'labFans', label: 'Lab/High Energy Fans', service: 'air', fuel: 'electricity' },
  { id: 'hrcHeating', label: 'HRC Heating', service: 'heating', fuel: 'electricity' },
  { id: 'generalFans', label: 'General/Low Energy Fans', service: 'air', fuel: 'electricity' },
  { id: 'vivariumFans', label: 'Vivarium Elec', service: 'air', fuel: 'electricity' },
  { id: 'specialLabFans', label: 'Special Lab Elec', service: 'air', fuel: 'electricity' },
  { id: 'auditoriumFans', label: 'Auditorium Elec', service: 'air', fuel: 'electricity' },
  { id: 'dhwBoilers', label: 'DHW Boilers', service: 'dhw', fuel: 'gas' },
  { id: 'hhwBoilers', label: 'HHW Boilers', service: 'heating', fuel: 'gas' },
];

/**
 * Per-zone columns, by the header text they sit under. Columns are located by
 * label rather than position because the eight measure sheets do not agree with
 * each other: "Fan Elec" is "Fan Energy" on five of them, the Baseline sheet
 * calls gas "Total Fossil Fuel" rather than "Total Nat Gas", and the Baseline
 * sheet also orders its last few columns differently. Aliases are the synonyms
 * actually observed in the 2019 workbooks.
 */
export const ZONE_COLUMNS = [
  { key: 'area', header: 'Area', unit: 'sf' },
  { key: 'roomElectricity', header: 'Room Elec', unit: 'MBtu' },
  { key: 'airFlow', header: 'Air Flow', unit: 'cfm-hours' },
  { key: 'fanShare', header: 'Fan %', unit: 'fraction' },
  { key: 'fanElectricity', header: 'Fan Elec', aliases: ['Fan Energy'], unit: 'MBtu' },
  { key: 'reheatFlow', header: 'Reheat HHW Flow', unit: 'k-cuft' },
  { key: 'mainHeatCoilFlow', header: 'Main Heat Coil Flow', unit: 'k-cuft' },
  { key: 'heatingShare', header: 'Heating %', unit: 'fraction' },
  { key: 'chwFlow', header: 'CHW Flow', unit: 'k-cuft' },
  { key: 'mainCoolCoilFlow', header: 'Main Cool Coil Flow', unit: 'k-cuft' },
  { key: 'coolingShare', header: 'Cooling %', unit: 'fraction' },
  { key: 'dhwDemand', header: 'DHW Demand', unit: 'MBtu' },
  { key: 'dhwShare', header: 'DHW %', unit: 'fraction' },
  { key: 'heatingElectricity', header: 'HHW Electric', unit: 'MBtu' },
  { key: 'heatingGas', header: 'HHW Boiler', unit: 'MBtu' },
  { key: 'chwPumpElectricity', header: 'CHW Pump', unit: 'MBtu' },
  { key: 'chillerElectricity', header: 'Chiller', unit: 'MBtu' },
  { key: 'totalElectricity', header: 'Total Elec', unit: 'MBtu' },
  { key: 'totalGas', header: 'Total Nat Gas', aliases: ['Total Fossil Fuel'], unit: 'MBtu' },
  { key: 'eui', header: 'EUI', unit: 'kBtu/sf/yr' },
];

/**
 * The five end uses the tool reports, and the per-zone column each is carried in.
 * Carbon and cost are deliberately NOT stored — they are electricity and gas
 * multiplied by a rate, and storing them would freeze 2017 rates into the data.
 */
// Ids are kebab-case because they are public identifiers — chart series keys,
// legend anchors, share-link fragments. `column` points at a camelCase key on a
// zone record, which is an internal property name and stays as one.
export const END_USES = [
  { id: 'plug', label: 'Plug & process', column: 'roomElectricity', fuel: 'electricity', service: 'process' },
  { id: 'fans', label: 'Fans', column: 'fanElectricity', fuel: 'electricity', service: 'air' },
  { id: 'chillers', label: 'Chillers', column: 'chillerElectricity', fuel: 'electricity', service: 'cooling' },
  { id: 'chw-pumps', label: 'CHW pumps', column: 'chwPumpElectricity', fuel: 'electricity', service: 'cooling' },
  { id: 'heating-electric', label: 'Heat recovery & HHW pumps', column: 'heatingElectricity', fuel: 'electricity', service: 'heating' },
  { id: 'boilers', label: 'Boilers', column: 'heatingGas', fuel: 'gas', service: 'heating' },
];
